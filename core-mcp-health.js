#!/usr/bin/env node
// Shared display helper for Sarah's core app connector health.
// It reads a last-known-good cache; it does not probe live services on render.

const fs = require('fs');
const os = require('os');
const path = require('path');

const CACHE_PATH = path.join(os.homedir(), '.cache', 'ai-core-mcp-health.json');
const CORE_TOOLS = ['email', 'calendar', 'slack', 'granola', 'notion'];
const LABELS = {
  email: 'Email',
  calendar: 'Calendar',
  slack: 'Slack',
  granola: 'Granola',
  notion: 'Notion',
};

function readCache(cachePath = CACHE_PATH) {
  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function color(text, code, useColor) {
  return useColor ? `\x1b[${code}m${text}\x1b[0m` : text;
}

function formatEtTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch (e) {
    return '';
  }
}

function normalizeStatus(cache, runtime = 'codex') {
  const target = cache?.targets?.[runtime] || cache?.targets?.core;
  if (!target) return null;

  const tools = target.tools || {};
  const rows = CORE_TOOLS.map((key) => {
    const entry = tools[key] || {};
    return {
      key,
      label: entry.label || LABELS[key] || key,
      status: entry.status || 'unknown',
      reason: entry.reason || '',
    };
  });

  const connected = rows.filter((row) => row.status === 'connected');
  const down = rows.filter((row) => row.status === 'down');
  const unknown = rows.filter((row) => row.status === 'unknown');

  return {
    runtime,
    source: target.source || cache.source || '',
    updatedAt: target.updated_at || cache.updated_at || '',
    total: rows.length,
    connected,
    down,
    unknown,
    rows,
  };
}

function formatStatus({ runtime = 'codex', mode = 'banner', useColor = true } = {}) {
  const status = normalizeStatus(readCache(), runtime);
  if (!status) {
    const msg = 'Core tools last check: no cache yet';
    return mode === 'statusline' ? '' : color(msg, 33, useColor);
  }

  const count = `${status.connected.length}/${status.total}`;
  const downNames = status.down.map((row) => row.label);
  const unknownNames = status.unknown.map((row) => row.label);
  const hasDown = downNames.length > 0;
  const hasUnknown = unknownNames.length > 0;
  const code = hasDown ? 31 : hasUnknown ? 33 : 32;

  if (mode === 'statusline') {
    const problemNames = downNames.length > 0 ? downNames : unknownNames;
    const suffix = problemNames.length > 0 ? ` (${problemNames.join(', ')} ${hasDown ? 'down' : 'unknown'})` : '';
    return ` │ ${color(`Core tools ${count}${suffix}`, code, useColor)}`;
  }

  const checked = formatEtTime(status.updatedAt);
  const parts = [`Core tools last check: ${count} auth'd`];
  if (downNames.length > 0) parts.push(`down: ${downNames.join(', ')}`);
  if (unknownNames.length > 0) parts.push(`unknown: ${unknownNames.join(', ')}`);
  if (checked) parts.push(`checked ${checked} ET`);
  return color(parts.join(' · '), code, useColor);
}

function formatStatuslineSegment(opts = {}) {
  return formatStatus({ ...opts, mode: 'statusline' });
}

function main() {
  const mode = process.argv[2] || 'banner';
  const runtime = process.argv[3] || 'codex';
  const useColor = !process.env.NO_COLOR;
  const line = formatStatus({ runtime, mode, useColor });
  if (line) process.stdout.write(`${line}\n`);
}

module.exports = {
  CACHE_PATH,
  CORE_TOOLS,
  readCache,
  normalizeStatus,
  formatStatus,
  formatStatuslineSegment,
};

if (require.main === module) main();
