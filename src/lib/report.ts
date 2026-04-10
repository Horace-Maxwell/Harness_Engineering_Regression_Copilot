import type { RunReport } from "../core/types.js";

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
