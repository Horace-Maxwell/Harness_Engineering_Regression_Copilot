import path from "node:path";

import { Command } from "commander";

import {
  exists,
  findWorkspaceRoot,
  readConfig,
} from "../lib/fs.js";
import { bootstrapWorkspace, getRecommendedGitignoreEntries } from "../lib/bootstrap.js";
import { getConfigPath, getHercRoot } from "../lib/fs.js";
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
      const recommendedGitignoreEntries = getRecommendedGitignoreEntries();

      const payload = {
        projectRoot,
        workspace: hercRoot,
        configPath,
        sampleCasePath: path.join(hercRoot, "cases", "sample_case.yaml"),
        sampleResponsePath: path.join(hercRoot, "responses", "sample_case.txt"),
        recommendedGitignoreEntries,
        alreadyInitialized,
        dryRun: options.dryRun === true,
        next: "herc doctor --quick",
      };
      if (printJsonIfNeeded(payload, options)) {
        return;
      }

      if (options.dryRun) {
        section("Dry run");
        blank();
        bullet(`Workspace: ${hercRoot}`);
        bullet(`Config: ${configPath}`);
        bullet(`Sample case: ${payload.sampleCasePath}`);
        bullet(`Sample response: ${payload.sampleResponsePath}`);
        if (options.syncGitignore !== false) {
          bullet(`Recommended .gitignore entries: ${recommendedGitignoreEntries.join(", ")}`);
        }
        blank();
        nextStep(options.force ? "herc init --force" : "herc init");
        return;
      }

      const bootstrap = await bootstrapWorkspace(projectRoot, {
        projectName,
        force: options.force,
        syncGitignore: options.syncGitignore,
        ensureSampleAssets: true,
      });

      section(
        alreadyInitialized
          ? "Initialized Harness_Engineering_Regression_Copilot workspace without overwriting existing assets."
          : "Initialized Harness_Engineering_Regression_Copilot.",
      );
      blank();
      bullet(`Workspace: ${bootstrap.workspaceRoot}`);
      bullet(`Config: ${bootstrap.configPath}`);
      bullet(`Sample case: ${bootstrap.sampleCasePath}`);
      bullet(`Sample response: ${bootstrap.sampleResponsePath}`);
      if (options.syncGitignore === false) {
        bullet("Gitignore sync: skipped");
      } else if (bootstrap.gitignore?.updated) {
        bullet(`Gitignore updated: ${bootstrap.gitignore.added.join(", ")}`);
      } else {
        bullet("Gitignore updated: already configured");
      }
      blank();
      nextStep("herc doctor --quick");
    });
}
