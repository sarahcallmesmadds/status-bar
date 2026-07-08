# Decisions

## 2026-07-08 - Claude statusline plus Codex companion indicator

- Keep `statusline.js` focused on Claude Code because Claude exposes a custom statusline command with cost and context payloads.
- Add `core-mcp-health.js` as a separate helper because Codex cannot put custom script output in its bottom footer. Codex can use the helper as a prompt-start banner instead.
- Treat the core-tool count as a cache-backed last check, not a live auth probe. Local statusline/hook scripts cannot call Codex connector tools directly.
- Count Email as connected when Superhuman Mail is authenticated, even if direct Gmail reauth is stale. The practical question is whether Sarah can use email from the agent.
