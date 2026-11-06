import os from 'node:os';
import path from 'node:path';

export interface Environment {
  homeDir: string;
  geminiDir: string;
  geminiConfigDir: string;
  skillsJsonPath: string;
  geminiSkillsDir: string;
  geminiPluginsDir: string;
  agentsSkillsDir: string;
}

export function getEnvironment(overrideHomeDir?: string): Environment {
  const homeDir = overrideHomeDir ? path.resolve(overrideHomeDir) : os.homedir();
  const geminiDir = path.join(homeDir, '.gemini');
  const geminiConfigDir = path.join(geminiDir, 'config');

  return {
    homeDir,
    geminiDir,
    geminiConfigDir,
    skillsJsonPath: path.join(geminiConfigDir, 'skills.json'),
    geminiSkillsDir: path.join(geminiConfigDir, 'skills'),
    geminiPluginsDir: path.join(geminiConfigDir, 'plugins'),
    agentsSkillsDir: path.join(homeDir, '.agents', 'skills'),
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
