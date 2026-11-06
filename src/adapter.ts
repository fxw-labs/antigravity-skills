import fs from 'node:fs/promises';
import path from 'node:path';
import { fileExists } from './doctor.js';

export interface AdaptResult {
  ok: boolean;
  flattenedSkills: string[];
  rulesMigrated: boolean;
  message?: string;
}

export async function adaptPluginDirectory(
  pluginDir: string,
  pluginName: string
): Promise<AdaptResult> {
  const flattenedSkills: string[] = [];
  let rulesMigrated = false;

  try {
    const skillsDir = path.join(pluginDir, 'skills');
    if (await fileExists(skillsDir)) {
      const entries = await fs.readdir(skillsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const subPath = path.join(skillsDir, entry.name);

        const subEntries = await fs.readdir(subPath, { withFileTypes: true }).catch(() => []);
        for (const sub of subEntries) {
          if (!sub.isDirectory()) continue;
          const skillMdPath = path.join(subPath, sub.name, 'SKILL.md');

          if (await fileExists(skillMdPath)) {
            const linkPath = path.join(skillsDir, sub.name);
            const linkExists = await fileExists(linkPath);

            if (!linkExists) {
              const relTarget = path.join(entry.name, sub.name);
              const symType = process.platform === 'win32' ? 'junction' : 'dir';
              await fs.symlink(relTarget, linkPath, symType);
              flattenedSkills.push(sub.name);
            }
          }
        }
      }
    }

    // Adapt root AGENTS.md to rules/AGENTS.md
    const rootAgentsMd = path.join(pluginDir, 'AGENTS.md');
    const rulesDir = path.join(pluginDir, 'rules');
    const rulesAgentsMd = path.join(rulesDir, 'AGENTS.md');

    if (await fileExists(rootAgentsMd)) {
      await fs.mkdir(rulesDir, { recursive: true });
      if (!(await fileExists(rulesAgentsMd))) {
        const content = await fs.readFile(rootAgentsMd, 'utf8');
        await fs.writeFile(rulesAgentsMd, content, 'utf8');
        rulesMigrated = true;
      }
      await fs.rm(rootAgentsMd, { force: true });
    }

    // Ensure plugin.json exists
    const pluginJsonPath = path.join(pluginDir, 'plugin.json');
    if (!(await fileExists(pluginJsonPath))) {
      let meta: any = {
        name: pluginName,
        version: '1.0.0',
        description: `Adapted Antigravity plugin for ${pluginName}`,
      };

      const claudePluginJson = path.join(pluginDir, '.claude-plugin', 'plugin.json');
      if (await fileExists(claudePluginJson)) {
        try {
          const claudeMeta = JSON.parse(await fs.readFile(claudePluginJson, 'utf8'));
          if (claudeMeta.name) meta.name = claudeMeta.name;
          if (claudeMeta.version) meta.version = claudeMeta.version;
          if (claudeMeta.description) meta.description = claudeMeta.description;
          if (claudeMeta.author) meta.author = claudeMeta.author;
        } catch {
          // Fall back to default meta
        }
      }

      await fs.writeFile(pluginJsonPath, JSON.stringify(meta, null, 2), 'utf8');
    }

    return {
      ok: true,
      flattenedSkills,
      rulesMigrated,
    };
  } catch (err: any) {
    return {
      ok: false,
      flattenedSkills,
      rulesMigrated,
      message: err.message,
    };
  }
}
