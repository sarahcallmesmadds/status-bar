#!/usr/bin/env node
// Claude Code statusline
// Renders:  model │ folder ⎇ gh-account │ $cost  ████░░ usage%
//
// Drop this file anywhere and point Claude Code at it in settings.json:
//   "statusLine": { "type": "command", "command": "node \"/absolute/path/to/statusline.js\"" }
//
// Every segment is optional and degrades gracefully — if Claude Code doesn't
// send cost or context data, that segment is simply omitted. The account
// segment appears only when the current directory is inside a git repo; it is
// read straight from the repo's remote URL (no shelling out to git/gh).

const fs = require('fs');
const path = require('path');
const os = require('os');

// --- GitHub account reader --------------------------------------------------

/**
 * Walk up from `dir` looking for a .git/config, read the first remote URL, and
 * return the owner/org portion of it (e.g. "acme" from git@github.com:acme/app.git).
 * Returns null when there's no repo or the URL can't be parsed.
 *
 * Handles both HTTPS and SSH forms, including custom SSH host aliases:
 *   https://github.com/OWNER/repo.git
 *   git@github.com:OWNER/repo.git
 *   git@my-ssh-alias:OWNER/repo.git
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
        // Grab the "owner/repo" tail after the last ':' or '/', tolerate a .git suffix.
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

// --- main --------------------------------------------------------------------

function run() {
  let input = '';
  // If stdin never closes (rare pipe issues), exit quietly rather than hang.
  const timeout = setTimeout(() => process.exit(0), 3000);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', c => (input += c));
  process.stdin.on('end', () => {
    clearTimeout(timeout);
    try {
      const data = JSON.parse(input);
      const model = data.model?.display_name || 'Claude';
      const dir = data.workspace?.current_dir || process.cwd();
      const dirname = path.basename(dir);

      // Context usage meter (shows USED percentage). Claude Code sends
      // remaining_percentage; we render a 10-cell bar and color by pressure.
      let ctx = '';
      const remaining = data.context_window?.remaining_percentage;
      if (remaining != null) {
        const used = Math.max(0, Math.min(100, Math.round(100 - remaining)));
        const filled = Math.floor(used / 10);
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
        let color = '\x1b[32m';                 // green
        if (used >= 80) color = '\x1b[31m';      // red
        else if (used >= 65) color = '\x1b[38;5;208m'; // orange
        else if (used >= 50) color = '\x1b[33m'; // yellow
        ctx = ` ${color}${bar} ${used}%\x1b[0m`;
      }

      // Session cost (USD), when Claude Code provides it.
      let cost = '';
      const costUsd = data.cost?.total_cost_usd;
      if (costUsd != null && !isNaN(costUsd)) {
        cost = ` │ \x1b[36m$${Number(costUsd).toFixed(2)}\x1b[0m`;
      }

      // GitHub account segment, only inside a git repo.
      let account = '';
      const owner = readGitOwner(dir);
      if (owner) account = ` \x1b[2m⎇ ${owner}\x1b[0m`;

      const modelSeg = `\x1b[2m${model}\x1b[0m`;
      const dirSeg = `\x1b[2m${dirname}\x1b[0m${account}`;
      process.stdout.write(`${modelSeg} │ ${dirSeg}${cost}${ctx}`);
    } catch (e) {
      // Never break the shell prompt on a bad/empty payload.
    }
  });
}

if (require.main === module) run();

module.exports = { readGitOwner };
