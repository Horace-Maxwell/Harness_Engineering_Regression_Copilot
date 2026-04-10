#!/usr/bin/env node

import { Command } from "commander";

import { createAcceptCommand } from "./commands/accept.js";
import { createCreateCaseCommand } from "./commands/create-case.js";
import { createDoctorCommand } from "./commands/doctor.js";
import { createDistillCommand } from "./commands/distill.js";
import { createImportCommand } from "./commands/import.js";
import { createInitCommand } from "./commands/init.js";
import { createInspectCommand } from "./commands/inspect.js";
import { createListCommand } from "./commands/list.js";
import { createReportCommand } from "./commands/report.js";
import { createRunCommand } from "./commands/run.js";
import { createSetStatusCommand } from "./commands/set-status.js";
import { createVersionCommand } from "./commands/version.js";
import { asCliError } from "./lib/errors.js";
import { isJsonOutput, outputJson } from "./lib/output.js";

const program = new Command();

program
  .name("herc")
  .description("Harness_Engineering_Regression_Copilot CLI")
  .version("0.1.0")
  .addCommand(createInitCommand())
  .addCommand(createDoctorCommand())
  .addCommand(createImportCommand())
  .addCommand(createDistillCommand())
  .addCommand(createCreateCaseCommand())
  .addCommand(createAcceptCommand())
  .addCommand(createSetStatusCommand())
  .addCommand(createRunCommand())
  .addCommand(createReportCommand())
  .addCommand(createListCommand())
  .addCommand(createInspectCommand())
  .addCommand(createVersionCommand());

program.parseAsync(process.argv).catch((error: unknown) => {
  const cliError = asCliError(error);
  if (isJsonOutput()) {
    outputJson({
      error: cliError.message,
      fix: cliError.fix,
      next: cliError.next,
      details: cliError.details,
    });
    process.exitCode = 1;
    return;
  }

  console.error(`Error: ${cliError.message}`);
  if (cliError.fix) {
    console.error(`Fix: ${cliError.fix}`);
  }
  if (cliError.next) {
    console.error(`Next: ${cliError.next}`);
  }
  process.exitCode = 1;
});
