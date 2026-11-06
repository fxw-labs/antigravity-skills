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

function stripJsonComments(jsonc: string): string {
  return jsonc.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (match, group) => {
    return group ? '' : match;
  });
}

export async function runFix(env: Environment): Promise<FixResult> {
  const exists = await fileExists(env.skillManifestPath);

  if (!exists) {
    const agentsDirExists = await fileExists(env.agentsSkillsDir);
    if (agentsDirExists) {
      await fs.mkdir(env.customizationRoot, { recursive: true });
      const initialManifest = {
        entries: [{ path: env.agentsSkillsDir }],
      };
      await fs.writeFile(env.skillManifestPath, JSON.stringify(initialManifest, null, 2), 'utf8');
      return {
        ok: true,
        fixedCount: 1,
        message: `Created ${env.skillManifestPath} pointing to ${env.agentsSkillsDir}`,
      };
    }

    return {
      ok: true,
      fixedCount: 0,
      message: 'No skills.json found to repair.',
    };
  }

  try {
    const rawContent = await fs.readFile(env.skillManifestPath, 'utf8');
    const cleanJson = stripJsonComments(rawContent);
    const parsed = JSON.parse(cleanJson);

    const backupPath = env.skillManifestPath + '.bak';
    await fs.writeFile(backupPath, rawContent, 'utf8');

    let fixedCount = 0;
    let updatedContent = rawContent;

    if (Array.isArray(parsed.entries)) {
      for (const entry of parsed.entries) {
        if (typeof entry?.path === 'string') {
          const original = entry.path;
          let resolved = expandTilde(original, env.homeDir);
          if (!path.isAbsolute(resolved)) {
            resolved = path.resolve(env.homeDir, resolved);
          }

          if (resolved !== original) {
            // Replace exact quoted path in the raw content to preserve comments and layout
            const escapedOriginal = original.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            const pathRegex = new RegExp(`("path"\\s*:\\s*)"${escapedOriginal}"`, 'g');

            if (pathRegex.test(updatedContent)) {
              updatedContent = updatedContent.replace(pathRegex, `$1"${resolved}"`);
              fixedCount++;
            }
          }
        }
      }
    }

    if (fixedCount > 0) {
      await fs.writeFile(env.skillManifestPath, updatedContent, 'utf8');
      return {
        ok: true,
        fixedCount,
        backupPath,
        message: `Fixed ${fixedCount} path(s) in skills.json while preserving comments (backup saved to ${backupPath}).`,
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
