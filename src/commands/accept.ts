import { readFile } from "node:fs/promises";
import path from "node:path";
import { stdin } from "node:process";

import { Command } from "commander";
import YAML from "yaml";

import type { CaseRecord } from "../core/types.js";
import { applyGlobalOptions, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { CliError } from "../lib/errors.js";
import { findWorkspaceRoot, getCasesDir, getResponsesDir, readConfig, writeTextFile } from "../lib/fs.js";
import { blank, bullet, nextStep, section } from "../lib/output.js";
import { validateCaseRecord, validateConfig } from "../lib/validate.js";

async function readFromStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

export function createAcceptCommand(): Command {
  return withGlobalOptions(new Command("accept"))
    .description("Accept a case review and optionally write a baseline response fixture.")
    .argument("<id>", "Case id, such as case_001")
    .option("--reviewer <name>", "Reviewer name recorded on the case")
    .option("--note <text>", "Review note recorded on the case")
    .option("--status <status>", "Status to set after acceptance", "active")
    .option("--response <text>", "Write a baseline response directly")
    .option("--response-file <file>", "Write a baseline response from a file")
    .option("--stdin-response", "Write a baseline response from stdin")
    .action(
      async (
        id: string,
        options: {
          reviewer?: string;
          note?: string;
          status?: CaseRecord["status"];
          response?: string;
          responseFile?: string;
          stdinResponse?: boolean;
          json?: boolean;
          quiet?: boolean;
          noColor?: boolean;
        },
      ) => {
        applyGlobalOptions(options);
        const projectRoot = await findWorkspaceRoot();
        if (!projectRoot) {
          throw new CliError("Workspace is not initialized yet.", {
            fix: "Run `herc init` first.",
          });
        }

        const responseInputs = [options.response !== undefined, options.responseFile !== undefined, options.stdinResponse === true].filter(Boolean).length;
        if (responseInputs > 1) {
          throw new CliError("Use only one baseline response input source.", {
            fix: "Choose one of `--response`, `--response-file`, or `--stdin-response`.",
          });
        }

        const config = await readConfig(projectRoot);
        validateConfig(config);
        const casePath = path.join(getCasesDir(projectRoot, config), `${id}.yaml`);
        const raw = await readFile(casePath, "utf8");
        const record = YAML.parse(raw) as CaseRecord;
        validateCaseRecord(record);

        record.status = options.status ?? "active";
        record.updatedAt = new Date().toISOString();
        record.notes.reviewStatus = "reviewed";
        record.notes.reviewedBy = options.reviewer;
        record.notes.reviewNote = options.note;

        let responseText: string | undefined;
        if (options.responseFile) {
          responseText = await readFile(options.responseFile, "utf8");
        } else if (options.stdinResponse) {
          responseText = await readFromStdin();
        } else if (options.response !== undefined) {
          responseText = options.response;
        }

        validateCaseRecord(record);
        await writeTextFile(casePath, YAML.stringify(record));

        let responsePath: string | null = null;
        if (responseText !== undefined) {
          responsePath = path.join(getResponsesDir(projectRoot, config), `${id}.txt`);
          await writeTextFile(responsePath, responseText);
        }

        if (printJsonIfNeeded({ casePath, responsePath, case: record }, options)) {
          return;
        }

        section("Accepted case");
        blank();
        bullet(`Case: ${id}`);
        bullet(`Status: ${record.status}`);
        bullet(`Case path: ${casePath}`);
        if (responsePath) {
          bullet(`Baseline response: ${responsePath}`);
        }
        blank();
        nextStep(`herc run ${id}`);
      },
    );
}
