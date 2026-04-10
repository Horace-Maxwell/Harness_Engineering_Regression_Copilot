import path from "node:path";

import { Command } from "commander";

import {
  createDefaultConfig,
  exists,
  findWorkspaceRoot,
  getAircRoot,
  getCasesDir,
  getConfigPath,
  getResponsesDir,
  initializeWorkspace,
  readConfig,
  writeConfig,
  writeTextFile,
} from "../lib/fs.js";
import { applyGlobalOptions, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { CliError } from "../lib/errors.js";
import { blank, bullet, nextStep, section } from "../lib/output.js";

export function createInitCommand(): Command {
  return withGlobalOptions(new Command("init"))
    .description("Initialize AI Regression Copilot in the current repository.")
    .option("--project-name <name>", "Override the default project name")
    .option("--force", "Rewrite config and sample assets even if the workspace already exists")
    .option("--dry-run", "Show what would be created without writing files")
    .action(async (options: { projectName?: string; force?: boolean; dryRun?: boolean; json?: boolean; quiet?: boolean; noColor?: boolean }) => {
      applyGlobalOptions(options);
      const existingWorkspaceRoot = await findWorkspaceRoot();
      const projectRoot = existingWorkspaceRoot ?? process.cwd();
      const aircRoot = getAircRoot(projectRoot);
      const configPath = getConfigPath(projectRoot);
      const alreadyInitialized = await exists(configPath);

      if (alreadyInitialized && existingWorkspaceRoot && existingWorkspaceRoot !== process.cwd() && !options.force) {
        throw new CliError("A workspace already exists above the current directory.", {
          fix: "Run `airc init --force` here, or run commands from the existing workspace root instead.",
          next: "airc doctor",
        });
      }

      const existingConfig = alreadyInitialized ? await readConfig(projectRoot) : null;
      const projectName = options.projectName ?? existingConfig?.projectName ?? path.basename(projectRoot);
      const config = alreadyInitialized && !options.force ? existingConfig! : createDefaultConfig(projectName);
      config.projectName = projectName;

      const sampleCasePath = path.join(getCasesDir(projectRoot, config), "sample_case.yaml");
      const sampleCase = `id: sample_case
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
  generatedBy: airc_init
  reviewStatus: reviewed
  confidence: high
  reviewedBy: airc
  reviewNote: Sample case created during initialization.
`;
      const sampleResponsePath = path.join(getResponsesDir(projectRoot, config), "sample_case.txt");

      const payload = {
        projectRoot,
        workspace: aircRoot,
        configPath,
        sampleCasePath,
        sampleResponsePath,
        alreadyInitialized,
        dryRun: options.dryRun === true,
      };
      if (printJsonIfNeeded(payload, options)) {
        return;
      }

      if (options.dryRun) {
        section("Dry run");
        blank();
        bullet(`Workspace: ${aircRoot}`);
        bullet(`Config: ${configPath}`);
        bullet(`Sample case: ${sampleCasePath}`);
        bullet(`Sample response: ${sampleResponsePath}`);
        blank();
        nextStep(options.force ? "airc init --force" : "airc init");
        return;
      }

      await initializeWorkspace(projectRoot, config);
      if (!alreadyInitialized || options.force || options.projectName) {
        await writeConfig(config, projectRoot);
      }
      if (options.force || !(await exists(sampleCasePath))) {
        await writeTextFile(sampleCasePath, sampleCase);
      }
      if (options.force || !(await exists(sampleResponsePath))) {
        await writeTextFile(sampleResponsePath, "example");
      }

      section(alreadyInitialized ? "Initialized AI Regression Copilot workspace without overwriting existing assets." : "Initialized AI Regression Copilot.");
      blank();
      bullet(`Workspace: ${aircRoot}`);
      bullet(`Config: ${configPath}`);
      bullet(`Sample case: ${sampleCasePath}`);
      bullet(`Sample response: ${sampleResponsePath}`);
      blank();
      nextStep("airc run");
    });
}
