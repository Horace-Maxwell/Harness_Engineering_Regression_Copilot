import { Command } from "commander";
import { stdin } from "node:process";

import type { CaseRecord, RunProfile } from "../core/types.js";
import { applyGlobalOptions, parseCommaList, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { CliError } from "../lib/errors.js";
import { findWorkspaceRoot, getCasesDir, getResponsesDir, loadCaseRecords, readConfig, writeRunReport } from "../lib/fs.js";
import { getChangedCaseIds } from "../lib/git.js";
import { blank, bullet, nextStep, section } from "../lib/output.js";
import { runCases } from "../lib/run.js";
import { validateCaseRecord, validateConfig } from "../lib/validate.js";

async function readFromStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function normalizeFailOn(value: string | undefined, strictSkips: boolean | undefined): Array<"failed" | "invalid" | "skipped"> {
  const parsed = parseCommaList(value);
  const normalized = parsed.length > 0 ? parsed : ["failed", "invalid"];
  if (strictSkips && !normalized.includes("skipped")) {
    normalized.push("skipped");
  }

  const allowed = new Set(["failed", "invalid", "skipped"]);
  for (const item of normalized) {
    if (!allowed.has(item)) {
      throw new CliError(`Unsupported fail-on status '${item}'.`, {
        fix: "Use a comma-separated subset of failed, invalid, skipped.",
      });
    }
  }

  return normalized as Array<"failed" | "invalid" | "skipped">;
}

export function createRunCommand(): Command {
  return withGlobalOptions(new Command("run"))
    .description("Run regression cases against response files.")
    .argument("[caseId]", "Optional case id, such as case_001")
    .option("--profile <profile>", "Run profile: quick, standard, or deep")
    .option("--format <format>", "Output format: summary, markdown, or json", "summary")
    .option("--response <text>", "Use a direct response string when running a single case")
    .option("--response-file <file>", "Use a specific response file when running a single case")
    .option("--stdin-response", "Read the response from stdin when running a single case")
    .option("--strict-skips", "Exit non-zero when cases are skipped")
    .option("--fail-on <statuses>", "Comma-separated statuses that should fail the run: failed,invalid,skipped")
    .option("--changed", "Prefer changed cases only")
    .action(
      async (
        caseId: string | undefined,
        options: {
          profile?: RunProfile;
          format?: "summary" | "markdown" | "json";
          changed?: boolean;
          response?: string;
          responseFile?: string;
          stdinResponse?: boolean;
          strictSkips?: boolean;
          failOn?: string;
          json?: boolean;
          quiet?: boolean;
          noColor?: boolean;
        },
      ) => {
        applyGlobalOptions(options);
        const projectRoot = await findWorkspaceRoot();
        if (!projectRoot) {
          throw new CliError("Workspace is not initialized yet.", {
            fix: "Run `airc init` first.",
            next: "airc init",
          });
        }

        const directResponseOptions = [options.response !== undefined, options.responseFile !== undefined, options.stdinResponse === true].filter(Boolean).length;
        if (directResponseOptions > 1) {
          throw new CliError("Use only one direct response input source.", {
            fix: "Choose one of `--response`, `--response-file`, or `--stdin-response`.",
          });
        }
        if ((options.response || options.responseFile || options.stdinResponse) && !caseId) {
          throw new CliError("Direct response input options require a specific case id.", {
            fix: "Pass a case id such as `airc run case_001 --response \"...\"`.",
          });
        }

        const config = await readConfig(projectRoot);
        validateConfig(config);

        const profile = options.profile ?? config.defaultProfile;
        const cases = await loadCaseRecords(projectRoot, config);
        cases.forEach((record: CaseRecord) => validateCaseRecord(record));

        if (caseId && !cases.some((record) => record.id === caseId)) {
          throw new CliError(`Case '${caseId}' was not found.`, {
            fix: "Run `airc list` to see available case ids.",
          });
        }

        const changedCaseIds = options.changed
          ? await getChangedCaseIds(projectRoot, getCasesDir(projectRoot, config))
          : null;
        const responseOverrideText = options.stdinResponse ? await readFromStdin() : options.response;
        const failOn = normalizeFailOn(options.failOn, options.strictSkips);

        const { report, markdown } = await runCases(cases, profile, projectRoot, {
          filterCaseId: caseId,
          responseOverridePath: options.responseFile,
          responseOverrideText,
          changedCaseIds: changedCaseIds ? new Set(changedCaseIds) : undefined,
          responsesDir: getResponsesDir(projectRoot, config),
        });
        const { jsonPath, markdownPath } = await writeRunReport(report, markdown, projectRoot, config);
        const failingResults = report.results.filter((result) => failOn.includes(result.status as "failed" | "invalid" | "skipped"));
        const payload = {
          profile,
          changedRequested: options.changed === true,
          changedAvailable: changedCaseIds !== null,
          failOn,
          totals: report.totals,
          jsonPath,
          markdownPath,
          results: report.results,
        };

        if (printJsonIfNeeded(payload, options) || options.format === "json") {
          if (!options.json) {
            console.log(JSON.stringify(payload, null, 2));
          }
        } else if (options.format === "markdown") {
          console.log(markdown);
        } else if (caseId && report.results.length === 1) {
          const result = report.results[0];
          section(`Case ${result.caseId}`);
          blank();
          bullet(`Status: ${result.status}`);
          bullet(`Reason: ${result.reason ?? "n/a"}`);
          bullet(`Check: ${result.checkType}`);
          bullet(`Message: ${result.message}`);
          bullet(`Report: ${jsonPath}`);
          blank();
        } else {
          section("Run complete");
          blank();
          bullet(`Profile: ${profile}`);
          bullet(`Changed only: ${options.changed ? "yes" : "no"}`);
          if (options.changed && changedCaseIds === null) {
            bullet("Changed detection fallback: git metadata unavailable, so all cases were considered.");
          }
          bullet(`Total: ${report.totals.total}`);
          bullet(`Passed: ${report.totals.passed}`);
          bullet(`Failed: ${report.totals.failed}`);
          bullet(`Skipped: ${report.totals.skipped}`);
          bullet(`Invalid: ${report.totals.invalid}`);
          bullet(`Fail on: ${failOn.join(", ")}`);
          bullet(`JSON report: ${jsonPath}`);
          bullet(`Markdown report: ${markdownPath}`);
          blank();
        }

        if (!options.json && options.format !== "json") {
          if (failingResults.length > 0) {
            section("Issues");
            for (const result of failingResults) {
              bullet(`${result.caseId}: ${result.message}`);
            }
            blank();
          }
          nextStep("airc report --format summary");
        }

        const shouldFail = failingResults.length > 0;
        if (shouldFail) {
          process.exitCode = 1;
        }
      },
    );
}
