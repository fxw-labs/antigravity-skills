import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Environment } from './env.js';
import { fileExists } from './doctor.js';
import { adaptPluginDirectory, AdaptResult } from './adapter.js';

const execFileAsync = promisify(execFile);

export interface InstallResult {
  ok: boolean;
  pluginName: string;
  targetDir: string;
  adaptResult?: AdaptResult;
  validationOutput?: string;
  message: string;
}

export function parseRepoTarget(target: string): { url?: string; isLocal: boolean; name: string } {
  // If it contains slashes and exists on disk, it's local
  const trimmed = target.trim();
  const repoSlugRegex = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

  if (repoSlugRegex.test(trimmed)) {
    const parts = trimmed.split('/');
    return {
      url: `https://github.com/${trimmed}.git`,
      isLocal: false,
      name: parts[1].replace(/\.git$/, ''),
    };
  }

  if (trimmed.startsWith('https://') || trimmed.startsWith('git@') || trimmed.startsWith('ssh://')) {
    const match = trimmed.match(/\/([^/]+?)(?:\.git)?$/);
    const name = match ? match[1] : 'custom-plugin';
    return {
      url: trimmed,
      isLocal: false,
      name,
    };
  }

  // Treat as local path
  const name = path.basename(path.resolve(trimmed));
  return {
    isLocal: true,
    name,
  };
}

export async function runInstall(
  target: string,
  env: Environment,
  options: { validate?: boolean } = {}
): Promise<InstallResult> {
  const { url, isLocal, name } = parseRepoTarget(target);
  const targetDir = path.join(env.geminiPluginsDir, name);

  try {
    await fs.mkdir(env.geminiPluginsDir, { recursive: true });

    if (isLocal) {
      const srcPath = path.resolve(target);
      if (!(await fileExists(srcPath))) {
        return {
          ok: false,
          pluginName: name,
          targetDir,
          message: `Local source directory not found: ${srcPath}`,
        };
      }

      await fs.cp(srcPath, targetDir, { recursive: true });
    } else if (url) {
      if (await fileExists(path.join(targetDir, '.git'))) {
        // Run git pull
        await execFileAsync('git', ['-C', targetDir, 'pull']);
      } else {
        await execFileAsync('git', ['clone', '--depth', '1', url, targetDir]);
      }
    }

    // Run directory adaptation
    const adaptResult = await adaptPluginDirectory(targetDir, name);
    if (!adaptResult.ok) {
      return {
        ok: false,
        pluginName: name,
        targetDir,
        adaptResult,
        message: `Failed to adapt plugin: ${adaptResult.message}`,
      };
    }

    // Optional: agy plugin validate
    let validationOutput: string | undefined;
    let validationPassed = true;
    if (options.validate !== false) {
      try {
        const { stdout } = await execFileAsync('agy', ['plugin', 'validate', targetDir]);
        validationOutput = stdout.trim();
      } catch (err: any) {
        validationPassed = false;
        validationOutput = (err.stdout || err.stderr || err.message || '').trim();
      }
    }

    const valNotice = validationPassed ? '' : ' (Warning: `agy plugin validate` reported issues)';
    return {
      ok: true,
      pluginName: name,
      targetDir,
      adaptResult,
      validationOutput,
      message: `Installed and adapted plugin '${name}' into ${targetDir}.${valNotice} Flattened ${adaptResult.flattenedSkills.length} skill(s).`,
    };
  } catch (err: any) {
    return {
      ok: false,
      pluginName: name,
      targetDir,
      message: `Failed to install plugin '${name}': ${err.message}`,
    };
  }
}
