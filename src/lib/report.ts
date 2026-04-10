import type { CaseRunStatus, RunReport } from "../core/types.js";

export interface ReportComparison {
  currentId: string;
  previousId: string;
  changedCases: number;
  regressions: Array<{ caseId: string; from: CaseRunStatus; to: CaseRunStatus }>;
  improvements: Array<{ caseId: string; from: CaseRunStatus; to: CaseRunStatus }>;
  newlyFailing: string[];
  resolved: string[];
  totalsDelta: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    invalid: number;
  };
}

const blockingStatuses: CaseRunStatus[] = ["failed", "invalid", "skipped"];
const severityOrder: Record<CaseRunStatus, number> = {
  passed: 0,
  skipped: 1,
  invalid: 2,
  failed: 3,
};

function compareStatus(a: CaseRunStatus, b: CaseRunStatus): number {
  return severityOrder[a] - severityOrder[b];
}

export function compareReports(current: RunReport, previous: RunReport): ReportComparison {
  const previousByCaseId = new Map(previous.results.map((result) => [result.caseId, result]));
  const regressions: Array<{ caseId: string; from: CaseRunStatus; to: CaseRunStatus }> = [];
  const improvements: Array<{ caseId: string; from: CaseRunStatus; to: CaseRunStatus }> = [];
  const newlyFailing: string[] = [];
  const resolved: string[] = [];
  let changedCases = 0;

  for (const result of current.results) {
    const previousResult = previousByCaseId.get(result.caseId);
    if (!previousResult || previousResult.status === result.status) {
      continue;
    }

    changedCases += 1;
    const from = previousResult.status;
    const to = result.status;
    const severityDelta = compareStatus(to, from);
    const wasBlocking = blockingStatuses.includes(from);
    const isBlocking = blockingStatuses.includes(to);

    if (severityDelta > 0) {
      regressions.push({ caseId: result.caseId, from, to });
    } else if (severityDelta < 0) {
      improvements.push({ caseId: result.caseId, from, to });
    }

    if (!wasBlocking && isBlocking) {
      newlyFailing.push(result.caseId);
    }
    if (wasBlocking && !isBlocking) {
      resolved.push(result.caseId);
    }
  }

  return {
    currentId: current.id,
    previousId: previous.id,
    changedCases,
    regressions,
    improvements,
    newlyFailing: newlyFailing.sort(),
    resolved: resolved.sort(),
    totalsDelta: {
      total: current.totals.total - previous.totals.total,
      passed: current.totals.passed - previous.totals.passed,
      failed: current.totals.failed - previous.totals.failed,
      skipped: current.totals.skipped - previous.totals.skipped,
      invalid: current.totals.invalid - previous.totals.invalid,
    },
  };
}

export function renderMarkdownReport(report: RunReport): string {
  const failures = report.results.filter((result) => result.status === "failed");
  const invalid = report.results.filter((result) => result.status === "invalid");
  const skipped = report.results.filter((result) => result.status === "skipped");
  const needsReview = report.results.filter((result) => result.reviewStatus === "needs_review");
  const lines: string[] = [];
  lines.push("# Harness_Engineering_Regression_Copilot Report");
  lines.push("");
  lines.push(`- Report ID: ${report.id}`);
  lines.push(`- Created At: ${report.createdAt}`);
  lines.push(`- Profile: ${report.profile}`);
  lines.push(`- Total: ${report.totals.total}`);
  lines.push(`- Passed: ${report.totals.passed}`);
  lines.push(`- Failed: ${report.totals.failed}`);
  lines.push(`- Skipped: ${report.totals.skipped}`);
  lines.push(`- Invalid: ${report.totals.invalid}`);
  lines.push("");
  lines.push("## Failure Summary");
  lines.push("");
  lines.push(`- Failures: ${failures.length}`);
  lines.push(`- Invalid cases: ${invalid.length}`);
  lines.push(`- Skipped cases: ${skipped.length}`);
  lines.push(`- Needs review: ${needsReview.length}`);
  lines.push("");
  lines.push("## Results");
  lines.push("");

  for (const result of report.results) {
    lines.push(`- [${result.status}] ${result.caseId}: ${result.title}`);
    lines.push(`  ${result.message}${result.responsePath ? ` (response: ${result.responsePath})` : ""}`);
  }

  if (failures.length > 0 || invalid.length > 0) {
    lines.push("");
    lines.push("## Suggested Next Actions");
    lines.push("");
    if (failures.length > 0) {
      lines.push("- Review failed deterministic cases and update the product behavior or test asset.");
    }
    if (invalid.length > 0) {
      lines.push("- Fix invalid cases by reviewing metadata, checks, or deep-profile constraints.");
    }
    if (skipped.some((result) => result.reason === "missing_response")) {
      lines.push("- Add response fixtures for skipped cases with missing response files.");
    }
  }

  lines.push("");
  return lines.join("\n");
}
