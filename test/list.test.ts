import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runCli } from '../src/cli.js';

describe('List Command', () => {
  let tempHome: string;

  beforeEach(async () => {
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'agy-list-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempHome, { recursive: true, force: true });
  });

  it('should list installed plugins and skills', async () => {
    const pluginDir = path.join(tempHome, '.gemini', 'config', 'plugins', 'sample-plugin');
    const skillDir = path.join(pluginDir, 'skills', 'cool-skill');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), '---\nname: cool-skill\n---\n# Cool');
    await fs.writeFile(path.join(pluginDir, 'plugin.json'), JSON.stringify({ name: 'sample-plugin', version: '1.0.0' }));

    let stdout = '';
    const exitCode = await runCli(['list', '--json'], {
      stdout: (msg) => { stdout += msg + '\n'; },
      homeDir: tempHome,
    });

    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.plugins).toContainEqual(expect.objectContaining({ name: 'sample-plugin' }));
  });
});
