export function timestampId(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17);
  const randomSuffix = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${stamp}_${randomSuffix}`;
}

export function numericCaseId(index: number): string {
  return `case_${String(index).padStart(3, "0")}`;
}

export function extractCaseIndex(caseId: string): number | null {
  const match = /^case_(\d+)$/.exec(caseId);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}
