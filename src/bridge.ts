import fs from 'node:fs/promises';
import path from 'node:path';
import { Environment } from './env.js';
import { isSymlinkTo } from './doctor.js';

export interface BridgeResult {
  ok: boolean;
  message: string;
}

export async function runBridge(
  env: Environment,
  options: { force?: boolean } = {}
): Promise<BridgeResult> {
  try {
    await fs.mkdir(env.customizationRoot, { recursive: true });
    await fs.mkdir(env.agentsSkillsDir, { recursive: true });

    let exists = false;
    let isSymlink = false;

    try {
      const stat = await fs.lstat(env.geminiSkillsDir);
      exists = true;
      isSymlink = stat.isSymbolicLink();
    } catch {
      exists = false;
    }

    if (exists) {
      if (isSymlink) {
        const isCurrentTarget = await isSymlinkTo(env.geminiSkillsDir, env.agentsSkillsDir);
        if (isCurrentTarget) {
          return {
            ok: true,
            message: `${env.geminiSkillsDir} is already bridged to ${env.agentsSkillsDir}.`,
          };
        }
        await fs.unlink(env.geminiSkillsDir);
      } else {
        if (!options.force) {
          return {
            ok: false,
            message: `${env.geminiSkillsDir} already exists and is not a symlink. Use --force to overwrite.`,
          };
        }
        await fs.rm(env.geminiSkillsDir, { recursive: true, force: true });
      }
    }

    // Windows directory junctions strictly require absolute paths
    const symlinkTarget = process.platform === 'win32'
      ? path.resolve(env.agentsSkillsDir)
      : env.agentsSkillsDir;
    const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
    await fs.symlink(symlinkTarget, env.geminiSkillsDir, symlinkType);

    return {
      ok: true,
      message: `Bridged ${env.geminiSkillsDir} -> ${env.agentsSkillsDir} successfully.`,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Failed to create bridge: ${err.message}`,
    };
  }
}
