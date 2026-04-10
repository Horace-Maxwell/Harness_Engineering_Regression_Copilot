import path from "node:path";

import type { HercConfig } from "../core/types.js";
import {
  createDefaultConfig,
  ensureGitignoreEntries,
  exists,
  getCasesDir,
  getConfigPath,
  getHercRoot,
  getResponsesDir,
  initializeWorkspace,
  readConfig,
  writeConfig,
  writeTextFile,
} from "./fs.js";

const recommendedGitignoreEntries = [".herc/incidents", ".herc/reports", ".herc/responses"];

function sampleCaseContents(): string {
  return `id: sample_case
title: Sample case
status: active
taskType: chat
createdFrom: manual
updatedAt: ${new Date().toISOString()}
priority: low
tags:
  - sample
expectedBehavior:
  summary: Replace this sample with a real failure-derived case.
check:
  type: contains
  config:
    value: example
notes:
  generatedBy: herc_init
  reviewStatus: reviewed
  confidence: high
  reviewedBy: herc
  reviewNote: Sample case created during initialization.
`;
}

export interface BootstrapWorkspaceOptions {
  projectName?: string;
  force?: boolean;
  syncGitignore?: boolean;
  ensureSampleAssets?: boolean;
}

export interface BootstrapWorkspaceResult {
  projectRoot: string;
  workspaceRoot: string;
  configPath: string;
  sampleCasePath: string;
  sampleResponsePath: string;
  projectName: string;
  alreadyInitialized: boolean;
  configWritten: boolean;
  sampleCaseWritten: boolean;
  sampleResponseWritten: boolean;
  gitignore: { updated: boolean; added: string[]; path: string } | null;
}

export async function bootstrapWorkspace(
  projectRoot: string,
  options: BootstrapWorkspaceOptions = {},
): Promise<BootstrapWorkspaceResult> {
  const hercRoot = getHercRoot(projectRoot);
  const configPath = getConfigPath(projectRoot);
  const alreadyInitialized = await exists(configPath);
  const existingConfig = alreadyInitialized ? await readConfig(projectRoot) : null;
  const projectName = options.projectName ?? existingConfig?.projectName ?? path.basename(projectRoot);
  const config: HercConfig = alreadyInitialized && !options.force ? existingConfig! : createDefaultConfig(projectName);
  config.projectName = projectName;

  await initializeWorkspace(projectRoot, config);

  let configWritten = false;
  if (!alreadyInitialized || options.force || options.projectName) {
    await writeConfig(config, projectRoot);
    configWritten = true;
  }

  const sampleCasePath = path.join(getCasesDir(projectRoot, config), "sample_case.yaml");
  const sampleResponsePath = path.join(getResponsesDir(projectRoot, config), "sample_case.txt");

  let sampleCaseWritten = false;
  let sampleResponseWritten = false;
  if (options.ensureSampleAssets !== false) {
    if (options.force || !(await exists(sampleCasePath))) {
      await writeTextFile(sampleCasePath, sampleCaseContents());
      sampleCaseWritten = true;
    }
    if (options.force || !(await exists(sampleResponsePath))) {
      await writeTextFile(sampleResponsePath, "example");
      sampleResponseWritten = true;
    }
  }

  const gitignore = options.syncGitignore === false
    ? null
    : await ensureGitignoreEntries(projectRoot, recommendedGitignoreEntries);

  return {
    projectRoot,
    workspaceRoot: hercRoot,
    configPath,
    sampleCasePath,
    sampleResponsePath,
    projectName,
    alreadyInitialized,
    configWritten,
    sampleCaseWritten,
    sampleResponseWritten,
    gitignore,
  };
}

export function getRecommendedGitignoreEntries(): string[] {
  return [...recommendedGitignoreEntries];
}
