import path from "node:path";

import { Command } from "commander";
import YAML from "yaml";

import type { CaseRecord, RunReport } from "../core/types.js";
import { applyGlobalOptions, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { CliError } from "../lib/errors.js";
import { findWorkspaceRoot, getCasesDir, listReportFiles, readConfig } from "../lib/fs.js";
import { validateCaseRecord, validateConfig, validateRunReport } from "../lib/validate.js";

async function findLatestResultForCase(projectRoot: string, caseId: string): Promise<RunReport["results"][number] | null> {
  const config = await readConfig(projectRoot);
  const reportFiles = (await listReportFiles(projectRoot, config))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();

  for (const reportPath of reportFiles) {
    const reportModule = await import("node:fs/promises");
    const raw = await reportModule.readFile(reportPath, "utf8");
    const parsed = JSON.parse(raw) as RunReport;
    validateRunReport(parsed);
    const match = parsed.results.find((result) => result.caseId === caseId);
    if (match) {
      return match;
    }
  }

  return null;
}

export function createInspectCommand(): Command {
  return withGlobalOptions(new Command("inspect"))
    .description("Inspect a generated case file.")
    .argument("<id>", "Case id, such as case_001")
    .option("--raw", "Print the raw YAML file")
    .option("--summary", "Print the structured summary view")
    .action(async (id: string, options: { raw?: boolean; summary?: boolean; json?: boolean; quiet?: boolean; noColor?: boolean }) => {
      applyGlobalOptions(options);
      const projectRoot = await findWorkspaceRoot();
      if (!projectRoot) {
        throw new CliError("Workspace is not initialized yet.", {
          fix: "Run `airc init` first.",
        });
      }

      const config = await readConfig(projectRoot);
      validateConfig(config);
      const filePath = path.join(getCasesDir(projectRoot, config), `${id}.yaml`);
      const { readFile } = await import("node:fs/promises");
      const raw = await readFile(filePath, "utf8");
      const parsed = YAML.parse(raw) as CaseRecord;
      validateCaseRecord(parsed);
      const latestResult = await findLatestResultForCase(projectRoot, id);

      if (printJsonIfNeeded({ case: parsed, latestResult }, options)) {
        return;
      }

      if (options.raw) {
        console.log(raw);
        return;
      }

      console.log(`ID: ${parsed.id}`);
      console.log(`Title: ${parsed.title}`);
      console.log(`Status: ${parsed.status}`);
      console.log(`Task Type: ${parsed.taskType}`);
      console.log(`Priority: ${parsed.priority ?? "n/a"}`);
      console.log(`Review Status: ${parsed.notes.reviewStatus}`);
      if (parsed.notes.reviewedBy) {
        console.log(`Reviewed By: ${parsed.notes.reviewedBy}`);
      }
      if (parsed.notes.reviewNote) {
        console.log(`Review Note: ${parsed.notes.reviewNote}`);
      }
      if (parsed.tags?.length) {
        console.log(`Tags: ${parsed.tags.join(", ")}`);
      }
      if (parsed.incident) {
        console.log(`Incident Summary: ${parsed.incident.summary}`);
        console.log(`Failure Reason: ${parsed.incident.failureReason}`);
      }
      console.log(`Expected Behavior: ${parsed.expectedBehavior.summary}`);
      console.log(`Check Type: ${parsed.check.type}`);
      if (parsed.source?.rawInputRef) {
        console.log(`Raw Input Ref: ${parsed.source.rawInputRef}`);
      }
      if (latestResult) {
        console.log(`Latest Result: ${latestResult.status} (${latestResult.message})`);
      }
    });
}
