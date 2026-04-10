export type RunProfile = "quick" | "standard" | "deep";

export interface HercConfig {
  version: number;
  schemaVersion?: number;
  projectName: string;
  defaultProfile: RunProfile;
  casesDir: string;
  incidentsDir: string;
  reportsDir: string;
  responsesDir: string;
}

export interface IncidentRecord {
  id: string;
  title: string;
  createdFrom: "file" | "csv" | "paste";
  sourcePath?: string;
  importedAt: string;
  summary: string;
  contentHash?: string;
  rawInputRef?: string;
  tags?: string[];
}

export interface CaseRecord {
  id: string;
  title: string;
  status: "active" | "draft" | "muted" | "archived";
  taskType: string;
  createdFrom: string;
  updatedAt?: string;
  incidentId?: string;
  priority?: "low" | "medium" | "high" | "critical";
  tags?: string[];
  source?: {
    importedAt?: string;
    sourcePath?: string;
    rawInputRef?: string;
    contentHash?: string;
  };
  incident?: {
    summary: string;
    failureReason: string;
  };
  expectedBehavior: {
    summary: string;
    must?: string[];
    mustNot?: string[];
  };
  check: {
    type: "contains" | "not_contains" | "equals" | "regex" | "semantic" | "llm_judge";
    config: Record<string, unknown>;
  };
  notes: {
    generatedBy: string;
    reviewStatus: "needs_review" | "auto_high_confidence" | "reviewed";
    confidence?: "low" | "medium" | "high";
    reviewedBy?: string;
    reviewNote?: string;
  };
}

export type CaseRunStatus = "passed" | "failed" | "skipped" | "invalid";
export type CaseRunReason =
  | "passed"
  | "check_failed"
  | "missing_response"
  | "unsupported_check"
  | "archived"
  | "muted"
  | "draft"
  | "review_needed"
  | "invalid_config";

export interface CaseRunResult {
  caseId: string;
  title: string;
  status: CaseRunStatus;
  checkType: CaseRecord["check"]["type"];
  reason?: CaseRunReason;
  caseStatus?: CaseRecord["status"];
  reviewStatus?: CaseRecord["notes"]["reviewStatus"];
  priority?: CaseRecord["priority"];
  tags?: string[];
  responsePath?: string;
  message: string;
}

export interface RunReport {
  id: string;
  createdAt: string;
  profile: RunProfile;
  totals: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    invalid: number;
  };
  results: CaseRunResult[];
}
