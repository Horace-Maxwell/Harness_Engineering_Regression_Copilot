import type { CaseRecord, IncidentRecord } from "../core/types.js";

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function inferTaskType(incident: IncidentRecord): CaseRecord["taskType"] {
  const text = `${incident.title} ${incident.summary}`.toLowerCase();

  if (/(rag|ground|policy|citation|source|knowledge base|kb|retriev)/.test(text)) {
    return "rag_qa";
  }
  if (/(agent|workflow|tool|step|approval|browser)/.test(text)) {
    return "agent_workflow";
  }
  if (/(classif|label|categor)/.test(text)) {
    return "classification";
  }
  if (/(summar|summary)/.test(text)) {
    return "summarization";
  }
  if (/(code|pull request|repo|issue|test)/.test(text)) {
    return "code_assistant";
  }

  return "chat";
}

export function inferTags(incident: IncidentRecord): string[] {
  const text = `${incident.title} ${incident.summary}`.toLowerCase();
  const tags = new Set<string>(incident.tags ?? []);

  if (text.includes("refund")) tags.add("refunds");
  if (text.includes("policy")) tags.add("policy");
  if (/(hallucinat|invent|fabricat|made up)/.test(text)) tags.add("hallucination");
  if (text.includes("approval")) tags.add("approval");
  if (text.includes("agent")) tags.add("agent");
  if (text.includes("workflow")) tags.add("workflow");
  if (text.includes("support")) tags.add("support");
  if (text.includes("rag")) tags.add("rag");

  return [...tags];
}

export function inferPriority(incident: IncidentRecord): NonNullable<CaseRecord["priority"]> {
  const text = `${incident.title} ${incident.summary}`.toLowerCase();

  if (/(security|unsafe|leak|pii|payment|refund|approval|compliance)/.test(text)) {
    return "high";
  }
  if (/(wrong|incorrect|error|mistake|failed)/.test(text)) {
    return "medium";
  }

  return "low";
}

export function inferFailureReason(incident: IncidentRecord): string {
  const text = `${incident.title} ${incident.summary}`.toLowerCase();

  if (/(hallucinat|invent|fabricat|made up)/.test(text)) {
    return "The response invented unsupported details.";
  }
  if (text.includes("did not mention")) {
    return "The response omitted a required detail.";
  }
  if (text.includes("skipped") && text.includes("approval")) {
    return "The workflow skipped a required approval step.";
  }
  if (text.includes("refund")) {
    return "The refund handling behavior did not match the expected policy.";
  }

  return "The behavior did not match the expected outcome described by the incident.";
}

function matchPhrase(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      return normalizeText(match[1]);
    }
  }

  return null;
}

export function inferCheck(incident: IncidentRecord): CaseRecord["check"] {
  const text = normalizeText(`${incident.title}. ${incident.summary}`);

  const mustContain = matchPhrase(text, [
    /(?:did not mention|missing|must mention|should mention|must include|should include)\s+["“]?([^"”.,]+)["”]?/i,
    /(?:answer should include|response should include)\s+["“]?([^"”.,]+)["”]?/i,
  ]);
  if (mustContain) {
    return {
      type: "contains",
      config: { value: mustContain },
    };
  }

  const mustAvoid = matchPhrase(text, [
    /(?:should not mention|should not include|must not include|must not mention|should not say)\s+["“]?([^"”.,]+)["”]?/i,
    /(?:invented|hallucinated|fabricated)\s+["“]?([^"”.,]+)["”]?/i,
  ]);
  if (mustAvoid) {
    return {
      type: "not_contains",
      config: { value: mustAvoid },
    };
  }

  return {
    type: "llm_judge",
    config: {
      rubric: "Response should avoid reproducing the previously observed failure and should satisfy the intended user request.",
    },
  };
}

export function inferExpectedBehavior(incident: IncidentRecord): CaseRecord["expectedBehavior"] {
  const rawText = `${incident.title}. ${incident.summary}`;
  const text = rawText.toLowerCase();

  const mustContain = matchPhrase(rawText, [
    /(?:did not mention|missing|must mention|should mention|must include|should include)\s+["“]?([^"”.,]+)["”]?/i,
    /(?:answer should include|response should include)\s+["“]?([^"”.,]+)["”]?/i,
  ]);
  if (mustContain) {
    return {
      summary: `Include ${mustContain} in the response.`,
      must: [`Include ${mustContain}.`],
    };
  }

  const mustAvoid = matchPhrase(rawText, [
    /(?:should not mention|should not include|must not include|must not mention|should not say)\s+["“]?([^"”.,]+)["”]?/i,
    /(?:invented|hallucinated|fabricated)\s+["“]?([^"”.,]+)["”]?/i,
  ]);
  if (mustAvoid) {
    return {
      summary: `Avoid mentioning ${mustAvoid} in the response.`,
      mustNot: [`Mention ${mustAvoid}.`],
    };
  }

  if (text.includes("refund") && (text.includes("45 days") || text.includes("30 days"))) {
    return {
      summary: "Stay aligned with the refund policy window and avoid approving unsupported refunds.",
      mustNot: ["Approve refunds outside the supported policy window."],
    };
  }

  if (text.includes("skipped") && text.includes("approval")) {
    return {
      summary: "Keep the required approval step in the workflow.",
      must: ["Include the approval step before completion."],
    };
  }

  if (/(hallucinat|invent|fabricat|made up)/.test(text)) {
    return {
      summary: "Stay grounded in the available information and avoid invented details.",
      mustNot: ["Invent unsupported details."],
    };
  }

  if (/(wrong|incorrect|error|mistake)/.test(text)) {
    return {
      summary: "Avoid the previously incorrect behavior and follow the intended policy or workflow.",
      mustNot: ["Repeat the previous incorrect behavior."],
    };
  }

  return {
    summary: "Review and replace with a behavior statement derived from this failure.",
    mustNot: ["Repeat the previously observed failure."],
  };
}

export function inferReviewStatus(check: CaseRecord["check"]): CaseRecord["notes"]["reviewStatus"] {
  if (check.type === "contains" || check.type === "not_contains" || check.type === "equals" || check.type === "regex") {
    return "auto_high_confidence";
  }

  return "needs_review";
}

export function inferConfidence(check: CaseRecord["check"]): NonNullable<CaseRecord["notes"]["confidence"]> {
  if (check.type === "contains" || check.type === "not_contains" || check.type === "equals" || check.type === "regex") {
    return "high";
  }

  if (check.type === "semantic") {
    return "medium";
  }

  return "low";
}
