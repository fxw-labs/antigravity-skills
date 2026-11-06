import readline from 'node:readline';
import { getEnvironment, Environment } from './env.js';
import { runDoctor, formatDoctorReport } from './doctor.js';
import { runFix } from './fix.js';
import { runBridge } from './bridge.js';
import { runInstall } from './install.js';
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
  install <repo>      Install/adapt a community skill repo (e.g. mattpocock/skills)
  list                List discovered skills and active plugins

Options:
  -h, --help          Show help information
  -v, --version       Show CLI version
  --json              Output results in machine-readable JSON format
  --force             Force action without confirmation
`;
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
  const log = options.stdout || console.log;
  const errorLog = options.stderr || console.error;
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
    if (isJson) {
      log(JSON.stringify(result, null, 2));
    } else {
      if (result.ok) {
        log(`✔ ${result.message}`);
      } else {
        errorLog(`✖ ${result.message}`);
      }
    }
    return result.ok ? 0 : 1;
  }

  if (firstArg === 'bridge' || firstArg === 'sync') {
    const result = await runBridge(env, { force });
    if (isJson) {
      log(JSON.stringify(result, null, 2));
    } else {
      if (result.ok) {
        log(`✔ ${result.message}`);
      } else {
        errorLog(`✖ ${result.message}`);
      }
    }
    return result.ok ? 0 : 1;
  }

  if (firstArg === 'install') {
    const repoTarget = args[1];
    if (!repoTarget) {
      errorLog('Error: missing repository target or path to install.');
      log('Usage: agy-skills install <owner/repo | github-url | local-path>');
      return 1;
    }

    const result = await runInstall(repoTarget, env);
    if (isJson) {
      log(JSON.stringify(result, null, 2));
    } else {
      if (result.ok) {
        log(`✔ ${result.message}`);
        if (result.validationOutput) {
          log(`\nValidation output:\n${result.validationOutput}`);
        }
      } else {
        errorLog(`✖ ${result.message}`);
      }
    }
    return result.ok ? 0 : 1;
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
