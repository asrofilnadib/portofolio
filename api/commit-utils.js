/**
 * Shared helpers for /api/commits and /api/activity.
 */

const fs = require("fs");
const path = require("path");

const COMMITS_CONFIG_PATH = path.join(__dirname, "commits-config.json");

function loadCommitsConfig() {
  return JSON.parse(fs.readFileSync(COMMITS_CONFIG_PATH, "utf8"));
}

function normalizeToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_\s/-]+/g, "");
}

/**
 * Match module prefixes against commit messages.
 * Treats smart-lab, smart_lab, and smartlab as equivalent.
 */
function matchesPrefixes(message, prefixes) {
  if (!prefixes || !prefixes.length) return true;
  const lower = String(message || "").toLowerCase();
  const compact = normalizeToken(message);

  return prefixes.some((prefix) => {
    const raw = String(prefix || "")
      .toLowerCase()
      .trim();
    if (!raw) return false;
    if (lower.includes(raw)) return true;
    const compactPrefix = normalizeToken(raw);
    return Boolean(compactPrefix && compact.includes(compactPrefix));
  });
}

function extractScopes(message) {
  const first = String(message || "").split("\n")[0];
  const scopes = [];
  const re = /\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(first))) {
    const raw = String(m[1] || "").trim();
    if (raw) scopes.push(raw);
  }
  return scopes;
}

function matchesScopes(message, scopes) {
  if (!scopes || !scopes.length) return false;
  const found = extractScopes(message).map((s) => normalizeToken(s));
  if (!found.length) return false;
  return scopes.some((scope) => {
    const compact = normalizeToken(scope);
    return Boolean(compact && found.includes(compact));
  });
}

function matchesProject(message, prefixes, scopes) {
  const hasPrefix = Array.isArray(prefixes) && prefixes.length > 0;
  const hasScope = Array.isArray(scopes) && scopes.length > 0;
  if (!hasPrefix && !hasScope) return true;
  const prefixOk = hasPrefix && matchesPrefixes(message, prefixes);
  const scopeOk = hasScope && matchesScopes(message, scopes);
  return Boolean(prefixOk || scopeOk);
}

function isMerge(message) {
  const m = String(message || "").toLowerCase();
  return m.includes("merge branch") || m.includes("merge pull request") || m.startsWith("merge remote");
}

function normalizeAuthors(projectConfig) {
  if (Array.isArray(projectConfig.authors) && projectConfig.authors.length) {
    return projectConfig.authors.map((a) => String(a).trim()).filter(Boolean);
  }
  if (projectConfig.author === null || projectConfig.author === "") return [];
  if (projectConfig.author) return [String(projectConfig.author).trim()];
  return ["asrofilnadib"];
}

module.exports = {
  loadCommitsConfig,
  normalizeToken,
  matchesPrefixes,
  extractScopes,
  matchesScopes,
  matchesProject,
  isMerge,
  normalizeAuthors,
};
