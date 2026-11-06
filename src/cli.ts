import readline from 'node:readline';
import { getEnvironment, Environment } from './env.js';
import { runDoctor, formatDoctorReport } from './doctor.js';
import { runFix } from './fix.js';
import { runBridge } from './bridge.js';
import { runInstall } from './install.js';
import { runUpdate } from './update.js';
import { runList, formatListResult } from './list.js';

export interface CliOptions {
  stdout?: (msg: string) => void;
  stderr?: (msg: string) => void;
  homeDir?: string;
  isInteractive?: boolean;
}

export const VERSION = '0.1.0';

export function getHelpText(): string {
  return `
antigravity-skills (agy-skills) v${VERSION}
Diagnose, bridge, and manage skill discovery for Google Antigravity / Gemini CLI.

Usage:
  agy-skills [command] [options]
  antigravity-skills [command] [options]

Commands:
  doctor              Run diagnostics on Antigravity skills and manifests (default)
  fix                 Automatically fix non-absolute paths in skills.json
  bridge              Create a symbolic bridge between ~/.agents/skills and Antigravity
  install <target>    Install/adapt a community skill repo or local path (e.g. mattpocock/skills)
  update [plugin]     Pull latest git commits and re-adapt installed plugins
  list                List discovered skills and active plugins

Options:
  -h, --help          Show help information
  -v, --version       Show CLI version
  --json              Output results in machine-readable JSON format
  --force             Force action without confirmation
`;
}

function stripAnsi(text: string): string {
  return text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

export async function runCli(argv: string[], options: CliOptions = {}): Promise<number> {
  const rawLog = options.stdout || console.log;
  const rawErrorLog = options.stderr || console.error;
  const shouldStripColor = Boolean(process.env.NO_COLOR && process.env.NO_COLOR.trim() !== '');

  const log = (msg: string) => rawLog(shouldStripColor ? stripAnsi(msg) : msg);
  const errorLog = (msg: string) => rawErrorLog(shouldStripColor ? stripAnsi(msg) : msg);

  const env: Environment = getEnvironment(options.homeDir);

  const args = [...argv];
  const firstArg = args[0];

  if (args.includes('-v') || args.includes('--version') || firstArg === 'version') {
    log(VERSION);
    return 0;
  }

  if (args.includes('-h') || args.includes('--help') || firstArg === 'help') {
    log(getHelpText());
    return 0;
  }

  const isJson = args.includes('--json');
  const force = args.includes('--force');

  // Helper to handle standard command result dispatch
  const handleResult = (result: { ok: boolean; message?: string }, successExtra?: string) => {
    if (isJson) {
      log(JSON.stringify(result, null, 2));
    } else {
      if (result.ok) {
        log(`✔ ${result.message || 'Operation completed successfully.'}`);
        if (successExtra) log(successExtra);
      } else {
        errorLog(`✖ ${result.message || 'Operation failed.'}`);
      }
    }
    return result.ok ? 0 : 1;
  };

  if (firstArg === 'list') {
    const result = await runList(env);
    if (isJson) {
      log(JSON.stringify(result, null, 2));
    } else {
      log(formatListResult(result));
    }
    return 0;
  }

  if (firstArg === 'fix') {
    const result = await runFix(env);
    return handleResult(result);
  }

  if (firstArg === 'bridge') {
    let effectiveForce = force;
    const isInteractive = options.isInteractive ?? (process.stdin.isTTY && !force);

    if (!effectiveForce && isInteractive) {
      // Check if real dir exists to ask interactive confirmation
      const stat = await import('node:fs/promises').then((fs) => fs.lstat(env.geminiSkillsDir)).catch(() => null);
      if (stat && !stat.isSymbolicLink()) {
        const confirm = await promptYesNo(`Directory ${env.geminiSkillsDir} exists and is not a symlink. Overwrite?`);
        effectiveForce = confirm;
      }
    }

    const result = await runBridge(env, { force: effectiveForce });
    return handleResult(result);
  }

  if (firstArg === 'install') {
    const repoTarget = args[1];
    if (!repoTarget) {
      errorLog('Error: missing repository target or path to install.');
      log('Usage: agy-skills install <owner/repo | github-url | local-path>');
      return 1;
    }

    const result = await runInstall(repoTarget, env);
    const extra = result.validationOutput ? `\nValidation output:\n${result.validationOutput}` : undefined;
    return handleResult(result, extra);
  }

  if (firstArg === 'update') {
    const pluginName = args[1];
    const result = await runUpdate(pluginName, env);
    return handleResult(result);
  }

  if (!firstArg || firstArg === 'doctor') {
    const report = await runDoctor(env);
    if (isJson) {
      log(JSON.stringify(report, null, 2));
      return report.ok ? 0 : 1;
    }

    log(formatDoctorReport(report));

    const fixableChecks = report.checks.filter((c) => c.fixable && c.status !== 'pass');
    const isInteractive = options.isInteractive ?? (process.stdin.isTTY && !firstArg);

    if (isInteractive && fixableChecks.length > 0) {
      const shouldFix = await promptYesNo('\n🛠  Would you like to automatically repair these issues now?');
      if (shouldFix) {
        log('\nApplying automated repairs...');
        const fixResult = await runFix(env);
        log(`  - ${fixResult.message}`);
        const bridgeResult = await runBridge(env);
        log(`  - ${bridgeResult.message}`);

        const recheck = await runDoctor(env);
        log('\n' + formatDoctorReport(recheck));
        return recheck.ok ? 0 : 1;
      }
    }

    return report.ok ? 0 : 1;
  }

  errorLog(`Unknown command: ${firstArg}\n`);
  log(getHelpText());
  return 1;
}
