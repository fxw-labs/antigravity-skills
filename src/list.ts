import fs from 'node:fs/promises';
import path from 'node:path';
import { Environment } from './env.js';
import { fileExists } from './doctor.js';

export interface PluginInfo {
  name: string;
  version?: string;
  skillsCount: number;
  path: string;
}

export interface ListResult {
  skillsCount: number;
  skills: string[];
  plugins: PluginInfo[];
}

export async function runList(env: Environment): Promise<ListResult> {
  const skills: string[] = [];
  const plugins: PluginInfo[] = [];

  // 1. Scan global skills directory
  if (await fileExists(env.geminiSkillsDir)) {
    try {
      const entries = await fs.readdir(env.geminiSkillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() || entry.isSymbolicLink()) {
          const skillMd = path.join(env.geminiSkillsDir, entry.name, 'SKILL.md');
          if (await fileExists(skillMd)) {
            skills.push(entry.name);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Scan plugins directory
  if (await fileExists(env.geminiPluginsDir)) {
    try {
      const pluginDirs = await fs.readdir(env.geminiPluginsDir, { withFileTypes: true });
      for (const p of pluginDirs) {
        if (!p.isDirectory()) continue;
        const pluginPath = path.join(env.geminiPluginsDir, p.name);
        let version: string | undefined;
        let skillsCount = 0;

        const pluginJson = path.join(pluginPath, 'plugin.json');
        if (await fileExists(pluginJson)) {
          try {
            const data = JSON.parse(await fs.readFile(pluginJson, 'utf8'));
            version = data.version;
          } catch {}
        }

        const pluginSkillsDir = path.join(pluginPath, 'skills');
        if (await fileExists(pluginSkillsDir)) {
          try {
            const sEntries = await fs.readdir(pluginSkillsDir, { withFileTypes: true });
            for (const s of sEntries) {
              const skillMd = path.join(pluginSkillsDir, s.name, 'SKILL.md');
              if (await fileExists(skillMd)) {
                skillsCount++;
              }
            }
          } catch {}
        }

        plugins.push({
          name: p.name,
          version,
          skillsCount,
          path: pluginPath,
        });
      }
    } catch {
      // ignore
    }
  }

  return {
    skillsCount: skills.length,
    skills,
    plugins,
  };
}

export function formatListResult(result: ListResult): string {
  const lines: string[] = [];
  lines.push('\n📦 Antigravity Discovered Customizations\n');

  lines.push(`📁 Global Skills (${result.skillsCount}):`);
  if (result.skills.length === 0) {
    lines.push('   (No standalone global skills discovered)');
  } else {
    for (const skill of result.skills) {
      lines.push(`   - ${skill}`);
    }
  }

  lines.push(`\n🧩 Installed Plugins (${result.plugins.length}):`);
  if (result.plugins.length === 0) {
    lines.push('   (No plugins installed)');
  } else {
    for (const p of result.plugins) {
      const ver = p.version ? ` (v${p.version})` : '';
      lines.push(`   - ${p.name}${ver} [${p.skillsCount} skills]`);
      lines.push(`     Path: ${p.path}`);
    }
  }

  return lines.join('\n');
}
