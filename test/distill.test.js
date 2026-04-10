import test from "node:test";
import assert from "node:assert/strict";

import {
  inferCheck,
  inferExpectedBehavior,
  inferPriority,
  inferTags,
  inferTaskType,
} from "../dist/lib/distill.js";

test("inferTaskType detects rag-style incidents", () => {
  const incident = {
    id: "incident_1",
    title: "The response did not mention refund policy",
    createdFrom: "paste",
    importedAt: new Date().toISOString(),
    summary: "The answer was not grounded in policy.",
  };

  assert.equal(inferTaskType(incident), "rag_qa");
});

test("inferCheck produces contains checks for omission incidents", () => {
  const incident = {
    id: "incident_2",
    title: "The response did not mention refund policy",
    createdFrom: "paste",
    importedAt: new Date().toISOString(),
    summary: "Missing refund policy details.",
  };

  assert.deepEqual(inferCheck(incident), {
    type: "contains",
    config: { value: "refund policy" },
  });
});

test("inferCheck treats forgot-style omission incidents as deterministic contains checks", () => {
  const incident = {
    id: "incident_2b",
    title: "The answer forgot the refund policy",
    createdFrom: "paste",
    importedAt: new Date().toISOString(),
    summary: "The assistant left out the refund policy details in the reply.",
  };

  assert.deepEqual(inferCheck(incident), {
    type: "contains",
    config: { value: "refund policy" },
  });
});

test("inferExpectedBehavior creates readable deterministic guidance", () => {
  const incident = {
    id: "incident_3",
    title: "The response did not mention refund policy",
    createdFrom: "paste",
    importedAt: new Date().toISOString(),
    summary: "Missing refund policy details.",
  };

  assert.deepEqual(inferExpectedBehavior(incident), {
    summary: "Include refund policy in the response.",
    must: ["Include refund policy."],
  });
});

test("inferPriority and inferTags add useful metadata", () => {
  const incident = {
    id: "incident_4",
    title: "Agent skipped approval for a refund request",
    createdFrom: "paste",
    importedAt: new Date().toISOString(),
    summary: "The workflow skipped a required approval step for a refund.",
  };

  assert.equal(inferPriority(incident), "high");
  assert.deepEqual(inferTags(incident).sort(), ["agent", "approval", "refunds", "workflow"]);
});
