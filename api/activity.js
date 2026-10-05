const config = require("./commits-config.json");
const { matchesProject, isMerge, normalizeAuthors } = require("./commit-utils");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function toDayKey(iso) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function dayDiff(a, b) {
  const da = new Date(a + "T00:00:00+07:00").getTime();
  const db = new Date(b + "T00:00:00+07:00").getTime();
  return Math.round((db - da) / 86400000);
}

function collapseDays(dayCounts) {
  const sorted = Object.keys(dayCounts).sort();
  const segments = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && dayDiff(sorted[j], sorted[j + 1]) === 1) j += 1;
    let commits = 0;
    for (let k = i; k <= j; k += 1) commits += dayCounts[sorted[k]] || 0;
    const start = sorted[i];
    const end = sorted[j];
    segments.push({
      start,
      end,
      milestone: start === end,
      days: j - i + 1,
      commits,
    });
    i = j + 1;
  }
  return segments;
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

async function fetchRepoCommits({ owner, repo, branch, authors, token, maxPages = 15 }) {
  const branchCandidates = [branch, "dev", "main", "master"].filter((b, i, arr) => b && arr.indexOf(b) === i);
  const authorQueries = authors.length ? authors : [null];
  let last = { ok: false, status: 502, data: { message: "Failed to fetch commits" } };

  for (const candidate of branchCandidates) {
    const bySha = new Map();
    let fatal = null;

    for (const authorLogin of authorQueries) {
      for (let page = 1; page <= maxPages; page += 1) {
        const params = new URLSearchParams({
          sha: candidate,
          per_page: "100",
          page: String(page),
        });
        if (authorLogin) params.set("author", authorLogin);
        const url = `https://api.github.com/repos/${owner}/${repo}/commits?${params}`;
        last = await githubGet(url, token);
        if (!last.ok) {
          if (last.status === 404 || last.status === 422) {
            fatal = "branch";
            break;
          }
          return { ok: false, status: last.status, message: last.data?.message || "GitHub API error", commits: [] };
        }
        const batch = Array.isArray(last.data) ? last.data : [];
        for (const item of batch) {
          if (item?.sha) bySha.set(item.sha, item);
        }
        if (batch.length < 100) break;
      }
      if (fatal === "branch") break;
    }

    if (fatal === "branch") continue;
    return { ok: true, branch: candidate, commits: [...bySha.values()] };
  }

  return {
    ok: false,
    status: last.status || 404,
    message: last.data?.message || "Not Found",
    commits: [],
  };
}

function buildDayCounts(rawCommits, prefixes, scopes) {
  const dayCounts = {};
  for (const item of rawCommits || []) {
    const message = item.commit?.message || "";
    if (isMerge(message)) continue;
    if (!matchesProject(message, prefixes, scopes)) continue;
    const iso = item.commit?.author?.date || item.commit?.committer?.date;
    if (!iso) continue;
    const day = toDayKey(iso);
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }
  return dayCounts;
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = String(process.env.GITHUB_TOKEN || "").trim().replace(/^["']|["']$/g, "");
  if (!token) {
    return res.status(500).json({ error: "GITHUB_TOKEN is not configured on the server" });
  }

  const companyFilter = String(req.query.company || "all").trim().toLowerCase();
  const entries = Object.entries(config).filter(([, cfg]) => {
    if (!companyFilter || companyFilter === "all") return true;
    return String(cfg.company || "others").toLowerCase() === companyFilter;
  });

  // Group by owner/repo/branch to minimize GitHub calls
  const groups = new Map();
  for (const [key, cfg] of entries) {
    const branch = cfg.branch || "dev";
    const gkey = `${cfg.owner}/${cfg.repo}@${branch}`;
    if (!groups.has(gkey)) {
      groups.set(gkey, {
        owner: cfg.owner,
        repo: cfg.repo,
        branch,
        authors: new Set(),
        projects: [],
      });
    }
    const g = groups.get(gkey);
    normalizeAuthors(cfg).forEach((a) => g.authors.add(a));
    g.projects.push({ key, cfg });
  }

  const cache = new Map();
  const projects = [];
  const errors = [];

  for (const [gkey, group] of groups) {
    let fetched = cache.get(gkey);
    if (!fetched) {
      fetched = await fetchRepoCommits({
        owner: group.owner,
        repo: group.repo,
        branch: group.branch,
        authors: [...group.authors],
        token,
        maxPages: 15,
      });
      cache.set(gkey, fetched);
    }

    if (!fetched.ok) {
      errors.push({
        repo: `${group.owner}/${group.repo}`,
        status: fetched.status,
        message: fetched.message,
      });
      for (const { key, cfg } of group.projects) {
        projects.push({
          key,
          title: cfg.title || key,
          company: cfg.company || "others",
          segments: [],
          error: fetched.message || "Failed to fetch",
        });
      }
      continue;
    }

    for (const { key, cfg } of group.projects) {
      const dayCounts = buildDayCounts(fetched.commits, cfg.prefixes || [], cfg.scopes || []);
      projects.push({
        key,
        title: cfg.title || key,
        company: cfg.company || "others",
        segments: collapseDays(dayCounts),
        totalDays: Object.keys(dayCounts).length,
        totalCommits: Object.values(dayCounts).reduce((a, b) => a + b, 0),
      });
    }
  }

  // Keep stable order: PAS → CBI → PNM → Others, then title
  const companyOrder = { pas: 0, cbi: 1, pnm: 2, others: 3 };
  projects.sort((a, b) => {
    const ca = companyOrder[a.company] ?? 9;
    const cb = companyOrder[b.company] ?? 9;
    if (ca !== cb) return ca - cb;
    return String(a.title).localeCompare(String(b.title));
  });

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json({
    company: companyFilter || "all",
    count: projects.length,
    projects,
    errors: errors.length ? errors : undefined,
  });
};
