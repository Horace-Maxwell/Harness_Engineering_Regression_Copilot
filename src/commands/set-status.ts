import { readFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";
import YAML from "yaml";

import type { CaseRecord } from "../core/types.js";
import { applyGlobalOptions, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { CliError } from "../lib/errors.js";
import { findWorkspaceRoot, getCasesDir, readConfig, writeTextFile } from "../lib/fs.js";
import { blank, bullet, section } from "../lib/output.js";
import { validateCaseRecord, validateConfig } from "../lib/validate.js";

export function createSetStatusCommand(): Command {
  return withGlobalOptions(new Command("set-status"))
    .description("Set a case status, for example active, muted, archived, or draft.")
    .argument("<id>", "Case id")
    .argument("<status>", "New status")
    .action(async (id: string, status: CaseRecord["status"], options: { json?: boolean; quiet?: boolean; noColor?: boolean }) => {
      applyGlobalOptions(options);
      const projectRoot = await findWorkspaceRoot();
      if (!projectRoot) {
        throw new CliError("Workspace is not initialized yet.", {
          fix: "Run `herc init` first.",
        });
      }

      if (!["active", "draft", "muted", "archived"].includes(status)) {
        throw new CliError(`Unsupported status '${status}'.`, {
          fix: "Use one of: active, draft, muted, archived.",
        });
      }

      const config = await readConfig(projectRoot);
      validateConfig(config);
      const casePath = path.join(getCasesDir(projectRoot, config), `${id}.yaml`);
      const raw = await readFile(casePath, "utf8");
      const record = YAML.parse(raw) as CaseRecord;
      validateCaseRecord(record);
      record.status = status;
      record.updatedAt = new Date().toISOString();
      validateCaseRecord(record);
      await writeTextFile(casePath, YAML.stringify(record));

      if (printJsonIfNeeded({ casePath, case: record }, options)) {
        return;
      }

      section("Updated case status");
      blank();
      bullet(`Case: ${id}`);
      bullet(`Status: ${status}`);
    });
}
