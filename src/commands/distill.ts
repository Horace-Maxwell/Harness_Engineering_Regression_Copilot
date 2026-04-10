import path from "node:path";

import { Command } from "commander";
import YAML from "yaml";

import type { CaseRecord, IncidentRecord } from "../core/types.js";
import { applyGlobalOptions, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { inferCheck, inferConfidence, inferExpectedBehavior, inferFailureReason, inferPriority, inferReviewStatus, inferTags, inferTaskType } from "../lib/distill.js";
import { CliError } from "../lib/errors.js";
import { extractCaseIndex, numericCaseId } from "../lib/ids.js";
import { blank, bullet, nextStep, section } from "../lib/output.js";
import { findWorkspaceRoot, getCasesDir, listFiles, loadCaseRecords, loadIncidentRecords, readConfig, writeTextFile } from "../lib/fs.js";
import { validateCaseRecord, validateConfig, validateIncidentRecord } from "../lib/validate.js";

function draftCaseFromIncident(incident: IncidentRecord, index: number): CaseRecord {
  const check = inferCheck(incident);
  return {
    id: numericCaseId(index),
    title: incident.title,
    status: "draft",
    taskType: inferTaskType(incident),
    createdFrom: incident.createdFrom,
    updatedAt: new Date().toISOString(),
    incidentId: incident.id,
    priority: inferPriority(incident),
    tags: inferTags(incident),
    source: {
      importedAt: incident.importedAt,
      sourcePath: incident.sourcePath,
      rawInputRef: incident.rawInputRef,
      contentHash: incident.contentHash,
    },
    incident: {
      summary: incident.summary,
      failureReason: inferFailureReason(incident),
    },
    expectedBehavior: inferExpectedBehavior(incident),
    check,
    notes: {
      generatedBy: "herc_distill_v2",
      reviewStatus: inferReviewStatus(check),
      confidence: inferConfidence(check),
    },
  };
}

function mergeRedistilledCase(existingCase: CaseRecord, draftCase: CaseRecord): CaseRecord {
  return {
    ...draftCase,
    id: existingCase.id,
    status: existingCase.status,
    updatedAt: new Date().toISOString(),
    notes: {
      ...draftCase.notes,
      reviewStatus: existingCase.notes.reviewStatus === "reviewed" ? existingCase.notes.reviewStatus : draftCase.notes.reviewStatus,
      reviewedBy: existingCase.notes.reviewedBy,
      reviewNote: existingCase.notes.reviewNote,
    },
  };
}

export function createDistillCommand(): Command {
  return withGlobalOptions(new Command("distill"))
    .description("Turn imported incidents into draft regression cases.")
    .option("--incident <incidentId>", "Distill only one incident")
    .option("--redistill", "Refresh existing non-reviewed cases from their linked incidents")
    .option("--only-new", "Create only new cases and skip already-linked incidents")
    .action(
      async (
        options: {
          incident?: string;
          redistill?: boolean;
          onlyNew?: boolean;
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
            next: "herc init",
          });
        }

        const config = await readConfig(projectRoot);
        validateConfig(config);

        const incidents = await loadIncidentRecords(projectRoot, config);
        incidents.forEach((incident) => validateIncidentRecord(incident));
        const candidateIncidents = options.incident ? incidents.filter((incident) => incident.id === options.incident) : incidents;
        if (options.incident && candidateIncidents.length === 0) {
          throw new CliError(`Incident '${options.incident}' was not found.`, {
            fix: "Run `herc import` again or inspect `.herc/incidents` for available ids.",
          });
        }

        const existingCases = await loadCaseRecords(projectRoot, config);
        existingCases.forEach((record) => validateCaseRecord(record));

        let nextIndex = 1;
        const caseByIncidentId = new Map<string, CaseRecord>();
        for (const record of existingCases) {
          const caseIndex = extractCaseIndex(record.id);
          if (caseIndex !== null) {
            nextIndex = Math.max(nextIndex, caseIndex + 1);
          }
          if (record.incidentId) {
            caseByIncidentId.set(record.incidentId, record);
          }
        }

        let created = 0;
        let refreshed = 0;
        let protectedReviewed = 0;
        let skippedExisting = 0;

        for (const incident of candidateIncidents) {
          const linkedCase = caseByIncidentId.get(incident.id);
          if (linkedCase) {
            if (options.onlyNew || !options.redistill) {
              skippedExisting += 1;
              continue;
            }
            if (linkedCase.notes.reviewStatus === "reviewed") {
              protectedReviewed += 1;
              continue;
            }

            const linkedCaseIndex = extractCaseIndex(linkedCase.id) ?? nextIndex;
            const refreshedCase = mergeRedistilledCase(linkedCase, draftCaseFromIncident(incident, linkedCaseIndex));
            validateCaseRecord(refreshedCase);
            const linkedCasePath = path.join(getCasesDir(projectRoot, config), `${linkedCase.id}.yaml`);
            await writeTextFile(linkedCasePath, YAML.stringify(refreshedCase));
            refreshed += 1;
            continue;
          }

          const caseRecord = draftCaseFromIncident(incident, nextIndex);
          validateCaseRecord(caseRecord);
          const casePath = path.join(getCasesDir(projectRoot, config), `${caseRecord.id}.yaml`);
          await writeTextFile(casePath, YAML.stringify(caseRecord));
          created += 1;
          nextIndex += 1;
        }

        const payload = {
          incidentsScanned: candidateIncidents.length,
          created,
          refreshed,
          skippedExisting,
          protectedReviewed,
        };
        if (printJsonIfNeeded(payload, options)) {
          return;
        }

        section(`Distilled ${created} new case${created === 1 ? "" : "s"}`);
        blank();
        bullet(`Refreshed existing draft cases: ${refreshed}`);
        bullet(`Skipped existing linked cases: ${skippedExisting}`);
        bullet(`Protected reviewed cases: ${protectedReviewed}`);
        bullet("Deterministic checks are only proposed when the heuristic looks high-confidence.");
        bullet("Deep profile will require reviewed, locally executable cases.");
        blank();
        nextStep("herc list --long");
      },
    );
}
