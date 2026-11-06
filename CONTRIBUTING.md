# Contributing to Antigravity Skills (`agy-skills`)

Thank you for your interest in contributing to `antigravity-skills`! This project provides zero-dependency, high-reliability developer tooling to bridge, diagnose, and manage skills for Google Antigravity and the Gemini CLI ecosystem.

---

## 🛠 Development Workflow

### Prerequisites
- **Node.js**: >= 20.0.0
- **npm**: >= 9.0.0
- **Git**

### 1. Setup

```bash
git clone https://github.com/fxw-labs/antigravity-skills.git
cd antigravity-skills
npm install
```

### 2. Available Scripts

- `npm run typecheck`: Runs TypeScript compiler (`tsc --noEmit`) to verify types.
- `npm test`: Runs test suite via `vitest run`.
- `npm run build`: Compiles TypeScript source to `./dist/` and marks CLI executable.

---

## 📐 Architecture & Coding Guidelines

1. **Zero External Runtime Dependencies**:
   - The CLI runtime MUST rely strictly on standard Node.js built-in modules (`node:fs/promises`, `node:path`, `node:os`, `node:child_process`, `node:readline`).
   - Do NOT add external runtime dependencies like commander, chalk, or execa. Keep `npx agy-skills` lightning fast.
2. **Canonical Domain Vocabulary**:
   - Strictly follow terms defined in [GLOSSARY.md](./GLOSSARY.md): *Skill*, *Customization Root*, *Skill Manifest*, *Plugin Bundle*, *Skill Bridge*, *Doctor*, *Adapter*.
   - Do not reintroduce prohibited terms (e.g. `sync`).
3. **Cross-Platform Compatibility**:
   - Must work seamlessly across macOS, Linux, and Windows.
   - For Windows filesystem links, use directory junctions with resolved absolute paths: `fs.symlink(path.resolve(target), linkPath, 'junction')`.
4. **Git Cleanliness**:
   - Adapting third-party plugins must never delete upstream files (e.g. do NOT delete root `AGENTS.md`; instead copy to `rules/AGENTS.md`) to avoid dirtying the git tree or causing merge conflicts during `agy-skills update`.

---

## 🧪 Testing Guidelines

- All public CLI commands and core adapters must be accompanied by unit or integration tests in `test/`.
- Test commands through the public `runCli` dispatcher or adapter functions using isolated temporary directories (`node:os.tmpdir()`).
- Always clean up temporary directories in test `afterEach` or `afterAll` hooks.

---

## 📝 Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New user-facing command or capability
- `fix:` Bug fix or compatibility patch
- `docs:` Documentation updates, specs, or ADRs
- `refactor:` Code refactoring without behavior changes
- `test:` Adding or updating tests
- `chore:` Build scripts or repository maintenance

---

## 📬 Submitting Changes

1. Fork the repository and create your feature branch: `git checkout -b feat/my-new-feature`.
2. Ensure all checks pass:
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```
3. Commit your changes with a conventional commit message.
4. Push to your fork and submit a Pull Request describing your changes.
