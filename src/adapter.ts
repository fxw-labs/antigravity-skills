import fs from 'node:fs/promises';
import path from 'node:path';
import { fileExists } from './doctor.js';

export interface NestedSkillItem {
  categoryName: string;
  skillName: string;
  skillMdPath: string;
  relativeTarget: string;
}

export interface AdaptResult {
  ok: boolean;
  flattenedSkills: string[];
  rulesMigrated: boolean;
  message?: string;
}

export async function findNestedSkills(skillsDir: string): Promise<NestedSkillItem[]> {
  const results: NestedSkillItem[] = [];
  if (!(await fileExists(skillsDir))) {
    return results;
  }

  const categoryEntries = await fs.readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  for (const categoryEntry of categoryEntries) {
    if (!categoryEntry.isDirectory()) continue;
    const categoryPath = path.join(skillsDir, categoryEntry.name);

    const skillEntries = await fs.readdir(categoryPath, { withFileTypes: true }).catch(() => []);
    for (const skillEntry of skillEntries) {
      if (!skillEntry.isDirectory()) continue;
      const skillMdPath = path.join(categoryPath, skillEntry.name, 'SKILL.md');

      if (await fileExists(skillMdPath)) {
        results.push({
          categoryName: categoryEntry.name,
          skillName: skillEntry.name,
          skillMdPath,
          relativeTarget: path.join(categoryEntry.name, skillEntry.name),
        });
      }
    }
  }

  return results;
}

export async function adaptPluginDirectory(
  pluginDir: string,
  pluginName: string
): Promise<AdaptResult> {
  const flattenedSkills: string[] = [];
  let rulesMigrated = false;

  try {
    const skillsDir = path.join(pluginDir, 'skills');
    const nestedSkills = await findNestedSkills(skillsDir);

    for (const item of nestedSkills) {
      const linkPath = path.join(skillsDir, item.skillName);
      const linkExists = await fileExists(linkPath);

      if (!linkExists) {
        // Windows directory junctions strictly require absolute paths, while POSIX uses relative paths
        const symTarget = process.platform === 'win32'
          ? path.resolve(skillsDir, item.relativeTarget)
          : item.relativeTarget;
        const symType = process.platform === 'win32' ? 'junction' : 'dir';
        await fs.symlink(symTarget, linkPath, symType);
        flattenedSkills.push(item.skillName);
      }
    }

    // Adapt root AGENTS.md to rules/AGENTS.md without deleting the original git-tracked file
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
      // Do NOT delete rootAgentsMd to preserve upstream git-tracking cleanliness
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
