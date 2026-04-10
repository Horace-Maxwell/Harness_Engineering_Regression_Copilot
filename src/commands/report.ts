import { readFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import type { RunReport } from "../core/types.js";
import { applyGlobalOptions, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { findWorkspaceRoot, listReportFiles, readConfig } from "../lib/fs.js";
import { blank, bullet, section } from "../lib/output.js";
import { compareReports, type ReportComparison } from "../lib/report.js";
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

function formatDelta(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function renderComparisonSummary(comparison: ReportComparison): string[] {
  const lines: string[] = [];
  lines.push(`Compared to: ${comparison.previousId}`);
  lines.push(`Changed cases: ${comparison.changedCases}`);
  lines.push(
    `Delta totals: ${formatDelta(comparison.totalsDelta.total)} total, ${formatDelta(comparison.totalsDelta.passed)} passed, ${formatDelta(comparison.totalsDelta.failed)} failed, ${formatDelta(comparison.totalsDelta.skipped)} skipped, ${formatDelta(comparison.totalsDelta.invalid)} invalid`,
  );

  if (comparison.regressions.length > 0) {
    lines.push("Regressions:");
    for (const regression of comparison.regressions) {
      lines.push(`- ${regression.caseId}: ${regression.from} -> ${regression.to}`);
    }
  }

  if (comparison.improvements.length > 0) {
    lines.push("Improvements:");
    for (const improvement of comparison.improvements) {
      lines.push(`- ${improvement.caseId}: ${improvement.from} -> ${improvement.to}`);
    }
  }

  if (comparison.newlyFailing.length > 0) {
    lines.push(`New blocking cases: ${comparison.newlyFailing.join(", ")}`);
  }
  if (comparison.resolved.length > 0) {
    lines.push(`Resolved cases: ${comparison.resolved.join(", ")}`);
  }

  return lines;
}

export function createReportCommand(): Command {
  return withGlobalOptions(new Command("report"))
    .description("Show the latest markdown, summary, or json report.")
    .option("--format <format>", "Output format: summary, markdown, or json", "summary")
    .option("--id <reportId>", "Specific report id without file extension")
    .option("--compare-previous", "Compare the selected report with the previous json report")
    .action(async (options: { format: "summary" | "markdown" | "json"; id?: string; comparePrevious?: boolean; json?: boolean; quiet?: boolean; noColor?: boolean }) => {
      applyGlobalOptions(options);
      const projectRoot = await findWorkspaceRoot();
      if (!projectRoot) {
        section("Workspace is not initialized yet. Run `herc init` first.");
        return;
      }

      const config = await readConfig(projectRoot);
      validateConfig(config);

      const reportFiles = await listReportFiles(projectRoot, config);
      const jsonFiles = reportFiles.filter((file) => file.endsWith(".json")).sort().reverse();
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
      let comparison: ReportComparison | null = null;

      if (options.comparePrevious) {
        const targetBaseName = path.basename(targetReport, extension);
        const targetJsonIndex = jsonFiles.findIndex((file) => path.basename(file, ".json") === targetBaseName);
        const previousJsonFile = targetJsonIndex >= 0 ? jsonFiles[targetJsonIndex + 1] : undefined;
        if (previousJsonFile) {
          const currentJsonFile = extension === ".json"
            ? targetReport
            : jsonFiles.find((file) => path.basename(file, ".json") === targetBaseName);
          if (currentJsonFile) {
            const currentReport = JSON.parse(await readFile(currentJsonFile, "utf8")) as RunReport;
            const previousReport = JSON.parse(await readFile(previousJsonFile, "utf8")) as RunReport;
            validateRunReport(currentReport);
            validateRunReport(previousReport);
            comparison = compareReports(currentReport, previousReport);
          }
        }
      }

      if (options.format === "markdown") {
        if (printJsonIfNeeded({ format: "markdown", path: targetReport, content: raw, comparison }, options)) {
          return;
        }
        section("Report");
        blank();
        bullet(`Format: markdown`);
        bullet(`Path: ${path.basename(targetReport)}`);
        if (comparison) {
          bullet(`Compared to: ${comparison.previousId}`);
        }
        blank();
        if (comparison) {
          for (const line of renderComparisonSummary(comparison)) {
            console.log(line);
          }
          blank();
        }
        console.log(raw);
        return;
      }

      const report = JSON.parse(raw) as RunReport;
      validateRunReport(report);

      if (printJsonIfNeeded({ format: options.format, path: targetReport, report, comparison }, options) || options.format === "json") {
        if (!options.json) {
          console.log(JSON.stringify(comparison ? { report, comparison } : report, null, 2));
        }
        return;
      }

      section("Report summary");
      blank();
      bullet(`Path: ${path.basename(targetReport)}`);
      if (comparison) {
        bullet(`Compared to: ${comparison.previousId}`);
      }
      blank();
      for (const line of renderSummary(report)) {
        console.log(line);
      }
      if (comparison) {
        blank();
        for (const line of renderComparisonSummary(comparison)) {
          console.log(line);
        }
      }
    });
}
