import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CaseRecord, CaseRunResult, RunProfile, RunReport } from "../core/types.js";
import { renderMarkdownReport } from "./report.js";
import { timestampId } from "./ids.js";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getCheckValues(caseRecord: CaseRecord): string[] {
  const valuesFromArray = asStringArray(caseRecord.check.config.values);
  const singleValue = typeof caseRecord.check.config.value === "string" ? caseRecord.check.config.value : undefined;
  return valuesFromArray.length > 0 ? valuesFromArray : singleValue ? [singleValue] : [];
}

function shouldTrim(caseRecord: CaseRecord): boolean {
  return caseRecord.check.config.trim !== false;
}

function isCaseSensitive(caseRecord: CaseRecord): boolean {
  return caseRecord.check.config.caseSensitive === true;
}

function getMatchMode(caseRecord: CaseRecord): "all" | "any" {
  return caseRecord.check.config.mode === "any" ? "any" : "all";
}

function normalizeValue(value: string, caseRecord: CaseRecord): string {
  const trimmed = shouldTrim(caseRecord) ? value.trim() : value;
  return isCaseSensitive(caseRecord) ? trimmed : trimmed.toLowerCase();
}

function evaluateDeterministicCheck(caseRecord: CaseRecord, response: string): CaseRunResult {
  const values = getCheckValues(caseRecord);

  if (values.length === 0) {
    return {
      caseId: caseRecord.id,
      title: caseRecord.title,
      status: "invalid",
      reason: "invalid_config",
      checkType: caseRecord.check.type,
      message: "Deterministic checks require check.config.value or check.config.values.",
    };
  }

  const normalizedResponse = normalizeValue(response, caseRecord);
  const normalizedValues = values.map((value) => normalizeValue(value, caseRecord));
  const mode = getMatchMode(caseRecord);

  if (caseRecord.check.type === "contains") {
    const matchedValues = normalizedValues.filter((value) => normalizedResponse.includes(value));
    const passed = mode === "all" ? matchedValues.length === normalizedValues.length : matchedValues.length > 0;
    if (passed) {
      return {
        caseId: caseRecord.id,
        title: caseRecord.title,
        status: "passed",
        reason: "passed",
        checkType: caseRecord.check.type,
        message: `Response contained all required value(s): ${values.join(", ")}.`,
      };
    }

    return {
      caseId: caseRecord.id,
      title: caseRecord.title,
      status: "failed",
      reason: "check_failed",
      checkType: caseRecord.check.type,
      message: `Response did not satisfy the required contains check for: ${values.join(", ")}.`,
    };
  }

  if (caseRecord.check.type === "not_contains") {
    const blocked = normalizedValues.filter((value) => normalizedResponse.includes(value));
    const passed = mode === "all" ? blocked.length === 0 : blocked.length < normalizedValues.length;
    if (passed) {
      return {
        caseId: caseRecord.id,
        title: caseRecord.title,
        status: "passed",
        reason: "passed",
        checkType: caseRecord.check.type,
        message: `Response avoided blocked value(s): ${values.join(", ")}.`,
      };
    }

    return {
      caseId: caseRecord.id,
      title: caseRecord.title,
      status: "failed",
      reason: "check_failed",
      checkType: caseRecord.check.type,
      message: `Response contained blocked value(s): ${values.join(", ")}.`,
    };
  }

  if (caseRecord.check.type === "equals") {
    const passed = mode === "all"
      ? normalizedValues.every((value) => normalizedResponse === value)
      : normalizedValues.some((value) => normalizedResponse === value);
    if (passed) {
      return {
        caseId: caseRecord.id,
        title: caseRecord.title,
        status: "passed",
        reason: "passed",
        checkType: caseRecord.check.type,
        message: `Response matched the expected value exactly.`,
      };
    }

    return {
      caseId: caseRecord.id,
      title: caseRecord.title,
      status: "failed",
      reason: "check_failed",
      checkType: caseRecord.check.type,
      message: `Response did not exactly match the expected value(s).`,
    };
  }

  if (caseRecord.check.type === "regex") {
    const flags = isCaseSensitive(caseRecord) ? "" : "i";
    try {
      const patterns = values.map((value) => new RegExp(value, flags));
      const matched = patterns.filter((pattern) => pattern.test(response));
      const passed = mode === "all" ? matched.length === patterns.length : matched.length > 0;
      if (passed) {
        return {
          caseId: caseRecord.id,
          title: caseRecord.title,
          status: "passed",
          reason: "passed",
          checkType: caseRecord.check.type,
          message: `Response matched the expected regex pattern(s).`,
        };
      }

      return {
        caseId: caseRecord.id,
        title: caseRecord.title,
        status: "failed",
        reason: "check_failed",
        checkType: caseRecord.check.type,
        message: `Response did not match the expected regex pattern(s).`,
      };
    } catch {
      return {
        caseId: caseRecord.id,
        title: caseRecord.title,
        status: "invalid",
        reason: "invalid_config",
        checkType: caseRecord.check.type,
        message: "The regex pattern is invalid.",
      };
    }
  }

  return {
    caseId: caseRecord.id,
    title: caseRecord.title,
    status: "invalid",
    reason: "invalid_config",
    checkType: caseRecord.check.type,
    message: `Unsupported deterministic check type '${caseRecord.check.type}'.`,
  };
}

