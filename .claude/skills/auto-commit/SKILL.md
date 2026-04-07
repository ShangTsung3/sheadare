---
name: auto-commit
description: Automatically commit and push to GitHub after every deploy to server. Triggers when deploy commands are run.
---

## Auto Commit After Deploy

Every time code is deployed to the server (161.35.213.172), automatically:

1. Stage all changed source files (src/, server/, public/, index.html)
2. Create a commit with a descriptive message
3. Push to origin master

### Rules:
- Always commit AFTER successful deploy (not before)
- Never commit node_modules, data/, temp-*, *.backup.*, *.pre-*
- Commit message should describe what changed
- Always include `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`
- If no files changed, skip commit

### Files to always stage:
- src/App-redesign.tsx
- src/**/*.ts, src/**/*.tsx
- server/**/*.ts
- public/**/*
- index.html
- src/index.css
