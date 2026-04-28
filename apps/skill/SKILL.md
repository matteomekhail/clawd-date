---
name: clawd-match
description: View and act on your clawd.date dev matches from inside Claude Code. Invoke when the user says "show my matches", "chi mi ha matchato", "open my matches on clawd.date", or wants to like/skip a candidate. Background ingestion of Claude Code activity is handled by hooks (installed via `clawd-match init`), NOT by this skill.
---

# clawd-match

This skill is the **on-demand** surface for clawd.date inside Claude Code. It is small on purpose — the heavy lifting (collecting your activity, sending it to the backend, surfacing notifications) is done by shell hooks installed in `~/.claude/settings.json` by `clawd-match init`.

## When to use this skill

- The user asks to **see their matches** — fetch them from the clawd.date Convex backend and present a short list.
- The user asks to **open clawd.date** — provide the URL.
- The user wants to **like / pass** on a candidate by name — call the appropriate Convex mutation.

## When NOT to use this skill

- After every coding session — that's the `SessionEnd` hook's job. Never call `clawd-match ingest` from here.
- To install or configure the integration — direct the user to run `clawd-match init` in their terminal.

## How matches reach the user

- **Background ingest:** `SessionEnd` hook calls `clawd-match ingest`, which extracts languages/tools/project from the session transcript and POSTs to `https://<deployment>.convex.site/ingest`. Silent, no token cost.
- **Match nudge:** `SessionStart` hook calls `clawd-match notify`, which prints unread matches to stderr (visible in terminal, **not** loaded into Claude's context).
- **Deep dive:** the user invokes this skill to query and act on matches conversationally.

<!-- TODO: implement the skill body — concrete prompts to fetch + format matches, like/pass UX. -->
