#!/usr/bin/env node
// Claude Code statusline
// Renders: model | folder/account | cost | context used | optional core-tool count
//
// Drop this file anywhere and point Claude Code at it in settings.json:
//   "statusLine": { "type": "command", "command": "node \"/absolute/path/to/statusline.js\"" }
//
// Every segment is optional and degrades gracefully. If Claude Code does not
// send cost/context, or if the core-tool cache is missing, that piece is omitted.

const fs = require('fs');
const path = require('path');
const os = require('os');

// --- GitHub account reader --------------------------------------------------

/**
 * Walk up from `dir` looking for a .git/config, read the first remote URL, and
 * return the owner/org portion of it.
 *
 * Handles HTTPS and SSH remotes, including custom SSH host aliases:
 *   https://github.com/OWNER/repo.git
 *   git@github.com:OWNER/repo.git
 *   git@github-personal:OWNER/repo.git
 */
function readGitOwner(dir) {
  let current = dir;
  const root = path.parse(current).root;
  for (let i = 0; i < 20; i++) {
    const candidate = path.join(current, '.git', 'config');
    if (fs.existsSync(candidate)) {
      try {
        const cfg = fs.readFileSync(candidate, 'utf8');
        const m = cfg.match(/^\s*url\s*=\s*(.+)$/m);
        const url = m ? m[1].trim() : '';
        const parts = url.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?\/?$/);
        return parts ? parts[1] : null;
      } catch (e) {
        return null;
      }
    }
    const parent = path.dirname(current);
    if (parent === current || current === root) break;
    current = parent;
  }
  return null;
}

// --- Core tool health -------------------------------------------------------

function readCoreToolsStatuslineSegment() {
  const candidates = [
    path.join(__dirname, 'core-mcp-health.js'),
    path.join(os.homedir(), '.codex', 'hooks', 'core-mcp-health.js'),
  ];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const health = require(candidate);
      if (typeof health.formatStatuslineSegment === 'function') {
        return health.formatStatuslineSegment({ runtime: 'codex' });
      }
    } catch (e) {
      // Keep prompt rendering reliable even if the health helper is absent/broken.
    }
  }
  return '';
}

// --- Display helpers --------------------------------------------------------

function renderContextMeter(contextWindow) {
  const remaining = contextWindow?.remaining_percentage;
  if (remaining == null) return '';

  const totalCtx = contextWindow?.total_tokens || 1_000_000;
  const autoCompactWindow = parseInt(process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW || '0', 10);
  const bufferPct = autoCompactWindow > 0
    ? Math.min(100, (autoCompactWindow / totalCtx) * 100)
    : 16.5;

  const usableRemaining = Math.max(0, ((remaining - bufferPct) / (100 - bufferPct)) * 100);
  const used = Math.max(0, Math.min(100, Math.round(100 - usableRemaining)));
  const filled = Math.floor(used / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  if (used >= 80) return ` \x1b[5;31m💀 ${bar} ${used}%\x1b[0m`;
  if (used >= 65) return ` \x1b[38;5;208m${bar} ${used}%\x1b[0m`;
  if (used >= 50) return ` \x1b[33m${bar} ${used}%\x1b[0m`;
  return ` \x1b[32m${bar} ${used}%\x1b[0m`;
}

function renderCost(cost) {
  const costUsd = cost?.total_cost_usd;
  if (costUsd == null || isNaN(costUsd)) return '';
  return ` │ \x1b[36m$${Number(costUsd).toFixed(2)}\x1b[0m`;
}

function composeStatusline({
  model,
  dirname,
  owner = '',
  cost = '',
  context = '',
  coreTools = '',
} = {}) {
  const modelSeg = `\x1b[2m${model || 'Claude'}\x1b[0m`;
  const ownerSeg = owner ? ` \x1b[2m⎇ ${owner}\x1b[0m` : '';
  const dirSeg = `\x1b[2m${dirname || ''}\x1b[0m${ownerSeg}`;
  return `${modelSeg} │ ${dirSeg}${cost}${context}${coreTools}`;
}

// --- main ------------------------------------------------------------------

function renderStatusline(data) {
  const dir = data.workspace?.current_dir || process.cwd();
  return composeStatusline({
    model: data.model?.display_name || 'Claude',
    dirname: path.basename(dir),
    owner: readGitOwner(dir),
    cost: renderCost(data.cost),
    context: renderContextMeter(data.context_window),
    coreTools: readCoreToolsStatuslineSegment(),
  });
}

function run() {
  let input = '';
  const timeout = setTimeout(() => process.exit(0), 3000);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    input += chunk;
  });
  process.stdin.on('end', () => {
    clearTimeout(timeout);
    try {
      process.stdout.write(renderStatusline(JSON.parse(input)));
    } catch (e) {
      // Never break the shell prompt on a bad/empty payload.
    }
  });
}

if (require.main === module) run();

module.exports = {
  readGitOwner,
  readCoreToolsStatuslineSegment,
  renderContextMeter,
  renderCost,
  composeStatusline,
  renderStatusline,
};
