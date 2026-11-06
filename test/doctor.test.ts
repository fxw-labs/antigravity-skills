import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runCli } from '../src/cli.js';

describe('Doctor Diagnostic Engine', () => {
  let tempHome: string;

  beforeEach(async () => {
    tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'agy-doctor-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempHome, { recursive: true, force: true });
  });

  it('should flag relative/tilde path in skills.json as error', async () => {
    const configDir = path.join(tempHome, '.gemini', 'config');
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(
      path.join(configDir, 'skills.json'),
      JSON.stringify({ entries: [{ path: '~/.agents/skills' }] }, null, 2)
    );

    let stdout = '';
    const exitCode = await runCli(['doctor', '--json'], {
      stdout: (msg) => { stdout += msg + '\n'; },
      homeDir: tempHome,
    });

    expect(exitCode).toBe(1);
    const result = JSON.parse(stdout);
    expect(result.ok).toBe(false);
    const pathCheck = result.checks.find((c: any) => c.id === 'skills-json-paths');
    expect(pathCheck).toBeDefined();
    expect(pathCheck.status).toBe('fail');
    expect(pathCheck.message).toContain('~/.agents/skills');
  });

  it('should pass path check when skills.json uses absolute paths', async () => {
    const configDir = path.join(tempHome, '.gemini', 'config');
    await fs.mkdir(configDir, { recursive: true });
    const absPath = path.join(tempHome, '.agents', 'skills');
    await fs.mkdir(absPath, { recursive: true });
    await fs.writeFile(
      path.join(configDir, 'skills.json'),
      JSON.stringify({ entries: [{ path: absPath }] }, null, 2)
    );

    let stdout = '';
    const exitCode = await runCli(['doctor', '--json'], {
      stdout: (msg) => { stdout += msg + '\n'; },
      homeDir: tempHome,
    });

    const result = JSON.parse(stdout);
    const pathCheck = result.checks.find((c: any) => c.id === 'skills-json-paths');
    expect(pathCheck.status).toBe('pass');
  });

  it('should detect unbridged ~/.agents/skills directory', async () => {
    const agentsSkillsDir = path.join(tempHome, '.agents', 'skills');
    await fs.mkdir(agentsSkillsDir, { recursive: true });

    let stdout = '';
    await runCli(['doctor', '--json'], {
      stdout: (msg) => { stdout += msg + '\n'; },
      homeDir: tempHome,
    });

    const result = JSON.parse(stdout);
    const bridgeCheck = result.checks.find((c: any) => c.id === 'skill-bridge');
    expect(bridgeCheck).toBeDefined();
    expect(bridgeCheck.status).toBe('warn');
  });
});
