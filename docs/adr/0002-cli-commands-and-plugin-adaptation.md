# CLI Command Surface and Community Plugin Adaptation Strategy

Community AI agent skills are frequently organized into nested thematic folders (e.g., `skills/engineering/`, `skills/productivity/`) that Antigravity's one-level plugin scanner misses, while `skills.json` fails silently when paths contain `~`. We decided to structure the CLI around `doctor`, `fix`, `bridge`, and `install` commands, with `install` automatically restructuring categorized repos into compliant Antigravity plugin bundles with symlinked flat skill directories and compliant `rules/AGENTS.md`.

## Status

Accepted

## Considered Options

- **Deep directory recursive copying**: Directly modifying upstream files and copying everything flat into `~/.gemini/config/skills/`. Rejected because it loses git tracking, creates stale duplicate files, and prevents easy upstream updates.
- **Symlinked Plugin Adapter (Chosen)**: Installing to `~/.gemini/config/plugins/<name>` while preserving upstream git structure and generating symlinks from root `skills/<item>` to nested category paths. Passes `agy plugin validate` cleanly while preserving git updates.
