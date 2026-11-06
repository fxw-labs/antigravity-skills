import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runCli } from '../src/cli.js';

describe('Fix Command', () => {
  let tempHome: string;

  beforeEach(async () => {
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'agy-fix-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempHome, { recursive: true, force: true });
  });

  it('should rewrite relative and tilde paths to absolute paths and create backup', async () => {
    const configDir = path.join(tempHome, '.gemini', 'config');
    await fs.mkdir(configDir, { recursive: true });
    const originalJson = {
      entries: [
        { path: '~/.agents/skills' },
        { path: 'some/relative/skills' },
      ],
    };
    await fs.writeFile(path.join(configDir, 'skills.json'), JSON.stringify(originalJson, null, 2));

    let stdout = '';
    const exitCode = await runCli(['fix'], {
      stdout: (msg) => { stdout += msg + '\n'; },
      homeDir: tempHome,
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Fixed 2 path(s)');

    // Check backup was created
    const backupContent = await fs.readFile(path.join(configDir, 'skills.json.bak'), 'utf8');
    expect(JSON.parse(backupContent)).toEqual(originalJson);

    // Check updated skills.json has absolute paths
    const updatedContent = await fs.readFile(path.join(configDir, 'skills.json'), 'utf8');
    const updatedJson = JSON.parse(updatedContent);
    expect(updatedJson.entries[0].path).toBe(path.join(tempHome, '.agents', 'skills'));
    expect(path.isAbsolute(updatedJson.entries[1].path)).toBe(true);
  });

  it('should initialize skills.json if missing and ~/.agents/skills exists', async () => {
    const agentsSkillsDir = path.join(tempHome, '.agents', 'skills');
    await fs.mkdir(agentsSkillsDir, { recursive: true });

    let stdout = '';
    const exitCode = await runCli(['fix'], {
      stdout: (msg) => { stdout += msg + '\n'; },
      homeDir: tempHome,
    });

    expect(exitCode).toBe(0);
    const configDir = path.join(tempHome, '.gemini', 'config');
    const createdContent = await fs.readFile(path.join(configDir, 'skills.json'), 'utf8');
    const createdJson = JSON.parse(createdContent);
    expect(createdJson.entries[0].path).toBe(agentsSkillsDir);
  });
});
