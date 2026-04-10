import { access, constants, readFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import { bootstrapWorkspace } from "../lib/bootstrap.js";
import { applyGlobalOptions, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { findWorkspaceRoot, getCasesDir, getConfigPath, getIncidentsDir, getReportsDir, getResponsesDir, loadCaseRecords, loadIncidentRecords, readConfig } from "../lib/fs.js";
import { isGitAvailable, isGitRepository } from "../lib/git.js";
import { blank, bullet, section } from "../lib/output.js";
import { validateCaseRecord, validateConfig, validateIncidentRecord } from "../lib/validate.js";

interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

interface AppliedFix {
  kind: "bootstrap" | "workspace_dirs" | "gitignore";
  message: string;
}

async function checkWritable(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function directoryCheck(targetPath: string): Promise<DoctorCheck> {
  if (await checkWritable(targetPath)) {
    return {
      name: `dir:${path.basename(targetPath)}`,
      status: "pass",
      message: `${targetPath} is writable.`,
    };
  }

  const parentPath = path.dirname(targetPath);
  if (await checkWritable(parentPath)) {
    return {
      name: `dir:${path.basename(targetPath)}`,
      status: "pass",
      message: `${targetPath} does not exist yet, but it can be created on demand.`,
    };
  }

  return {
    name: `dir:${path.basename(targetPath)}`,
    status: "warn",
    message: `${targetPath} is not writable yet or its parent directory is blocked.`,
  };
}

async function gitignoreCheck(projectRoot: string): Promise<DoctorCheck> {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  const recommended = [".herc/incidents", ".herc/reports", ".herc/responses"];

  try {
    const raw = await readFile(gitignorePath, "utf8");
    const lines = new Set(raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
    const missing = recommended.filter((entry) => !lines.has(entry));
    if (missing.length === 0) {
      return {
        name: "gitignore",
        status: "pass",
        message: "Recommended .herc ignore rules are present.",
      };
    }

    return {
      name: "gitignore",
      status: "warn",
      message: `Missing recommended ignore rules: ${missing.join(", ")}.`,
    };
  } catch {
    return {
      name: "gitignore",
      status: "warn",
      message: "No .gitignore file was found. Local incidents, reports, and responses may be committed accidentally.",
    };
  }
}

export function createDoctorCommand(): Command {
  return withGlobalOptions(new Command("doctor"))
    .description("Check workspace health, schema validity, and local execution readiness.")
    .option("--strict", "Exit non-zero on warnings as well as failures")
    .option("--quick", "Skip full case and incident validation for a faster preflight check")
    .option("--fix", "Repair a missing workspace, recreate required directories, and sync recommended ignore rules")
    .action(async (options: { strict?: boolean; quick?: boolean; fix?: boolean; json?: boolean; quiet?: boolean; noColor?: boolean }) => {
      applyGlobalOptions(options);
      const checks: DoctorCheck[] = [];
      const fixesApplied: AppliedFix[] = [];
      const majorVersion = Number.parseInt(process.version.replace(/^v/, "").split(".")[0], 10);
      checks.push({
        name: "node",
        status: majorVersion >= 18 ? "pass" : "fail",
        message: majorVersion >= 18 ? `Node ${process.version} is supported.` : `Node ${process.version} is too old. Node 18+ is required.`,
      });
      const gitAvailable = await isGitAvailable(process.cwd());
      checks.push({
        name: "git",
        status: gitAvailable ? "pass" : "warn",
        message: gitAvailable
          ? "Git is available. Changed-only runs and repo-aware workflows can be used."
          : "Git was not found. `herc run --changed` and repo-aware workflows will fall back or be unavailable.",
      });

      let projectRoot = await findWorkspaceRoot();
      if (!projectRoot && options.fix) {
        const bootstrap = await bootstrapWorkspace(process.cwd(), {
          syncGitignore: true,
          ensureSampleAssets: true,
        });
        fixesApplied.push({
          kind: "bootstrap",
          message: `Initialized a new workspace at ${bootstrap.projectRoot}.`,
        });
        if (bootstrap.gitignore?.updated) {
          fixesApplied.push({
            kind: "gitignore",
            message: `Added recommended ignore rules to ${bootstrap.gitignore.path}.`,
          });
        }
        projectRoot = bootstrap.projectRoot;
      }

      if (!projectRoot) {
        checks.push({
          name: "workspace",
          status: "fail",
          message: "No .herc/config.yaml workspace was found from the current directory upward.",
        });
      } else {
        checks.push({
          name: "workspace",
          status: "pass",
          message: `Workspace found at ${projectRoot}.`,
        });
        if (gitAvailable) {
          const gitRepo = await isGitRepository(projectRoot);
          checks.push({
            name: "git-repo",
            status: gitRepo ? "pass" : "warn",
            message: gitRepo
              ? "Git repository detected. Changed-only runs can use repository diffs."
              : "This workspace is not inside a git repository. `herc run --changed` will not provide repository-scoped filtering.",
          });
        }

        const configPath = getConfigPath(projectRoot);
        try {
          const config = await readConfig(projectRoot);
          validateConfig(config);
          checks.push({
            name: "config",
            status: "pass",
            message: `Config is valid at ${configPath}.`,
          });

          if (options.fix) {
            const bootstrap = await bootstrapWorkspace(projectRoot, {
              projectName: config.projectName,
              syncGitignore: true,
              ensureSampleAssets: false,
            });
            fixesApplied.push({
              kind: "workspace_dirs",
              message: `Ensured required .herc directories exist under ${bootstrap.workspaceRoot}.`,
            });
            if (bootstrap.gitignore?.updated) {
              fixesApplied.push({
                kind: "gitignore",
                message: `Added recommended ignore rules to ${bootstrap.gitignore.path}.`,
              });
            }
          }

          checks.push(await gitignoreCheck(projectRoot));

          const dirs = [
            ["cases", getCasesDir(projectRoot, config)],
            ["incidents", getIncidentsDir(projectRoot, config)],
            ["reports", getReportsDir(projectRoot, config)],
            ["responses", getResponsesDir(projectRoot, config)],
          ] as const;

          for (const [, dirPath] of dirs) {
            checks.push(await directoryCheck(dirPath));
          }

          if (options.quick) {
            checks.push({
              name: "schema",
              status: "pass",
              message: "Quick mode skipped full case and incident validation.",
            });
          } else {
            const cases = await loadCaseRecords(projectRoot, config);
            const incidents = await loadIncidentRecords(projectRoot, config);
            cases.forEach((record) => validateCaseRecord(record));
            incidents.forEach((record) => validateIncidentRecord(record));
            checks.push({
              name: "schema",
              status: "pass",
              message: `Validated ${cases.length} case(s) and ${incidents.length} incident(s).`,
            });
          }
        } catch (error) {
          checks.push({
            name: "config",
            status: "fail",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const payload = {
        workspaceRoot: projectRoot,
        checks,
        fixesApplied,
        ready: checks.every((check) => check.status !== "fail"),
        next: checks.some((check) => check.status === "fail")
          ? "herc doctor --fix"
          : "herc run",
      };
      if (printJsonIfNeeded(payload, options)) {
        return;
      }

      section("Doctor");
      blank();
      if (fixesApplied.length > 0) {
        section("Applied fixes");
        blank();
        for (const fix of fixesApplied) {
          bullet(fix.message);
        }
        blank();
      }
      for (const check of checks) {
        bullet(`[${check.status}] ${check.name}: ${check.message}`);
      }

      const hasFailure = checks.some((check) => check.status === "fail");
      const hasWarning = checks.some((check) => check.status === "warn");
      if (hasFailure || (options.strict && hasWarning)) {
        process.exitCode = 1;
      }
    });
}
