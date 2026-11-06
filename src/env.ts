import os from 'node:os';
import path from 'node:path';

export interface Environment {
  homeDir: string;
  geminiDir: string;
  customizationRoot: string;
  skillManifestPath: string;
  geminiSkillsDir: string;
  geminiPluginsDir: string;
  agentsSkillsDir: string;
  // Aliases for compatibility
  geminiConfigDir: string;
  skillsJsonPath: string;
}

export function getEnvironment(overrideHomeDir?: string): Environment {
  const homeDir = overrideHomeDir ? path.resolve(overrideHomeDir) : os.homedir();
  const geminiDir = path.join(homeDir, '.gemini');
  const customizationRoot = path.join(geminiDir, 'config');
  const skillManifestPath = path.join(customizationRoot, 'skills.json');

  return {
    homeDir,
    geminiDir,
    customizationRoot,
    skillManifestPath,
    geminiSkillsDir: path.join(customizationRoot, 'skills'),
    geminiPluginsDir: path.join(customizationRoot, 'plugins'),
    agentsSkillsDir: path.join(homeDir, '.agents', 'skills'),
    // Aliases
    geminiConfigDir: customizationRoot,
    skillsJsonPath: skillManifestPath,
  };
}

export function expandTilde(targetPath: string, homeDir: string): string {
  if (targetPath === '~') {
    return homeDir;
  }
  if (targetPath.startsWith('~/') || targetPath.startsWith('~\\')) {
    return path.join(homeDir, targetPath.slice(2));
  }
  return targetPath;
}
