# claude-statusline

A tiny, dependency-free status line for [Claude Code](https://claude.com/claude-code).

It shows, in one line at the bottom of your terminal:

```
Claude 4.8 │ my-project ⎇ owner │ $0.42 ████░░░░░░ 41%
```

| Segment | What it tells you |
|---|---|
| `Claude 4.8` | The model the current session is using |
| `my-project` | The folder you're working in (so you know where a change lands) |
| `⎇ owner` | The GitHub owner/org of the current repo, read from its git remote. Handy when you push under more than one account. Omitted outside a git repo. |
| `$0.42` | Running session cost in USD (when Claude Code reports it) |
| `████░░ 41%` | Context window used, colored green → yellow → orange → red as it fills |

Every segment is optional and degrades gracefully. If Claude Code doesn't send cost or context data, that piece is simply left out — the line never errors.

## Install

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

## How the account segment works

It walks up from your current directory to find the repo's `.git/config`, reads the first remote `url`, and pulls the owner out of it. It handles both HTTPS and SSH remotes, including custom SSH host aliases:

```
https://github.com/OWNER/repo.git   → OWNER
git@github.com:OWNER/repo.git        → OWNER
git@my-ssh-alias:OWNER/repo.git      → OWNER
```

It reads the file directly — no `git` or `gh` subprocess — so it adds no latency to each render.

## Customizing

The whole thing is ~120 readable lines in `statusline.js`. To change colors, thresholds, or which segments show, edit that file directly. Common tweaks:

- **Reorder / drop segments** — edit the final `process.stdout.write(...)` line.
- **Context bar colors** — adjust the thresholds in the context block.
- **Cost precision** — change `.toFixed(2)`.

## License

MIT. Add a `LICENSE` file with your name when you publish.
