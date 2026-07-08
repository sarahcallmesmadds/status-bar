# status-bar

A tiny, dependency-free status line for Claude Code, plus a Codex-friendly companion indicator for Sarah's core tool auth status.

In Claude Code it shows, in one line at the bottom of your terminal:

```
Claude 4.8 │ my-project ⎇ owner │ $0.42 · 30d $81.20 est ████░░░░░░ 41% │ Core tools 5/5
```

| Segment | What it tells you |
|---|---|
| `Claude 4.8` | The model the current session is using |
| `my-project` | The folder you're working in (so you know where a change lands) |
| `⎇ owner` | The GitHub owner/org of the current repo, read from its git remote. Handy when you push under more than one account. Omitted outside a git repo. |
| `$0.42` | Running session cost in USD (when Claude Code reports it) |
| `30d $81.20 est` | Local rolling 30-day spend estimate from Claude Code sessions that rendered this statusline |
| `████░░ 41%` | Context window used, colored green → yellow → orange → red as it fills |
| `Core tools 5/5` | Last-known auth count for Email, Calendar, Slack, Granola, and Notion |

Every segment is optional and degrades gracefully. If Claude Code doesn't send cost or context data, that piece is simply left out — the line never errors.

## Install for Claude Code

1. Copy `statusline.js` anywhere on your machine.
2. Point Claude Code at it in your `settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"/absolute/path/to/statusline.js\""
  }
}
```

3. Start (or restart) Claude Code. The line renders on your next turn.

Requires Node.js (already present if you run Claude Code). No npm install, no dependencies — it's a single file.

## Rolling spend estimate

Claude Code sends the statusline the current session cost. It does not send the full account billing total, so this repo tracks a local estimate by saving the latest cost per session and summing sessions seen in the last 30 days.

Cache path:

```text
~/.cache/status-bar/claude-rolling-spend.json
```

For testing, override the cache location with `STATUS_BAR_ROLLING_SPEND_CACHE_PATH`.

Optional monthly/30-day cap:

```bash
export CLAUDE_30D_SPEND_LIMIT_USD=200
```

With a cap set, the segment becomes:

```text
30d $81.20/$200 41% est
```

This is intentionally labeled `est` because it will miss Claude usage from other machines, other statusline scripts, or sessions before this tracker was installed.

## Codex setup

Codex does not currently allow arbitrary custom items inside its bottom footer. Use Codex's built-in footer for usage:

```toml
[tui]
status_line = [
    "model-with-reasoning",
    "context-used",
    "five-hour-limit",
    "weekly-limit",
    "used-tokens",
    "project-name",
    "git-branch",
]
status_line_use_colors = true
```

For the core-tool count, use `core-mcp-health.js` as a prompt-start hook:

```json
{
  "type": "command",
  "command": "node \"/absolute/path/to/core-mcp-health.js\" banner"
}
```

That renders a banner like:

```text
Core tools last check: 5/5 auth'd · checked 10:07 AM ET
```

The helper reads `~/.cache/ai-core-mcp-health.json`. It is a cache, not a live auth probe, because local statusline/hook scripts cannot call Codex connector tools directly.

## How the account segment works

It walks up from your current directory to find the repo's `.git/config`, reads the first remote `url`, and pulls the owner out of it. It handles both HTTPS and SSH remotes, including custom SSH host aliases:

```
https://github.com/OWNER/repo.git   → OWNER
git@github.com:OWNER/repo.git        → OWNER
git@my-ssh-alias:OWNER/repo.git      → OWNER
```

It reads the file directly — no `git` or `gh` subprocess — so it adds no latency to each render.

## Customizing

The whole thing is readable JavaScript. To change colors, thresholds, or which segments show, edit `statusline.js` directly. Common tweaks:

- **Reorder / drop segments** — edit `composeStatusline(...)`.
- **Context bar colors** — adjust the thresholds in the context block.
- **Cost precision** — change `.toFixed(2)`.
- **Rolling spend cap** — set `CLAUDE_30D_SPEND_LIMIT_USD` or `CLAUDE_MONTHLY_SPEND_LIMIT_USD`.
- **Core tools** — edit `CORE_TOOLS` and `LABELS` in `core-mcp-health.js`.

## License

MIT.
