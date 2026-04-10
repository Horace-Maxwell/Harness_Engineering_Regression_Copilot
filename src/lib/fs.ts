import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";
import YAML from "yaml";

import {
  HERCDirName,
  casesDirName,
  configFileName,
  incidentsDirName,
  reportsDirName,
  responsesDirName,
} from "./constants.js";
import type { HercConfig, CaseRecord, IncidentRecord, RunReport } from "../core/types.js";

export function getProjectRoot(): string {
  return path.resolve(cwd());
}

export async function findWorkspaceRoot(startDir = getProjectRoot()): Promise<string | null> {
  let currentDir = path.resolve(startDir);

  while (true) {
    const configPath = path.join(currentDir, HERCDirName, configFileName);
    if (await exists(configPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

export async function resolveProjectRoot(startDir = getProjectRoot()): Promise<string> {
  return (await findWorkspaceRoot(startDir)) ?? path.resolve(startDir);
}

export function getHercRoot(projectRoot = getProjectRoot()): string {
  return path.join(projectRoot, HERCDirName);
}

export function getConfigPath(projectRoot = getProjectRoot()): string {
  return path.join(getHercRoot(projectRoot), configFileName);
}

function resolveConfiguredPath(projectRoot: string, configuredPath: string | undefined, fallbackRelativePath: string): string {
  const resolved = configuredPath ?? fallbackRelativePath;
  return path.isAbsolute(resolved) ? resolved : path.join(projectRoot, resolved);
}

export function getIncidentsDir(projectRoot = getProjectRoot(), config?: HercConfig): string {
  return resolveConfiguredPath(projectRoot, config?.incidentsDir, path.join(HERCDirName, incidentsDirName));
}

export function getCasesDir(projectRoot = getProjectRoot(), config?: HercConfig): string {
  return resolveConfiguredPath(projectRoot, config?.casesDir, path.join(HERCDirName, casesDirName));
}

export function getReportsDir(projectRoot = getProjectRoot(), config?: HercConfig): string {
  return resolveConfiguredPath(projectRoot, config?.reportsDir, path.join(HERCDirName, reportsDirName));
}

export function getResponsesDir(projectRoot = getProjectRoot(), config?: HercConfig): string {
  return resolveConfiguredPath(projectRoot, config?.responsesDir, path.join(HERCDirName, responsesDirName));
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function exists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function initializeWorkspace(projectRoot = getProjectRoot(), config?: HercConfig): Promise<void> {
  await ensureDirectory(getHercRoot(projectRoot));
  await ensureDirectory(getIncidentsDir(projectRoot, config));
  await ensureDirectory(getCasesDir(projectRoot, config));
  await ensureDirectory(getReportsDir(projectRoot, config));
  await ensureDirectory(getResponsesDir(projectRoot, config));
}

export function createDefaultConfig(projectName: string): HercConfig {
  return {
    version: 1,
    schemaVersion: 1,
    projectName,
    defaultProfile: "standard",
    casesDir: ".herc/cases",
    incidentsDir: ".herc/incidents",
    reportsDir: ".herc/reports",
    responsesDir: ".herc/responses",
  };
}

export async function writeConfig(config: HercConfig, projectRoot = getProjectRoot()): Promise<void> {
  const serialized = YAML.stringify(config);
  await writeFile(getConfigPath(projectRoot), serialized, "utf8");
}

export async function readConfig(projectRoot = getProjectRoot()): Promise<HercConfig> {
  const raw = await readFile(getConfigPath(projectRoot), "utf8");
  const parsed = YAML.parse(raw) as Partial<HercConfig>;
  const defaults = createDefaultConfig(parsed.projectName ?? path.basename(projectRoot));
  return {
    ...defaults,
    ...parsed,
  };
}

export async function listFiles(dirPath: string): Promise<string[]> {
  if (!(await exists(dirPath))) {
    return [];
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => path.join(dirPath, entry.name));
}

export async function writeTextFile(targetPath: string, contents: string): Promise<void> {
  await ensureDirectory(path.dirname(targetPath));
  await writeFile(targetPath, contents, "utf8");
}

export async function readYamlFile<T>(targetPath: string): Promise<T> {
  const raw = await readFile(targetPath, "utf8");
  return YAML.parse(raw) as T;
}

export async function writeYamlFile(targetPath: string, value: unknown): Promise<void> {
  await writeTextFile(targetPath, YAML.stringify(value));
}

export async function loadCaseRecords(projectRoot = getProjectRoot(), config?: HercConfig): Promise<CaseRecord[]> {
  const files = (await listFiles(getCasesDir(projectRoot, config))).filter((file) => file.endsWith(".yaml"));
  return Promise.all(files.map((file) => readYamlFile<CaseRecord>(file)));
}

export async function loadIncidentRecords(projectRoot = getProjectRoot(), config?: HercConfig): Promise<IncidentRecord[]> {
  const files = (await listFiles(getIncidentsDir(projectRoot, config))).filter((file) => file.endsWith(".yaml"));
  return Promise.all(files.map((file) => readYamlFile<IncidentRecord>(file)));
}

export async function writeRunReport(
  report: RunReport,
  markdown: string,
  projectRoot = getProjectRoot(),
  config?: HercConfig,
): Promise<{ jsonPath: string; markdownPath: string }> {
  const baseName = report.id;
  const jsonPath = path.join(getReportsDir(projectRoot, config), `${baseName}.json`);
  const markdownPath = path.join(getReportsDir(projectRoot, config), `${baseName}.md`);
  await writeTextFile(jsonPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownPath, markdown);
  return { jsonPath, markdownPath };
}

export async function listReportFiles(projectRoot = getProjectRoot(), config?: HercConfig): Promise<string[]> {
  return listFiles(getReportsDir(projectRoot, config));
}
