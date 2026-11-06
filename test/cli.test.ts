import { describe, it, expect } from 'vitest';
import { runCli } from '../src/cli.js';

describe('CLI Entrypoint & Help/Version', () => {
  it('should display version when invoked with --version', async () => {
    let output = '';
    const exitCode = await runCli(['--version'], {
      stdout: (msg) => { output += msg + '\n'; },
      stderr: () => {},
    });

    expect(exitCode).toBe(0);
    expect(output).toContain('0.1.0');
  });

  it('should display help banner when invoked with --help', async () => {
    let output = '';
    const exitCode = await runCli(['--help'], {
      stdout: (msg) => { output += msg + '\n'; },
      stderr: () => {},
    });

    expect(exitCode).toBe(0);
    expect(output).toContain('antigravity-skills');
    expect(output).toContain('doctor');
    expect(output).toContain('fix');
    expect(output).toContain('bridge');
    expect(output).toContain('install');
  });
});
