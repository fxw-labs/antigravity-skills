import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runCli } from '../src/cli.js';

describe('Update Command', () => {
  let tempHome: string;

  beforeEach(async () => {
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'agy-update-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempHome, { recursive: true, force: true });
  });

  it('should update installed plugin and re-flatten newly added nested skills', async () => {
    const pluginDir = path.join(tempHome, '.gemini', 'config', 'plugins', 'my-plugin');
    const skillPath = path.join(pluginDir, 'skills', 'engineering', 'skill-one');
    await fs.mkdir(skillPath, { recursive: true });
    await fs.writeFile(path.join(skillPath, 'SKILL.md'), '---\nname: skill-one\n---\n# One');

    // Run update
    let stdout = '';
    const exitCode = await runCli(['update', 'my-plugin'], {
      stdout: (msg) => { stdout += msg + '\n'; },
      homeDir: tempHome,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Updated and re-adapted plugin');

    // Check that symlink was created
    const linkPath = path.join(pluginDir, 'skills', 'skill-one');
    const isSym = (await fs.lstat(linkPath)).isSymbolicLink();
    expect(isSym).toBe(true);
  });
});
