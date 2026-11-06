import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runCli } from '../src/cli.js';
import { adaptPluginDirectory } from '../src/adapter.js';

describe('Community Plugin Adapter & Install', () => {
  let tempHome: string;

  beforeEach(async () => {
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'agy-adapter-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempHome, { recursive: true, force: true });
  });

  it('should adapt multi-tier skills and AGENTS.md rules', async () => {
    const pluginDir = path.join(tempHome, 'test-plugin');
    const engineeringSkill = path.join(pluginDir, 'skills', 'engineering', 'sample-skill');
    await fs.mkdir(engineeringSkill, { recursive: true });
    await fs.writeFile(path.join(engineeringSkill, 'SKILL.md'), '---\nname: sample-skill\n---\n# Sample');
    await fs.writeFile(path.join(pluginDir, 'AGENTS.md'), '# Agents Rule');

    const result = await adaptPluginDirectory(pluginDir, 'test-plugin');
    expect(result.ok).toBe(true);
    expect(result.flattenedSkills).toContain('sample-skill');

    // Verify symlink was created
    const linkPath = path.join(pluginDir, 'skills', 'sample-skill');
    const stat = await fs.lstat(linkPath);
    expect(stat.isSymbolicLink()).toBe(true);

    // Verify AGENTS.md was moved to rules/
    const rulePath = path.join(pluginDir, 'rules', 'AGENTS.md');
    const ruleContent = await fs.readFile(rulePath, 'utf8');
    expect(ruleContent).toBe('# Agents Rule');
    const rootAgentsExists = await fs.access(path.join(pluginDir, 'AGENTS.md')).then(() => true).catch(() => false);
    expect(rootAgentsExists).toBe(false);

    // Verify plugin.json was generated
    const pluginJsonPath = path.join(pluginDir, 'plugin.json');
    const pluginJsonContent = await fs.readFile(pluginJsonPath, 'utf8');
    const parsed = JSON.parse(pluginJsonContent);
    expect(parsed.name).toBe('test-plugin');
  });

  it('should adapt and install from local directory path', async () => {
    const fixtureDir = path.join(tempHome, 'fixture-repo');
    const catDir = path.join(fixtureDir, 'skills', 'productivity', 'super-tool');
    await fs.mkdir(catDir, { recursive: true });
    await fs.writeFile(path.join(catDir, 'SKILL.md'), '---\nname: super-tool\n---\n# Tool');

    let stdout = '';
    const exitCode = await runCli(['install', fixtureDir], {
      stdout: (msg) => { stdout += msg + '\n'; },
      homeDir: tempHome,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Installed and adapted');

    const installedPlugin = path.join(tempHome, '.gemini', 'config', 'plugins', 'fixture-repo');
    const symlinkPath = path.join(installedPlugin, 'skills', 'super-tool');
    const isSym = (await fs.lstat(symlinkPath)).isSymbolicLink();
    expect(isSym).toBe(true);
  });
});
