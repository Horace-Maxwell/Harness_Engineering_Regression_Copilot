import { readFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import type { RunReport } from "../core/types.js";
import { applyGlobalOptions, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { findWorkspaceRoot, listReportFiles, readConfig } from "../lib/fs.js";
import { blank, bullet, section } from "../lib/output.js";
import { validateConfig, validateRunReport } from "../lib/validate.js";

function renderSummary(report: RunReport): string[] {
  const lines: string[] = [];
  const failures = report.results.filter((result) => result.status === "failed");
  const invalid = report.results.filter((result) => result.status === "invalid");
  const skipped = report.results.filter((result) => result.status === "skipped");

  lines.push(`Report: ${report.id}`);
  lines.push(`Profile: ${report.profile}`);
  lines.push(`Totals: ${report.totals.total} total, ${report.totals.passed} passed, ${report.totals.failed} failed, ${report.totals.skipped} skipped, ${report.totals.invalid} invalid`);
  if (failures.length > 0) {
    lines.push("Failures:");
    for (const result of failures) {
      lines.push(`- ${result.caseId}: ${result.message}`);
    }
  }
  if (invalid.length > 0) {
    lines.push("Invalid:");
    for (const result of invalid) {
      lines.push(`- ${result.caseId}: ${result.message}`);
    }
  }
  if (skipped.length > 0) {
    lines.push("Skipped:");
    for (const result of skipped) {
      lines.push(`- ${result.caseId}: ${result.message}`);
    }
  }

  return lines;
}

export function createReportCommand(): Command {
  return withGlobalOptions(new Command("report"))
    .description("Show the latest markdown, summary, or json report.")
    .option("--format <format>", "Output format: summary, markdown, or json", "summary")
    .option("--id <reportId>", "Specific report id without file extension")
    .action(async (options: { format: "summary" | "markdown" | "json"; id?: string; json?: boolean; quiet?: boolean; noColor?: boolean }) => {
      applyGlobalOptions(options);
      const projectRoot = await findWorkspaceRoot();
      if (!projectRoot) {
        section("Workspace is not initialized yet. Run `herc init` first.");
        return;
      }

      const config = await readConfig(projectRoot);
      validateConfig(config);

      const reportFiles = await listReportFiles(projectRoot, config);
      const extension = options.format === "markdown" ? ".md" : ".json";
      const filteredFiles = reportFiles.filter((file) => file.endsWith(extension));
      const targetFiles = options.id
        ? filteredFiles.filter((file) => path.basename(file, extension) === options.id)
        : filteredFiles.sort().reverse();

      if (targetFiles.length === 0) {
        section("No report found. Run `herc run` first.");
        return;
      }

      const targetReport = targetFiles[0];
      const raw = await readFile(targetReport, "utf8");

      if (options.format === "markdown") {
        if (printJsonIfNeeded({ format: "markdown", path: targetReport, content: raw }, options)) {
          return;
        }
        section("Report");
        blank();
        bullet(`Format: markdown`);
        bullet(`Path: ${path.basename(targetReport)}`);
        blank();
        console.log(raw);
        return;
      }

      const report = JSON.parse(raw) as RunReport;
      validateRunReport(report);

      if (printJsonIfNeeded({ format: options.format, path: targetReport, report }, options) || options.format === "json") {
        if (!options.json) {
          console.log(JSON.stringify(report, null, 2));
        }
        return;
      }

      section("Report summary");
      blank();
      bullet(`Path: ${path.basename(targetReport)}`);
      blank();
      for (const line of renderSummary(report)) {
        console.log(line);
      }
    });
}
