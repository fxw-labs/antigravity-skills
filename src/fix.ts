import fs from 'node:fs/promises';
import path from 'node:path';
import { Environment, expandTilde } from './env.js';
import { fileExists } from './doctor.js';

export interface FixResult {
  ok: boolean;
  fixedCount: number;
  backupPath?: string;
  message: string;
}

export async function runFix(env: Environment): Promise<FixResult> {
  const exists = await fileExists(env.skillsJsonPath);

  if (!exists) {
    const agentsDirExists = await fileExists(env.agentsSkillsDir);
    if (agentsDirExists) {
      await fs.mkdir(env.geminiConfigDir, { recursive: true });
      const initialConfig = {
        entries: [{ path: env.agentsSkillsDir }],
      };
      await fs.writeFile(env.skillsJsonPath, JSON.stringify(initialConfig, null, 2), 'utf8');
      return {
        ok: true,
        fixedCount: 1,
        message: `Created ${env.skillsJsonPath} pointing to ${env.agentsSkillsDir}`,
      };
    }

    return {
      ok: true,
      fixedCount: 0,
      message: 'No skills.json found to repair.',
    };
  }

  try {
    const rawContent = await fs.readFile(env.skillsJsonPath, 'utf8');
    const parsed = JSON.parse(rawContent);

    const backupPath = env.skillsJsonPath + '.bak';
    await fs.writeFile(backupPath, rawContent, 'utf8');

    let fixedCount = 0;
    if (Array.isArray(parsed.entries)) {
      for (const entry of parsed.entries) {
        if (typeof entry?.path === 'string') {
          const original = entry.path;
          let resolved = expandTilde(original, env.homeDir);
          if (!path.isAbsolute(resolved)) {
            resolved = path.resolve(env.homeDir, resolved);
          }

          if (resolved !== original) {
            entry.path = resolved;
            fixedCount++;
          }
        }
      }
    }

    if (fixedCount > 0) {
      await fs.writeFile(env.skillsJsonPath, JSON.stringify(parsed, null, 2), 'utf8');
      return {
        ok: true,
        fixedCount,
        backupPath,
        message: `Fixed ${fixedCount} path(s) in skills.json (backup saved to ${backupPath}).`,
      };
    }

    return {
      ok: true,
      fixedCount: 0,
      message: 'All paths in skills.json are already absolute. No changes needed.',
    };
  } catch (err: any) {
    return {
      ok: false,
      fixedCount: 0,
      message: `Failed to fix skills.json: ${err.message}`,
    };
  }
}
