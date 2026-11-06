---
title: "Spec 0001: Antigravity Skills CLI (agy-skills)"
status: "ready-for-agent"
labels: ["ready-for-agent"]
---

# Spec 0001: Antigravity Skills CLI (`agy-skills`)

## Problem Statement

Developers using Google Antigravity (and Gemini CLI) who attempt to customize and expand their AI coding workflows face silent failures and compatibility barriers:

1. **Path Resolution Failures**: The global Skill Manifest (`~/.gemini/config/skills.json`) strictly requires absolute filesystem paths. When developers specify paths containing standard shell shorthands like `~/.agents/skills`, Antigravity's internal parser fails with an unhelpful error (`path is not absolute`), silently refusing to discover any declared skills.
2. **Cross-Agent Ecosystem Silos**: Popular AI developer tools (such as Claude Code, Cursor, Cline, and `skills.sh`) store global skills in `~/.agents/skills/`. Antigravity only inspects its own Customization Root (`~/.gemini/config/`), leaving developers with duplicated or inaccessible skills across tools.
3. **Multi-tier Community Structure Incompatibility**: High-quality community skill repositories (such as `mattpocock/skills`) group skills inside thematic subcategories (e.g. `skills/engineering/`, `skills/productivity/`). Antigravity's Plugin Bundle discovery mechanism only scans a single directory level beneath `skills/`, resulting in `skills 0` being detected unless manually flattened or symlinked, and rejects root-level `AGENTS.md` files unless moved to `rules/AGENTS.md`.

Currently, developers must manually read raw logs, decipher Go runtime errors, write shell symlinks, and format JSON manifests by hand to get community skills working in Antigravity.

## Solution

A zero-install TypeScript CLI utility (`antigravity-skills`, executable as `npx agy-skills`) that automates diagnostics, fixes, ecosystem bridging, and community plugin adaptation:

- **Doctor Routine**: Inspects the developer's Customization Root and Skill Manifest, identifying relative path errors, missing directories, permission locks, and orphaned Plugin Bundles.
- **Automated Fix Routine**: Automatically rewrites relative paths in `skills.json` into valid absolute filesystem paths and provisions missing discovery directories.
- **Skill Bridge**: Creates a persistent, safe filesystem bridge between `~/.agents/skills/` and Antigravity's global customization space, enabling instant skill sharing across AI tools without file duplication.
- **Community Adapter**: Clones or updates upstream git skill repositories (or adapts local plugin directories) into Antigravity Plugin Bundles, automatically generates flat symlinks for nested category directories, positions `rules/AGENTS.md` without deleting upstream git-tracked files, crafts compliant `plugin.json` manifests (ingesting metadata from `.claude-plugin/plugin.json` when available), and invokes native validation (`agy plugin validate`).
- **Updater Routine**: `agy-skills update [plugin-name]` pulls the latest git commits for installed plugins and automatically re-executes category flattening and rule positioning.

## User Stories

1. As an Antigravity developer, I want to run `npx agy-skills` without arguments, so that my environment is automatically diagnosed and repaired interactively without reading manuals.
2. As an Antigravity developer, I want `agy-skills doctor` to report whether `~/.gemini/config/skills.json` contains invalid paths containing `~`, so that I know why my skills are missing.
3. As an Antigravity developer, I want `agy-skills fix` to resolve `~` to my actual system home directory path in `skills.json`, so that Antigravity can load my external skills immediately.
4. As an Antigravity developer, I want `agy-skills fix` to preserve any existing comments or valid custom configuration in `skills.json`, so that my custom entries are not lost.
5. As an Antigravity developer who uses multiple AI tools, I want `agy-skills bridge` to link `~/.agents/skills` to `~/.gemini/config/skills`, so that skills installed by `npx skills` or Claude Code are immediately available in Antigravity.
6. As an Antigravity developer, I want `agy-skills bridge` to warn me if a real directory already exists where a symlink is needed, so that existing files are never overwritten without explicit permission.
7. As an Antigravity developer, I want `agy-skills install <github-url>` to install a multi-tier repository like `mattpocock/skills`, so that nested skills in `engineering/` and `productivity/` are discovered without manual symlinking.
8. As an Antigravity developer, I want `agy-skills install` to automatically move or copy root `AGENTS.md` files to `rules/AGENTS.md` inside the Plugin Bundle, so that `agy plugin validate` passes with zero warnings.
9. As an Antigravity developer, I want `agy-skills install` to generate a valid `plugin.json` manifest with name, version, and description, so that the plugin is recognized by Antigravity's plugin manager.
10. As an Antigravity developer, I want `agy-skills install` to invoke `agy plugin validate` after adaptation, so that I receive immediate confirmation that the plugin is compliant.
11. As an Antigravity developer, I want `agy-skills update <plugin-name>` to pull the latest git changes for an installed plugin and re-run directory adaptation, so that upstream updates do not break my symlinks.
12. As a Windows developer, I want `agy-skills` to handle Windows path separators and directory junctions properly, so that the tool works identically on Windows as on macOS and Linux.
13. As a macOS and Linux developer, I want POSIX symlinks used by default, so that file storage is shared efficiently without copying gigabytes of files.
14. As an Antigravity developer, I want `agy-skills list` to show all active skills and plugins discovered by Antigravity, so that I can see what capabilities are currently mounted.
15. As a developer in a terminal without color support, I want `agy-skills` to respect the `NO_COLOR` standard, so that raw ANSI escape codes do not clutter my output.
16. As a CI/CD pipeline author, I want `agy-skills doctor --json` to return machine-readable diagnostics, so that automated tests can verify Antigravity environment readiness.
17. As an Antigravity developer, I want clean, human-friendly error messages when git or network failures occur, so that I understand what went wrong without reading stack traces.
18. As a package consumer, I want both `agy-skills` and `antigravity-skills` binary commands to be available, so that I have the flexibility of quick shorthand or descriptive naming.
19. As an open-source contributor, I want the codebase to be cleanly organized in TypeScript with end-to-end test coverage, so that I can safely contribute enhancements.
20. As a package maintainer, I want GitHub Actions to build, lint, and test all pull requests automatically, so that releases maintain high quality.

