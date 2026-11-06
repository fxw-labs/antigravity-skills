import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Environment } from './env.js';
import { fileExists } from './doctor.js';
import { adaptPluginDirectory, AdaptResult } from './adapter.js';

const execFileAsync = promisify(execFile);

export interface UpdateResult {
  ok: boolean;
  updatedPlugins: string[];
  message: string;
}

export async function runUpdate(
  pluginName: string | undefined,
  env: Environment
): Promise<UpdateResult> {
  const updatedPlugins: string[] = [];

  if (!env.geminiPluginsDir || !(await fileExists(env.geminiPluginsDir))) {
    return {
      ok: false,
      updatedPlugins,
      message: 'Plugins directory does not exist.',
    };
  }

  try {
    if (pluginName) {
      const pluginDir = path.join(env.geminiPluginsDir, pluginName);
      if (!(await fileExists(pluginDir))) {
        return {
          ok: false,
          updatedPlugins,
          message: `Plugin '${pluginName}' is not installed in ${pluginDir}.`,
        };
      }

      if (await fileExists(path.join(pluginDir, '.git'))) {
        await execFileAsync('git', ['-C', pluginDir, 'pull']);
      }

      const adaptRes = await adaptPluginDirectory(pluginDir, pluginName);
      if (!adaptRes.ok) {
        return {
          ok: false,
          updatedPlugins,
          message: `Failed to adapt plugin '${pluginName}': ${adaptRes.message}`,
        };
      }

      updatedPlugins.push(pluginName);
      return {
        ok: true,
        updatedPlugins,
        message: `Updated and re-adapted plugin '${pluginName}' successfully.`,
      };
    }

    // Update all installed plugins
    const entries = await fs.readdir(env.geminiPluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pDir = path.join(env.geminiPluginsDir, entry.name);

      if (await fileExists(path.join(pDir, '.git'))) {
        try {
          await execFileAsync('git', ['-C', pDir, 'pull']);
        } catch {
          // Continue even if one repo pull fails
        }
      }

      await adaptPluginDirectory(pDir, entry.name);
      updatedPlugins.push(entry.name);
    }

    return {
      ok: true,
      updatedPlugins,
      message: `Updated and re-adapted ${updatedPlugins.length} plugin(s).`,
    };
  } catch (err: any) {
    return {
      ok: false,
      updatedPlugins,
      message: `Update failed: ${err.message}`,
    };
  }
}
