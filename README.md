# Antigravity Skills (`agy-skills`)

> 🚀 Diagnose, bridge, and manage skill discovery for Google Antigravity & Gemini CLI.
> 自动诊断、跨生态桥接并适配 Google Antigravity / Gemini CLI 的技能管理工具。

[![CI](https://github.com/fxw-labs/antigravity-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/fxw-labs/antigravity-skills/actions/workflows/ci.yml)
[![GitHub Release](https://img.shields.io/github/v/release/fxw-labs/antigravity-skills)](https://github.com/fxw-labs/antigravity-skills/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/fxw-labs/antigravity-skills)](https://github.com/fxw-labs/antigravity-skills/issues)
[![Node.js Version](https://img.shields.io/node/v/antigravity-skills)](https://nodejs.org)

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

### `agy-skills bridge`
- Creates a safe symbolic link from `~/.gemini/config/skills` to `~/.agents/skills`.
- Safe against accidental directory overwrites (requires `--force` if a real directory exists).
- Fully supports POSIX symlinks (macOS/Linux) and directory junctions (Windows).

### `agy-skills install <owner/repo | url | local-path>`
- Clones or updates upstream Git repository into `~/.gemini/config/plugins/<name>`.
- Automatically scans multi-tier categories (e.g. `skills/engineering/tdd`) and creates root relative symlinks so Antigravity discovers them.
- Copies root `AGENTS.md` to `rules/AGENTS.md` while preserving root `AGENTS.md` to maintain upstream git working tree cleanliness.
- Generates compliant `plugin.json` manifest.
- Runs `agy plugin validate` automatically to confirm compliance.

### `agy-skills update [plugin]`
- Pulls latest upstream git commits for installed plugins.
- Automatically re-scans multi-tier category skills and re-flattens root symlinks.
- Re-runs `agy plugin validate` to confirm updated plugins remain fully compliant.

### `agy-skills list`
- Lists all discovered standalone global skills and installed Antigravity plugins.

---

## 🏗 Architecture & Domain Model

See our domain documentation and ADRs:
- [GLOSSARY.md](./GLOSSARY.md): Canonical domain vocabulary (*Skill*, *Customization Root*, *Skill Manifest*, *Plugin Bundle*, *Skill Bridge*, *Doctor*, *Adapter*).
- [ADR 0001: Architecture and Tech Stack](./docs/adr/0001-architecture-and-tech-stack.md)
- [ADR 0002: CLI Command Surface & Community Plugin Adaptation](./docs/adr/0002-cli-commands-and-plugin-adaptation.md)
- [ADR 0003: Code Review Remediations and Git Cleanliness](./docs/adr/0003-code-review-remediations-and-git-cleanliness.md)
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

## 📁 Repository Structure / 仓库工程结构

```text
antigravity-skills/
├── .github/
│   ├── workflows/ci.yml         # Multi-OS (Ubuntu, macOS, Windows) CI matrix
│   ├── ISSUE_TEMPLATE/          # Structured issue templates (bug, feature)
│   └── pull_request_template.md # PR verification checklist
├── docs/
│   ├── adr/                     # Architecture Decision Records (0001, 0002, 0003)
│   └── specs/                   # Formal feature specifications (0001)
├── src/
│   ├── bin/cli.ts               # CLI executable entrypoint
│   ├── adapter.ts               # Category directory flattening & rules adapter
│   ├── bridge.ts                # Cross-agent symlink bridge
│   ├── cli.ts                   # CLI router and argument parser
│   ├── doctor.ts                # Environment and manifest diagnostics
│   ├── env.ts                   # Platform-aware path resolution
│   ├── fix.ts                   # skills.json path repair & JSONC preservation
│   ├── install.ts               # Git cloning, adapting, and validating
│   ├── list.ts                  # Discovery scanner for skills and plugins
│   ├── update.ts                # Git update and re-adaptation runner
│   └── types.ts                 # Domain type definitions
├── test/                        # Vitest unit & integration test suites
├── CODE_OF_CONDUCT.md           # Contributor Covenant Code of Conduct
├── CONTRIBUTING.md              # Contributor guide and coding standards
├── GLOSSARY.md                  # Domain model vocabulary
├── LICENSE                      # MIT License
└── SECURITY.md                  # Security and vulnerability reporting policy
```

---

## 🤝 Community & Contributing

Contributions are welcome! Please check our community guidelines before submitting pull requests:
- 📖 [Contributing Guide](./CONTRIBUTING.md): Setup, coding rules (zero-runtime dependencies), commit conventions.
- 📜 [Code of Conduct](./CODE_OF_CONDUCT.md): Contributor Covenant 2.1 standard.
- 🔒 [Security Policy](./SECURITY.md): Vulnerability reporting procedures.
- 💬 [GitHub Issues](https://github.com/fxw-labs/antigravity-skills/issues): Bug reports and feature proposals.

---

## 📄 License

[MIT](./LICENSE) © Felix Wang
