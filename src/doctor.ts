import fs from 'node:fs/promises';
import path from 'node:path';
import { Environment } from './env.js';
import { findNestedSkills } from './adapter.js';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface CheckResult {
  id: string;
  title: string;
  status: CheckStatus;
  message: string;
  fixable: boolean;
  remedy?: string;
}

export interface DoctorReport {
  ok: boolean;
  checks: CheckResult[];
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function isSymlinkTo(sourcePath: string, targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(sourcePath);
    if (!stat.isSymbolicLink()) return false;
    const dest = await fs.readlink(sourcePath);
    const resolvedDest = path.resolve(path.dirname(sourcePath), dest);
    return resolvedDest === path.resolve(targetPath);
  } catch {
    return false;
  }
}

function stripJsonComments(jsonc: string): string {
  // Strip single-line comments // and multi-line comments /* */ outside of strings
  return jsonc.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (match, group) => {
    return group ? '' : match;
  });
}

export async function runDoctor(env: Environment): Promise<DoctorReport> {
  const checks: CheckResult[] = [];

  // Check 1: Customization root directory permissions
  const customizationRootExists = await fileExists(env.customizationRoot);
  if (customizationRootExists) {
    try {
      await fs.access(env.customizationRoot, (fs.constants || { W_OK: 2 }).W_OK);
      checks.push({
        id: 'customization-root-permissions',
        title: 'Customization Root Permissions',
        status: 'pass',
        message: 'Antigravity customization root is writable.',
        fixable: false,
      });
    } catch {
      checks.push({
        id: 'customization-root-permissions',
        title: 'Customization Root Permissions',
        status: 'fail',
        message: `Customization root ${env.customizationRoot} is not writable (permission locked).`,
        fixable: false,
        remedy: `Check directory permissions: chmod u+w ${env.customizationRoot}`,
      });
    }
  }

  // Check 2: skills.json paths
  const skillsJsonExists = await fileExists(env.skillManifestPath);
  if (!skillsJsonExists) {
    checks.push({
      id: 'skills-json-paths',
      title: 'Skill Manifest Path Resolution',
      status: 'pass',
      message: 'No skills.json present (Antigravity will use default paths).',
      fixable: false,
    });
  } else {
    try {
      const content = await fs.readFile(env.skillManifestPath, 'utf8');
      const cleanJson = stripJsonComments(content);
      const parsed = JSON.parse(cleanJson);
      const invalidEntries: string[] = [];

      if (Array.isArray(parsed.entries)) {
        for (const entry of parsed.entries) {
          if (typeof entry?.path === 'string') {
            if (entry.path.startsWith('~') || !path.isAbsolute(entry.path)) {
              invalidEntries.push(entry.path);
            }
          }
        }
      }

      if (invalidEntries.length > 0) {
        checks.push({
          id: 'skills-json-paths',
          title: 'Skill Manifest Path Resolution',
          status: 'fail',
          message: `skills.json contains non-absolute paths (${invalidEntries.join(', ')}). Antigravity rejects relative and tilde paths.`,
          fixable: true,
          remedy: 'Run `agy-skills fix` to rewrite into absolute paths.',
        });
      } else {
        checks.push({
          id: 'skills-json-paths',
          title: 'Skill Manifest Path Resolution',
          status: 'pass',
          message: 'All paths in skills.json are valid absolute paths.',
          fixable: false,
        });
      }
    } catch (err: any) {
      checks.push({
        id: 'skills-json-paths',
        title: 'Skill Manifest Path Resolution',
        status: 'fail',
        message: `Failed to parse skills.json: ${err.message}`,
        fixable: false,
      });
    }
  }

  // Check 3: Skill Bridge between ~/.agents/skills and ~/.gemini/config/skills
  const agentsSkillsExists = await fileExists(env.agentsSkillsDir);
  if (agentsSkillsExists) {
    const isBridged = await isSymlinkTo(env.geminiSkillsDir, env.agentsSkillsDir);
    if (isBridged) {
      checks.push({
        id: 'skill-bridge',
        title: 'Cross-Agent Skill Bridge',
        status: 'pass',
        message: 'Global skills from ~/.agents/skills are properly bridged to Antigravity.',
        fixable: false,
      });
    } else {
      const geminiSkillsExists = await fileExists(env.geminiSkillsDir);
      checks.push({
        id: 'skill-bridge',
        title: 'Cross-Agent Skill Bridge',
        status: 'warn',
        message: geminiSkillsExists
          ? 'Directory ~/.gemini/config/skills exists but is not linked to ~/.agents/skills.'
          : 'External skills found in ~/.agents/skills but not linked to Antigravity.',
        fixable: true,
        remedy: 'Run `agy-skills bridge` to create a symbolic bridge.',
      });
    }
  } else {
    checks.push({
      id: 'skill-bridge',
      title: 'Cross-Agent Skill Bridge',
      status: 'pass',
      message: 'No external ~/.agents/skills directory detected.',
      fixable: false,
    });
  }

  // Check 4: Plugins Structure & Compatibility
  const pluginsDirExists = await fileExists(env.geminiPluginsDir);
  if (pluginsDirExists) {
    try {
      const plugins = await fs.readdir(env.geminiPluginsDir, { withFileTypes: true });
      let hasPluginIssues = false;

      for (const plugin of plugins) {
        if (!plugin.isDirectory()) continue;
        const pluginPath = path.join(env.geminiPluginsDir, plugin.name);
        const pluginSkillsDir = path.join(pluginPath, 'skills');
        const pluginJsonPath = path.join(pluginPath, 'plugin.json');
        const pluginAgentsMd = path.join(pluginPath, 'AGENTS.md');
        const pluginRulesAgentsMd = path.join(pluginPath, 'rules', 'AGENTS.md');

        // Check for orphaned bundles
        const hasPluginJson = await fileExists(pluginJsonPath);
        const hasSkillsDir = await fileExists(pluginSkillsDir);
        if (!hasPluginJson && !hasSkillsDir) {
          checks.push({
            id: `plugin-${plugin.name}-orphaned`,
            title: `Orphaned Plugin '${plugin.name}'`,
            status: 'warn',
            message: `Plugin directory '${plugin.name}' lacks plugin.json and contains no skills.`,
            fixable: false,
            remedy: `Remove unused folder: rm -rf ${pluginPath}`,
          });
          hasPluginIssues = true;
          continue;
        }

        // Check multi-tier flattening
        if (hasSkillsDir) {
          const nestedSkills = await findNestedSkills(pluginSkillsDir);
          for (const item of nestedSkills) {
            const flatLink = path.join(pluginSkillsDir, item.skillName);
            if (!(await fileExists(flatLink))) {
              hasPluginIssues = true;
              checks.push({
                id: `plugin-${plugin.name}-unflattened`,
                title: `Plugin '${plugin.name}' Directory Flattening`,
                status: 'warn',
                message: `Nested skill '${item.categoryName}/${item.skillName}' is not flattened at root skills/. Antigravity cannot discover it.`,
                fixable: true,
                remedy: `Run \`agy-skills install ${plugin.name}\` or adapt the directory structure.`,
              });
              break;
            }
          }
        }

        // Only warn about root AGENTS.md if rules/AGENTS.md does NOT exist
        if ((await fileExists(pluginAgentsMd)) && !(await fileExists(pluginRulesAgentsMd))) {
          hasPluginIssues = true;
          checks.push({
            id: `plugin-${plugin.name}-rule-location`,
            title: `Plugin '${plugin.name}' Rule Location`,
            status: 'warn',
            message: `Root AGENTS.md will not be loaded by Antigravity unless duplicated to rules/AGENTS.md.`,
            fixable: true,
            remedy: 'Copy AGENTS.md to rules/AGENTS.md.',
          });
        }
      }

      if (!hasPluginIssues) {
        checks.push({
          id: 'plugins-structure',
          title: 'Installed Plugins Compatibility',
          status: 'pass',
          message: 'All installed Antigravity plugins conform to discovery standards.',
          fixable: false,
        });
      }
    } catch {
      // Ignore directory read errors
    }
  }

  const ok = !checks.some((c) => c.status === 'fail');
  return { ok, checks };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines: string[] = [];
  lines.push('\n🩺 Antigravity Skills Health Check\n');

  for (const check of report.checks) {
    let icon = '✔';
    if (check.status === 'fail') icon = '✖';
    else if (check.status === 'warn') icon = '⚠';

    lines.push(`  ${icon} [${check.status.toUpperCase()}] ${check.title}`);
    lines.push(`    ${check.message}`);
    if (check.remedy && check.status !== 'pass') {
      lines.push(`    💡 Fix: ${check.remedy}`);
    }
    lines.push('');
  }

  if (report.ok) {
    const hasWarnings = report.checks.some((c) => c.status === 'warn');
    if (hasWarnings) {
      lines.push('Result: All critical checks passed with non-blocking warnings.');
    } else {
      lines.push('Result: All checks passed! Your Antigravity skills environment is healthy.');
    }
  } else {
    lines.push('Result: Critical issues detected that prevent Antigravity from loading skills.');
    lines.push('Run `agy-skills fix` to resolve automatic fixes.');
  }

  return lines.join('\n');
}
