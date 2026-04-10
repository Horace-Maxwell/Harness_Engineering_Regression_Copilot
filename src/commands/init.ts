import path from "node:path";

import { Command } from "commander";

import {
  createDefaultConfig,
  ensureGitignoreEntries,
  exists,
  findWorkspaceRoot,
  getHercRoot,
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
    .description("Initialize Harness_Engineering_Regression_Copilot in the current repository.")
    .option("--project-name <name>", "Override the default project name")
    .option("--force", "Rewrite config and sample assets even if the workspace already exists")
    .option("--dry-run", "Show what would be created without writing files")
    .option("--no-sync-gitignore", "Do not add recommended .herc ignore rules to .gitignore")
    .action(async (options: { projectName?: string; force?: boolean; dryRun?: boolean; syncGitignore?: boolean; json?: boolean; quiet?: boolean; noColor?: boolean }) => {
      applyGlobalOptions(options);
      const existingWorkspaceRoot = await findWorkspaceRoot();
      const projectRoot = existingWorkspaceRoot ?? process.cwd();
      const hercRoot = getHercRoot(projectRoot);
      const configPath = getConfigPath(projectRoot);
      const alreadyInitialized = await exists(configPath);

      if (alreadyInitialized && existingWorkspaceRoot && existingWorkspaceRoot !== process.cwd() && !options.force) {
        throw new CliError("A workspace already exists above the current directory.", {
          fix: "Run `herc init --force` here, or run commands from the existing workspace root instead.",
          next: "herc doctor",
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
  generatedBy: herc_init
  reviewStatus: reviewed
  confidence: high
  reviewedBy: herc
  reviewNote: Sample case created during initialization.
`;
      const sampleResponsePath = path.join(getResponsesDir(projectRoot, config), "sample_case.txt");
      const recommendedGitignoreEntries = [".herc/incidents", ".herc/reports", ".herc/responses"];

      const payload = {
        projectRoot,
        workspace: hercRoot,
        configPath,
        sampleCasePath,
        sampleResponsePath,
        recommendedGitignoreEntries,
        alreadyInitialized,
        dryRun: options.dryRun === true,
      };
      if (printJsonIfNeeded(payload, options)) {
        return;
      }

      if (options.dryRun) {
        section("Dry run");
        blank();
        bullet(`Workspace: ${hercRoot}`);
        bullet(`Config: ${configPath}`);
        bullet(`Sample case: ${sampleCasePath}`);
        bullet(`Sample response: ${sampleResponsePath}`);
        if (options.syncGitignore !== false) {
          bullet(`Recommended .gitignore entries: ${recommendedGitignoreEntries.join(", ")}`);
        }
        blank();
        nextStep(options.force ? "herc init --force" : "herc init");
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
      const gitignoreUpdate = options.syncGitignore === false
        ? { updated: false, added: [] as string[], path: path.join(projectRoot, ".gitignore") }
        : await ensureGitignoreEntries(projectRoot, recommendedGitignoreEntries);

      section(
        alreadyInitialized
          ? "Initialized Harness_Engineering_Regression_Copilot workspace without overwriting existing assets."
          : "Initialized Harness_Engineering_Regression_Copilot.",
      );
      blank();
      bullet(`Workspace: ${hercRoot}`);
      bullet(`Config: ${configPath}`);
      bullet(`Sample case: ${sampleCasePath}`);
      bullet(`Sample response: ${sampleResponsePath}`);
      if (options.syncGitignore === false) {
        bullet("Gitignore sync: skipped");
      } else if (gitignoreUpdate.updated) {
        bullet(`Gitignore updated: ${gitignoreUpdate.added.join(", ")}`);
      } else {
        bullet("Gitignore updated: already configured");
      }
      blank();
      nextStep("herc run");
    });
}