## Implementation Decisions

### 1. High-Level Modular Decomposition
The application is structured into four cohesive modules communicating through well-defined internal interfaces:
- **Environment & Path Engine**: Encapsulates OS home resolution, path canonicalization, and detection of Antigravity and Agents directory structures (`~/.gemini/config/`, `~/.agents/skills/`).
- **Doctor & Diagnostic Engine**: Evaluates a suite of declarative health checks against filesystem state and produces structured issue reports with recommended remedies.
- **Manifest & Bridge Manager**: Safely reads, mutates, and writes `skills.json` and manages filesystem symbolic links and junctions between customization roots.
- **Plugin Adapter & Git Handler**: Manages git cloning, pulling, recursive category directory inspection, flat symlink creation under `skills/`, rule file positioning under `rules/`, and execution of `agy plugin validate`.

### 2. Zero-Dependency CLI Runtime
The CLI relies strictly on native Node.js standard library components (`fs/promises`, `path`, `os`, `child_process`) supplemented only by lightweight, standard CLI parsing (`commander` or minimal argument router) and styling utilities. This guarantees fast startup times when invoked via `npx`.

### 3. Non-Destructive Mutation Contract
- Every modification to `skills.json` creates a backup snapshot prior to mutation.
- When creating symlinks, existing symlinks pointing to target locations are confirmed and left intact; existing directories or files are never unlinked without an interactive confirmation prompt or an explicit `--force` flag.

### 4. Categorized Repository Flattening Strategy
When adapting a plugin with subdirectories:
- The adapter scans `skills/` for subdirectories that contain their own nested `SKILL.md` directories (e.g. `skills/engineering/tdd/SKILL.md`).
- For each nested skill, a direct symlink is created from `skills/<skill-name>` pointing relatively to its category target (e.g. `skills/tdd -> engineering/tdd`).
- Non-categorized flat skills remain untouched.
- Root `AGENTS.md` is positioned under `rules/AGENTS.md` if `rules/` does not already have an active rule manifest.

## Testing Decisions

### Single Primary Test Seam: CLI Execution Harness
The feature will be tested through a single, high-level test seam: the **CLI Command Dispatcher** executed against an isolated mock environment.

- **Seam Definition**: The test suite invokes the programmatic CLI entrypoint with specific arguments (e.g. `doctor`, `fix`, `bridge`, `install`) while overriding the home directory path to a temporary sandboxed test folder (`test-fixtures/sandbox-<id>`).
- **External Behavior Verification**: Tests will assert strictly against:
  1. The exit code returned by the command.
  2. The structured console output (or JSON output when `--json` is supplied).
  3. The resulting filesystem state in the sandboxed test directory (checking that `skills.json` contains valid absolute paths, checking that symlinks resolve properly, and verifying `plugin.json` content).
- **No Implementation-Detail Testing**: Tests will never assert on internal helper function calls or transient private variables. If an internal implementation changes but external CLI behavior and filesystem output remain correct, tests will continue to pass.

## Out of Scope

- Managing or installing third-party MCP servers (handled directly by `agy mcp` and Antigravity native commands).
- Building graphical user interfaces or web dashboards.
- Rewriting or authoring individual `SKILL.md` content (the tool only manages discovery, paths, and manifest metadata).
- Managing LLM API keys, quotas, or auth tokens.

## Further Notes

- The package will be named `antigravity-skills` and registered on npm.
- GitHub repository will be published to `fxw-labs/antigravity-skills` under the MIT License.
