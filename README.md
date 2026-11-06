# Antigravity Skills (`agy-skills`)

> 🚀 Diagnose, bridge, and manage skill discovery for Google Antigravity & Gemini CLI.
> 自动诊断、跨生态桥接并适配 Google Antigravity / Gemini CLI 的技能管理工具。

[![CI](https://github.com/fxw-labs/antigravity-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/fxw-labs/antigravity-skills/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/antigravity-skills.svg)](https://www.npmjs.com/package/antigravity-skills)

---

## 💡 Why This Exists / 为什么需要这个工具

When using **Google Antigravity** or **Gemini CLI** with community agent skills (e.g. from `skills.sh`, Claude Code, or repositories like `mattpocock/skills`), developers run into three common roadblocks:

1. **Path Resolution Failures (`path is not absolute`)**:
   Antigravity's `~/.gemini/config/skills.json` parser **does not expand `~`**. Entering `"path": "~/.agents/skills"` throws internal errors (`Failed to resolve absolute path: path is not absolute`) and silently drops all skills.
2. **Ecosystem Silos (`~/.agents/skills` vs `~/.gemini/config/`)**:
   Community tools (Cursor, Claude Code, Cline, `skills.sh`) store global skills in `~/.agents/skills/`. Antigravity only scans `~/.gemini/config/`, creating disconnected silos.
3. **Multi-tier Category Incompatibility (`skills 0`)**:
   Repositories like `mattpocock/skills` categorize skills into subfolders (`skills/engineering/*`, `skills/productivity/*`). Antigravity's plugin scanner only looks one level deep and ignores nested skills, reporting `skills 0` unless flattened. In addition, root `AGENTS.md` is rejected unless moved to `rules/AGENTS.md`.

**`antigravity-skills`** (`agy-skills`) automates all the diagnostics, manifest repairs, cross-agent symlinking, and repository flattening in one simple command.

---

## ⚡ Quickstart / 快速开始

No installation needed. Run directly via `npx`:

```bash
# 1. Run interactive diagnostics and auto-repair
npx agy-skills

# 2. Or run specific commands
npx agy-skills doctor      # Diagnose your environment
npx agy-skills fix         # Rewrite relative paths in skills.json into absolute paths
npx agy-skills bridge      # Bridge ~/.agents/skills to Antigravity
npx agy-skills install mattpocock/skills  # Clone, adapt, and validate community repo
npx agy-skills list        # Inspect discovered skills and plugins
```

Or install globally:

```bash
npm install -g antigravity-skills

# Both aliases work
agy-skills doctor
antigravity-skills list
```

---

## 🛠 Commands / 命令详解

### `agy-skills doctor`
Performs an automated health check on:
- `~/.gemini/config/skills.json` path validity (catches non-absolute paths).
- Symbolic bridge status between `~/.agents/skills` and `~/.gemini/config/skills`.
- Antigravity plugin compliance (unflattened category directories, misplaced rule files).

Pass `--json` for machine-readable output:
```bash
npx agy-skills doctor --json
```

### `agy-skills fix`
- Automatically creates a backup (`skills.json.bak`).
- Expands `~` and resolves all relative paths to the operating system's absolute path.
- Automatically initializes `skills.json` if missing and external skills are detected.

### `agy-skills bridge` (alias: `sync`)
- Creates a safe symbolic link from `~/.gemini/config/skills` to `~/.agents/skills`.
- Safe against accidental directory overwrites (requires `--force` if a real directory exists).
- Fully supports POSIX symlinks (macOS/Linux) and directory junctions (Windows).

### `agy-skills install <owner/repo | url | local-path>`
- Clones or updates upstream Git repository into `~/.gemini/config/plugins/<name>`.
- Automatically scans multi-tier categories (e.g. `skills/engineering/tdd`) and creates root relative symlinks so Antigravity discovers them.
- Relocates root `AGENTS.md` to `rules/AGENTS.md`.
- Generates compliant `plugin.json` manifest.
- Runs `agy plugin validate` automatically to confirm compliance.

### `agy-skills list`
- Lists all discovered standalone global skills and installed Antigravity plugins.

---

## 🏗 Architecture & Domain Model

See our domain documentation and ADRs:
- [GLOSSARY.md](./GLOSSARY.md): Canonical domain vocabulary (*Skill*, *Customization Root*, *Skill Manifest*, *Plugin Bundle*, *Skill Bridge*, *Doctor*, *Adapter*).
- [ADR 0001: Architecture and Tech Stack](./docs/adr/0001-architecture-and-tech-stack.md)
- [ADR 0002: CLI Command Surface & Community Plugin Adaptation](./docs/adr/0002-cli-commands-and-plugin-adaptation.md)
- [Spec 0001: Antigravity Skills CLI](./docs/specs/0001-antigravity-skills-cli.md)

---

## 🧪 Development & Testing

```bash
# Clone and install dependencies
git clone https://github.com/fxw-labs/antigravity-skills.git
cd antigravity-skills
npm install

# Run test suite
npm test

# Typecheck
npm run typecheck

# Build for distribution
npm run build
```

---

## 📄 License

[MIT](./LICENSE) © Felix Wang