function createResult(
  caseRecord: CaseRecord,
  partial: Pick<CaseRunResult, "status" | "message" | "checkType"> &
    Partial<Pick<CaseRunResult, "reason" | "responsePath">>,
): CaseRunResult {
  return {
    caseId: caseRecord.id,
    title: caseRecord.title,
    caseStatus: caseRecord.status,
    reviewStatus: caseRecord.notes.reviewStatus,
    priority: caseRecord.priority,
    tags: caseRecord.tags,
    ...partial,
  };
}

function isDeterministicCheck(checkType: CaseRecord["check"]["type"]): boolean {
  return ["contains", "not_contains", "equals", "regex"].includes(checkType);
}

function handleProfileRestriction(caseRecord: CaseRecord, profile: RunProfile): CaseRunResult | null {
  if (caseRecord.status === "archived" || caseRecord.status === "muted") {
    return createResult(caseRecord, {
      status: "skipped",
      reason: caseRecord.status === "archived" ? "archived" : "muted",
      checkType: caseRecord.check.type,
      message: `Case status '${caseRecord.status}' is not executed.`,
    });
  }

  if (profile === "quick" && caseRecord.status === "draft") {
    return createResult(caseRecord, {
      status: "skipped",
      reason: "draft",
      checkType: caseRecord.check.type,
      message: "Quick profile skips draft cases so the first run stays fast and low-noise.",
    });
  }

  if (profile === "deep" && caseRecord.notes.reviewStatus === "needs_review") {
    return createResult(caseRecord, {
      status: "invalid",
      reason: "review_needed",
      checkType: caseRecord.check.type,
      message: "Deep profile requires reviewed cases. Accept or review this case before using deep gates.",
    });
  }

  if (!isDeterministicCheck(caseRecord.check.type)) {
    if (profile === "deep") {
      return createResult(caseRecord, {
        status: "invalid",
        reason: "unsupported_check",
        checkType: caseRecord.check.type,
        message: `Deep profile requires locally executable checks. Convert '${caseRecord.check.type}' into a deterministic check first.`,
      });
    }

    return createResult(caseRecord, {
      status: "skipped",
      reason: "unsupported_check",
      checkType: caseRecord.check.type,
      message: `Check type '${caseRecord.check.type}' is not executable yet in the local runner. Use deterministic checks first.`,
    });
  }

  return null;
}

interface RunCasesOptions {
  filterCaseId?: string;
  responseOverridePath?: string;
  responseOverrideText?: string;
  changedCaseIds?: Set<string>;
  responsesDir?: string;
}

export async function runCases(
  cases: CaseRecord[],
  profile: RunProfile,
  projectRoot: string,
  options: RunCasesOptions = {},
): Promise<{ report: RunReport; markdown: string }> {
  const responsesDir = options.responsesDir ?? path.join(projectRoot, ".airc", "responses");
  const selectedCases = options.filterCaseId ? cases.filter((record) => record.id === options.filterCaseId) : cases;
  const candidateCases =
    options.changedCaseIds && !options.filterCaseId
      ? selectedCases.filter((record) => options.changedCaseIds?.has(record.id))
      : selectedCases;
  const results: CaseRunResult[] = [];

  for (const caseRecord of candidateCases) {
    const restricted = handleProfileRestriction(caseRecord, profile);
    if (restricted) {
      results.push(restricted);
      continue;
    }

    const responsePath = options.responseOverridePath ?? path.join(responsesDir, `${caseRecord.id}.txt`);
    try {
      const response = options.responseOverrideText ?? (await readFile(responsePath, "utf8"));

      if (isDeterministicCheck(caseRecord.check.type)) {
        const result = evaluateDeterministicCheck(caseRecord, response);
        result.caseStatus = caseRecord.status;
        result.reviewStatus = caseRecord.notes.reviewStatus;
        result.priority = caseRecord.priority;
        result.tags = caseRecord.tags;
        result.responsePath = options.responseOverrideText ? undefined : responsePath;
        results.push(result);
        continue;
      }
    } catch {
      results.push(createResult(caseRecord, {
        status: "skipped",
        reason: "missing_response",
        checkType: caseRecord.check.type,
        responsePath,
        message: "No response file found. Add a response at the expected path before running this case.",
      }));
    }
  }

  const report: RunReport = {
    id: timestampId("run"),
    createdAt: new Date().toISOString(),
    profile,
    totals: {
      total: results.length,
      passed: results.filter((result) => result.status === "passed").length,
      failed: results.filter((result) => result.status === "failed").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      invalid: results.filter((result) => result.status === "invalid").length,
    },
    results,
  };

  return { report, markdown: renderMarkdownReport(report) };
}
