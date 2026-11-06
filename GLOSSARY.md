# Antigravity Skills

A CLI utility for diagnosing, bridging, and managing skill discovery and compatibility for Google Antigravity / Gemini CLI.

## Language

**Skill**:
A directory containing a `SKILL.md` instruction file that provides on-demand workflows to an AI agent.
_Avoid_: Prompt script, tool, extension

**Customization Root**:
The base directory (`.agents/` in a project workspace, or `~/.gemini/config/` globally) from which Antigravity discovers customizations.
_Avoid_: Home directory, config root

**Skill Manifest**:
A `skills.json` file in a customization root declaring explicit entry paths for skill discovery.
_Avoid_: Config file, skills catalog

**Plugin Bundle**:
A packaged directory within `~/.gemini/config/plugins/` that includes a `plugin.json` along with its own skills, rules, and hooks.
_Avoid_: Extension, package, module

**Skill Bridge**:
A filesystem link or configuration entry that maps external multi-agent skills into Antigravity's discovery space without duplicating files.
_Avoid_: Copy, sync, transfer

**Doctor**:
A diagnostic routine that verifies Antigravity configuration files, path absoluteness, permissions, and skill resolution health.
_Avoid_: Linter, audit, checker

**Adapter**:
A restructuring routine that flattens categorized upstream skill directories into single-tier plugins compatible with Antigravity discovery.
_Avoid_: Converter, transpiler
