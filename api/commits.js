const { loadCommitsConfig, matchesProject, isMerge, normalizeAuthors } = require("./commit-utils");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseCommitMessage(message) {
  const firstLine = (message || "").split("\n")[0].trim();
  const result = { type: "other", label: "Other", description: firstLine, module: null };

  const conventional =
    /^(Feature|Feat|Fix|Style|Refactor|Update|Chore|Docs|Perf|Test)(?:\(([^)]+)\))?\s*:\s*(.+)$/i;
  const spaced =
    /^(Feature|Feat|Fix|Style|Refactor|Update|Chore|Docs|Perf|Test)\s+([a-zA-Z0-9_\-/]+)?\s*:\s*(.+)$/i;
  const moduleFirst = /^([a-zA-Z0-9_\-/]+)\s*:\s*(.+)$/;

  let m = firstLine.match(conventional) || firstLine.match(spaced);
  if (m) {
    const rawType = m[1].toLowerCase();
    result.type = normalizeType(rawType);
    result.label = labelForType(result.type);
    result.module = m[2] ? m[2].trim() : null;
    result.description = m[3].trim();
    return result;
  }

  m = firstLine.match(moduleFirst);
  if (m && !/^(merge|revert)/i.test(m[1])) {
    result.module = m[1].trim();
    result.description = m[2].trim();
  }

  return result;
}

function normalizeType(t) {
  if (t === "feat" || t === "feature") return "feat";
  if (t === "fix") return "fix";
  if (t === "refactor") return "refactor";
  if (t === "chore" || t === "docs" || t === "style" || t === "update" || t === "perf" || t === "test") {
    return "chore";
  }
  return "other";
}

function labelForType(type) {
  return { feat: "Feature", fix: "Fix", refactor: "Refactor", chore: "Chore", other: "Other" }[type] || "Other";
}

function formatDay(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function githubGet(url, token) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token}`,
      "User-Agent": "asrofil-portfolio",
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }
  return { ok: res.ok, status: res.status, data };
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const project = String(req.query.project || "").trim();
  const limit = Math.min(parseInt(req.query.limit || "200", 10) || 200, 250);
  const config = loadCommitsConfig();
  const projectConfig = config[project];

  if (!projectConfig) {
    return res.status(404).json({
      error: "Unknown project",
      available: Object.keys(config),
    });
  }

  const token = String(process.env.GITHUB_TOKEN || "").trim().replace(/^["']|["']$/g, "");
  if (!token) {
    return res.status(500).json({
      error: "GITHUB_TOKEN is not configured on the server",
    });
  }

  const { owner, repo, branch = "dev", prefixes = [], scopes = [], title } = projectConfig;
  const authors = normalizeAuthors(projectConfig);
  // Monorepo modules sit deep in history — dig farther when filtering by prefix.
  const perPage = 100;
  const maxPages = prefixes.length || scopes.length ? 18 : Math.max(3, authors.length > 1 ? 5 : 2);

  const branchCandidates = [branch, "dev", "main", "master"].filter(
    (b, i, arr) => b && arr.indexOf(b) === i
  );

  let last = { ok: false, status: 502, data: { message: "Failed to fetch commits" } };
  let usedBranch = branch;
  let rawCommits = null;

  for (const candidate of branchCandidates) {
    const bySha = new Map();
    let pageFailed = null;

    // GitHub accepts one author per request — fetch each listed author then merge
    const authorQueries = authors.length ? authors : [null];

    for (const authorLogin of authorQueries) {
      for (let page = 1; page <= maxPages; page++) {
        const params = new URLSearchParams({
          sha: candidate,
          per_page: String(perPage),
          page: String(page),
        });
        if (authorLogin) params.set("author", authorLogin);

        const url = `https://api.github.com/repos/${owner}/${repo}/commits?${params}`;
        last = await githubGet(url, token);
        usedBranch = candidate;

        if (!last.ok) {
          pageFailed = last;
          break;
        }

        const batch = Array.isArray(last.data) ? last.data : [];
        for (const item of batch) {
          if (item && item.sha) bySha.set(item.sha, item);
        }
        if (batch.length < perPage) break;

        // Only stop early once we have enough matches AND we've scanned deep enough
        // to cover older module history (e.g. Smart Lab Dec 2025 sits ~page 8+).
        const preview = filterCommits([...bySha.values()], { prefixes, scopes, limit, authors });
        const deepEnough = page >= (prefixes.length || scopes.length ? 12 : 2);
        if (preview.length >= limit && deepEnough) break;
      }
      if (pageFailed) break;
    }

    if (pageFailed) {
      // Wrong branch / missing ref — try next candidate
      if (pageFailed.status === 404 || pageFailed.status === 422) continue;
      return res.status(pageFailed.status || 502).json({
        error: "GitHub API error",
        status: pageFailed.status,
        message:
          pageFailed.data && pageFailed.data.message
            ? pageFailed.data.message
            : "Failed to fetch commits",
        repo: `${owner}/${repo}`,
        triedBranches: branchCandidates,
      });
    }

    rawCommits = [...bySha.values()].sort((a, b) => {
      const da = new Date(a.commit?.author?.date || a.commit?.committer?.date || 0).getTime();
      const db = new Date(b.commit?.author?.date || b.commit?.committer?.date || 0).getTime();
      return db - da;
    });
    break;
  }

  if (!rawCommits) {
    return res.status(last.status || 502).json({
      error: "GitHub API error",
      status: last.status,
      message: last.data && last.data.message ? last.data.message : "Failed to fetch commits",
      repo: `${owner}/${repo}`,
      triedBranches: branchCandidates,
    });
  }

  return respond(res, rawCommits, {
    owner,
    repo,
    title,
    prefixes,
    scopes,
    limit,
    branch: usedBranch,
    authors,
  });
};

function filterCommits(rawCommits, meta) {
  const commits = [];
  for (const item of rawCommits || []) {
    const message = item.commit?.message || "";
    if (isMerge(message)) continue;
    if (!matchesProject(message, meta.prefixes, meta.scopes)) continue;

    const parsed = parseCommitMessage(message);
    const date = item.commit?.author?.date || item.commit?.committer?.date;
    const sha = item.sha || "";
    commits.push({
      sha,
      shortSha: sha.slice(0, 7),
      message: parsed.description,
      fullMessage: message.split("\n")[0],
      type: parsed.type,
      label: parsed.label,
      module: parsed.module,
      date,
      day: date ? formatDay(date) : "Unknown",
      author: item.commit?.author?.name || item.author?.login || "unknown",
      avatar:
        item.author?.avatar_url ||
        `https://github.com/${item.author?.login || (meta.authors && meta.authors[0]) || "asrofilnadib"}.png`,
      login: item.author?.login || null,
      url: item.html_url,
    });
    if (commits.length >= meta.limit) break;
  }
  return commits;
}

function respond(res, rawCommits, meta) {
  const commits = filterCommits(rawCommits, meta);

  const groups = [];
  const byDay = {};
  for (const c of commits) {
    if (!byDay[c.day]) {
      byDay[c.day] = [];
      groups.push({ day: c.day, commits: byDay[c.day] });
    }
    byDay[c.day].push(c);
  }

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  const branchPath = meta.branch ? `/tree/${encodeURIComponent(meta.branch)}` : "";
  return res.status(200).json({
    project: meta.title,
    repo: `${meta.owner}/${meta.repo}`,
    branch: meta.branch,
    htmlUrl: `https://github.com/${meta.owner}/${meta.repo}${branchPath}`,
    count: commits.length,
    groups,
  });
}
