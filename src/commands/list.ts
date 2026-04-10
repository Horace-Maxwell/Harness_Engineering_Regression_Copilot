import { Command } from "commander";

import type { CaseRecord } from "../core/types.js";
import { applyGlobalOptions, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { findWorkspaceRoot, loadCaseRecords, readConfig } from "../lib/fs.js";
import { blank, bullet, section } from "../lib/output.js";
import { validateCaseRecord, validateConfig } from "../lib/validate.js";

function matchesFilter(record: CaseRecord, options: { status?: string; taskType?: string; tag?: string; search?: string }): boolean {
  if (options.status && record.status !== options.status) {
    return false;
  }
  if (options.taskType && record.taskType !== options.taskType) {
    return false;
  }
  if (options.tag && !(record.tags ?? []).includes(options.tag)) {
    return false;
  }
  if (options.search) {
    const haystack = `${record.id} ${record.title} ${(record.tags ?? []).join(" ")} ${record.taskType}`.toLowerCase();
    if (!haystack.includes(options.search.toLowerCase())) {
      return false;
    }
  }
  return true;
}

export function createListCommand(): Command {
  return withGlobalOptions(new Command("list"))
    .description("List current regression cases.")
    .option("--status <status>", "Filter by case status")
    .option("--task-type <taskType>", "Filter by task type")
    .option("--tag <tag>", "Filter by tag")
    .option("--search <text>", "Filter by id, title, task type, or tag text")
    .option("--long", "Show more detail for each case")
    .action(async (options: { status?: string; taskType?: string; tag?: string; search?: string; long?: boolean; json?: boolean; quiet?: boolean; noColor?: boolean }) => {
      applyGlobalOptions(options);
      const projectRoot = await findWorkspaceRoot();
      if (!projectRoot) {
        section("Workspace is not initialized yet. Run `herc init` first.");
        return;
      }

      const config = await readConfig(projectRoot);
      validateConfig(config);
      const records = await loadCaseRecords(projectRoot, config);
      records.forEach((record) => validateCaseRecord(record));

      if (records.length === 0) {
        section("No cases found. Run `herc import` and `herc distill` first.");
        return;
      }

      const filteredRecords = records
        .filter((record) => matchesFilter(record, options))
        .sort((left, right) => left.id.localeCompare(right.id));

      if (printJsonIfNeeded({ total: filteredRecords.length, cases: filteredRecords }, options)) {
        return;
      }

      if (filteredRecords.length === 0) {
        section("No cases matched the current filters.");
        return;
      }

      section("Cases");
      blank();
      bullet(`Matched: ${filteredRecords.length}`);
      blank();

      for (const record of filteredRecords) {
        const tags = (record.tags ?? []).join(", ");
        const priority = record.priority ?? "n/a";
        const review = record.notes.reviewStatus;
        console.log(`- ${record.id} [${record.status}] [${priority}] [${record.taskType}] ${record.title}`);
        console.log(`  review: ${review}`);
        if (tags) {
          console.log(`  tags: ${tags}`);
        }
        if (options.long) {
          if (record.incident?.failureReason) {
            console.log(`  failure: ${record.incident.failureReason}`);
          }
          console.log(`  check: ${record.check.type}`);
          console.log(`  expected: ${record.expectedBehavior.summary}`);
          if (record.source?.rawInputRef) {
            console.log(`  raw: ${record.source.rawInputRef}`);
          }
        }
      }
    });
}
