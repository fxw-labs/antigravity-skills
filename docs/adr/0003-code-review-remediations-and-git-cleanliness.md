# Non-Destructive Git Tracking and Spec Alignment

Following code review of initial implementation, several deviations from standards and specifications were identified: deleting tracked `AGENTS.md` files broke upstream git cleanliness, `skills.json` modifications discarded user comments, `sync` violated glossary constraints, and the `update` command was missing. We decided to enforce non-destructive upstream file retention, eliminate non-standard aliases, implement comment-preserving manifest updates, and introduce the `update` command and `NO_COLOR` terminal compliance.

## Status

Accepted

## Considered Options

- **Destructive File Cleanup**: Deleting root `AGENTS.md` to silence Antigravity warnings. Rejected because it permanently dirties upstream git repositories and breaks `git pull` during updates.
- **Copy-and-Retain Strategy (Chosen)**: Copying `AGENTS.md` into `rules/AGENTS.md` while leaving the root file completely untouched, keeping the git working tree clean for updates.
- **Full JSON AST Rewrite**: Adding heavy JSONC parser dependencies. Rejected in favor of zero-dependency, line/regex-targeted path replacement that preserves developer comments and whitespace intact.
