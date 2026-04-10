import type { AircConfig, CaseRecord, IncidentRecord, RunReport } from "../core/types.js";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateConfig(config: unknown): asserts config is AircConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Config is missing or invalid.");
  }

  const candidate = config as Partial<AircConfig>;
  if (candidate.version !== 1) {
    throw new Error("Config version must be 1.");
  }
  if (candidate.schemaVersion !== undefined && candidate.schemaVersion !== 1) {
    throw new Error("Config schemaVersion must be 1 when provided.");
  }

  const required = ["projectName", "casesDir", "incidentsDir", "reportsDir", "responsesDir"] as const;
  for (const key of required) {
    if (!isNonEmptyString(candidate[key])) {
      throw new Error(`Config field '${key}' must be a non-empty string.`);
    }
  }

  if (!["quick", "standard", "deep"].includes(String(candidate.defaultProfile))) {
    throw new Error("Config defaultProfile must be quick, standard, or deep.");
  }
}

export function validateIncidentRecord(record: unknown): asserts record is IncidentRecord {
  if (!isObject(record)) {
    throw new Error("Incident record is missing or invalid.");
  }

  const candidate = record as Partial<IncidentRecord>;
  if (!isNonEmptyString(candidate.id)) {
    throw new Error("Incident record must include a non-empty id.");
  }
  if (!isNonEmptyString(candidate.title)) {
    throw new Error(`Incident '${candidate.id ?? "unknown"}' must include a title.`);
  }
  if (!isNonEmptyString(candidate.summary)) {
    throw new Error(`Incident '${candidate.id}' must include a summary.`);
  }
  if (!["file", "csv", "paste"].includes(String(candidate.createdFrom))) {
    throw new Error(`Incident '${candidate.id}' has an invalid createdFrom value.`);
  }
  if (candidate.contentHash !== undefined && !isNonEmptyString(candidate.contentHash)) {
    throw new Error(`Incident '${candidate.id}' has an invalid contentHash.`);
  }
  if (candidate.rawInputRef !== undefined && !isNonEmptyString(candidate.rawInputRef)) {
    throw new Error(`Incident '${candidate.id}' has an invalid rawInputRef.`);
  }
  if (candidate.tags !== undefined && !isStringArray(candidate.tags)) {
    throw new Error(`Incident '${candidate.id}' has invalid tags.`);
  }
}

export function validateCaseRecord(record: unknown): asserts record is CaseRecord {
  if (!isObject(record)) {
    throw new Error("Case record is missing or invalid.");
  }

  const candidate = record as Partial<CaseRecord>;
  if (!isNonEmptyString(candidate.id)) {
    throw new Error("Case record must include a non-empty id.");
  }
  if (!isNonEmptyString(candidate.title)) {
    throw new Error(`Case '${candidate.id}' must include a title.`);
  }
  if (!["active", "draft", "muted", "archived"].includes(String(candidate.status))) {
    throw new Error(`Case '${candidate.id}' has an invalid status.`);
  }
  if (!isNonEmptyString(candidate.taskType)) {
    throw new Error(`Case '${candidate.id}' must include a taskType.`);
  }
  if (candidate.updatedAt !== undefined && !isNonEmptyString(candidate.updatedAt)) {
    throw new Error(`Case '${candidate.id}' has an invalid updatedAt.`);
  }
  if (candidate.priority !== undefined && !["low", "medium", "high", "critical"].includes(String(candidate.priority))) {
    throw new Error(`Case '${candidate.id}' has an invalid priority.`);
  }
  if (candidate.tags !== undefined && !isStringArray(candidate.tags)) {
    throw new Error(`Case '${candidate.id}' has invalid tags.`);
  }
  if (candidate.source !== undefined && !isObject(candidate.source)) {
    throw new Error(`Case '${candidate.id}' has an invalid source object.`);
  }
  if (candidate.incident !== undefined) {
    if (!isObject(candidate.incident)) {
      throw new Error(`Case '${candidate.id}' has an invalid incident object.`);
    }
    if (!isNonEmptyString(candidate.incident.summary)) {
      throw new Error(`Case '${candidate.id}' must include incident.summary when incident is present.`);
    }
    if (!isNonEmptyString(candidate.incident.failureReason)) {
      throw new Error(`Case '${candidate.id}' must include incident.failureReason when incident is present.`);
    }
  }
  if (!candidate.expectedBehavior || !isObject(candidate.expectedBehavior)) {
    throw new Error(`Case '${candidate.id}' must include expectedBehavior.`);
  }
  if (!isNonEmptyString(candidate.expectedBehavior.summary)) {
    throw new Error(`Case '${candidate.id}' must include expectedBehavior.summary.`);
  }
  if (candidate.expectedBehavior.must && !isStringArray(candidate.expectedBehavior.must)) {
    throw new Error(`Case '${candidate.id}' has an invalid expectedBehavior.must.`);
  }
  if (candidate.expectedBehavior.mustNot && !isStringArray(candidate.expectedBehavior.mustNot)) {
    throw new Error(`Case '${candidate.id}' has an invalid expectedBehavior.mustNot.`);
  }
  if (!candidate.check || !isObject(candidate.check)) {
    throw new Error(`Case '${candidate.id}' must include a check object.`);
  }
  if (!["contains", "not_contains", "equals", "regex", "semantic", "llm_judge"].includes(String(candidate.check.type))) {
    throw new Error(`Case '${candidate.id}' has an unsupported check.type.`);
  }
  if (!candidate.notes || !isObject(candidate.notes)) {
    throw new Error(`Case '${candidate.id}' must include notes.`);
  }
  if (!["needs_review", "auto_high_confidence", "reviewed"].includes(String(candidate.notes.reviewStatus))) {
    throw new Error(`Case '${candidate.id}' has an invalid notes.reviewStatus.`);
  }
  if (candidate.notes.confidence !== undefined && !["low", "medium", "high"].includes(String(candidate.notes.confidence))) {
    throw new Error(`Case '${candidate.id}' has an invalid notes.confidence.`);
  }
  if (candidate.notes.reviewedBy !== undefined && !isNonEmptyString(candidate.notes.reviewedBy)) {
    throw new Error(`Case '${candidate.id}' has an invalid notes.reviewedBy.`);
  }
  if (candidate.notes.reviewNote !== undefined && !isNonEmptyString(candidate.notes.reviewNote)) {
    throw new Error(`Case '${candidate.id}' has an invalid notes.reviewNote.`);
  }
}

export function validateRunReport(report: unknown): asserts report is RunReport {
  if (!isObject(report)) {
    throw new Error("Run report is missing or invalid.");
  }

  const candidate = report as Partial<RunReport>;
  if (!isNonEmptyString(candidate.id)) {
    throw new Error("Run report must include an id.");
  }
  if (!isNonEmptyString(candidate.createdAt)) {
    throw new Error(`Run report '${candidate.id}' must include createdAt.`);
  }
  if (!["quick", "standard", "deep"].includes(String(candidate.profile))) {
    throw new Error(`Run report '${candidate.id}' has an invalid profile.`);
  }
  if (!isObject(candidate.totals)) {
    throw new Error(`Run report '${candidate.id}' must include totals.`);
  }
  if (!Array.isArray(candidate.results)) {
    throw new Error(`Run report '${candidate.id}' must include results.`);
  }
}
