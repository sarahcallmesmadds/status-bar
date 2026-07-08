# Decisions

## 2026-07-08 - Claude statusline plus Codex companion indicator

- Keep `statusline.js` focused on Claude Code because Claude exposes a custom statusline command with cost and context payloads.
- Add `core-mcp-health.js` as a separate helper because Codex cannot put custom script output in its bottom footer. Codex can use the helper as a prompt-start banner instead.
- Treat the core-tool count as a cache-backed last check, not a live auth probe. Local statusline/hook scripts cannot call Codex connector tools directly.
- Count Email as connected when Superhuman Mail is authenticated, even if direct Gmail reauth is stale. The practical question is whether Sarah can use email from the agent.

## 2026-07-08 - Rolling Claude spend estimate

- Add a local rolling 30-day spend estimate to the Claude Code statusline because Claude Code exposes current session cost, but not the account's full monthly billing total.
- Store latest cost per session in `~/.cache/status-bar/claude-rolling-spend.json` and sum sessions whose last statusline render was within the last 30 days.
- Label the display with `est` because it is not billing-authoritative and will miss usage from other machines, other statusline scripts, or sessions before the tracker was installed.
- Support `CLAUDE_30D_SPEND_LIMIT_USD` and `CLAUDE_MONTHLY_SPEND_LIMIT_USD` so the bar can show usage against Sarah's own cap when configured.
