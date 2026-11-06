# Architecture and Tech Stack for Antigravity Skills CLI

Antigravity users frequently encounter broken skill discovery due to relative paths in `skills.json` and nested multi-agent directory structures in upstream skill repositories. We decided to build a standalone CLI utility using TypeScript and Node.js published to npm and GitHub, so developers can run diagnostics and repairs immediately via `npx` with zero local build steps.

## Status

Accepted

## Considered Options

- **Go single binary**: Excellent performance and zero runtime dependency, but requires manual binary downloads or platform-specific installation workflows (Homebrew, GitHub releases).
- **Python script**: Lightweight to prototype, but fragile across varied user Python environments (virtualenvs, pipx, Python 3 versions).
- **TypeScript / Node.js (Chosen)**: Matches the ecosystem of frontend/AI developers, supports instant zero-install execution through `npx`, and seamlessly integrates with GitHub Actions for npm distribution.
