import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runCli } from '../src/cli.js';
import { isSymlinkTo } from '../src/doctor.js';

describe('Bridge Command', () => {
  let tempHome: string;

  beforeEach(async () => {
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'agy-bridge-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempHome, { recursive: true, force: true });
  });

  it('should create symlink from ~/.gemini/config/skills to ~/.agents/skills', async () => {
    const agentsSkillsDir = path.join(tempHome, '.agents', 'skills');
    await fs.mkdir(agentsSkillsDir, { recursive: true });

    let stdout = '';
    const exitCode = await runCli(['bridge'], {
      stdout: (msg) => { stdout += msg + '\n'; },
      homeDir: tempHome,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Bridged');

    const geminiSkillsDir = path.join(tempHome, '.gemini', 'config', 'skills');
    const isLinked = await isSymlinkTo(geminiSkillsDir, agentsSkillsDir);
    expect(isLinked).toBe(true);
  });

  it('should be idempotent if bridge already exists', async () => {
    const agentsSkillsDir = path.join(tempHome, '.agents', 'skills');
    await fs.mkdir(agentsSkillsDir, { recursive: true });

    await runCli(['bridge'], { homeDir: tempHome });

    let stdout = '';
    const exitCode = await runCli(['bridge'], {
      stdout: (msg) => { stdout += msg + '\n'; },
      homeDir: tempHome,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('already bridged');
  });

  it('should fail safely if a non-symlink directory already exists without --force', async () => {
    const geminiSkillsDir = path.join(tempHome, '.gemini', 'config', 'skills');
    await fs.mkdir(geminiSkillsDir, { recursive: true });
    await fs.writeFile(path.join(geminiSkillsDir, 'existing.txt'), 'hello');

    let stderr = '';
    const exitCode = await runCli(['bridge'], {
      stderr: (msg) => { stderr += msg + '\n'; },
      homeDir: tempHome,
    });

    expect(exitCode).toBe(1);
    expect(stderr).toContain('already exists and is not a symlink');
  });
});
