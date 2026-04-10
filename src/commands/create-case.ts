import path from "node:path";

import { Command } from "commander";
import YAML from "yaml";

import type { CaseRecord } from "../core/types.js";
import { applyGlobalOptions, parseCommaList, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { CliError } from "../lib/errors.js";
import { extractCaseIndex, numericCaseId } from "../lib/ids.js";
import { findWorkspaceRoot, getCasesDir, loadCaseRecords, readConfig, writeTextFile } from "../lib/fs.js";
import { blank, bullet, nextStep, section } from "../lib/output.js";
import { validateCaseRecord, validateConfig } from "../lib/validate.js";

function resolveCheck(options: { checkType?: CaseRecord["check"]["type"]; value?: string }): CaseRecord["check"] {
  const checkType = options.checkType ?? "llm_judge";
  if (["contains", "not_contains", "equals", "regex"].includes(checkType)) {
    if (!options.value) {
      throw new CliError(`Check type '${checkType}' requires --value.`, {
        fix: "Pass a value, for example `herc create-case \"Title\" --check-type contains --value \"refund policy\"`.",
      });
    }

    return {
      type: checkType,
      config: { value: options.value },
    };
  }

  return {
    type: checkType,
    config: {
      rubric: "Replace this rubric with the expected behavior for the case.",
    },
  };
}

export function createCreateCaseCommand(): Command {
  return withGlobalOptions(new Command("create-case"))
    .description("Create a case manually without importing an incident first.")
    .argument("<title>", "Case title")
    .option("--id <caseId>", "Custom case id")
    .option("--task-type <taskType>", "Task type", "chat")
    .option("--status <status>", "Case status", "draft")
    .option("--priority <priority>", "Priority: low, medium, high, critical")
    .option("--check-type <checkType>", "Check type: contains, not_contains, equals, regex, semantic, llm_judge", "llm_judge")
    .option("--value <value>", "Value used by deterministic checks")
    .option("--tag <tags>", "Comma-separated tags")
    .option("--must <items>", "Comma-separated must behaviors")
    .option("--must-not <items>", "Comma-separated must-not behaviors")
    .option("--source-ref <path>", "Optional source or trace reference")
    .action(
      async (
        title: string,
        options: {
          id?: string;
          taskType?: string;
          status?: CaseRecord["status"];
          priority?: CaseRecord["priority"];
          checkType?: CaseRecord["check"]["type"];
          value?: string;
          tag?: string;
          must?: string;
          mustNot?: string;
          sourceRef?: string;
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

        const config = await readConfig(projectRoot);
        validateConfig(config);
        const existingCases = await loadCaseRecords(projectRoot, config);
        existingCases.forEach((record) => validateCaseRecord(record));
        const nextIndex = existingCases.reduce((current, record) => {
          const index = extractCaseIndex(record.id);
          return index === null ? current : Math.max(current, index + 1);
        }, 1);

        const caseId = options.id ?? numericCaseId(nextIndex);
        if (existingCases.some((record) => record.id === caseId)) {
          throw new CliError(`Case '${caseId}' already exists.`, {
            fix: "Choose a different id or omit --id to auto-generate one.",
          });
        }

        const now = new Date().toISOString();
        const caseRecord: CaseRecord = {
          id: caseId,
          title,
          status: options.status ?? "draft",
          taskType: options.taskType ?? "chat",
          createdFrom: "manual",
          updatedAt: now,
          priority: options.priority,
          tags: parseCommaList(options.tag),
          source: options.sourceRef ? { sourcePath: options.sourceRef, rawInputRef: options.sourceRef } : undefined,
          expectedBehavior: {
            summary: "Replace this summary with the expected behavior for the case.",
            must: parseCommaList(options.must),
            mustNot: parseCommaList(options.mustNot),
          },
          check: resolveCheck(options),
          notes: {
            generatedBy: "herc_create_case_v1",
            reviewStatus: "needs_review",
            confidence: ["contains", "not_contains", "equals", "regex"].includes(options.checkType ?? "llm_judge") ? "medium" : "low",
          },
        };
        validateCaseRecord(caseRecord);
        const casePath = path.join(getCasesDir(projectRoot, config), `${caseId}.yaml`);
        await writeTextFile(casePath, YAML.stringify(caseRecord));

        if (printJsonIfNeeded({ casePath, caseRecord }, options)) {
          return;
        }

        section("Created case");
        blank();
        bullet(`Case: ${caseId}`);
        bullet(`Path: ${casePath}`);
        blank();
        nextStep(`herc inspect ${caseId}`);
      },
    );
}
