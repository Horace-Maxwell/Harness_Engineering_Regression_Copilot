import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runCases } from "../dist/lib/run.js";

async function makeWorkspace() {
  const root = await mkdir(path.join(os.tmpdir(), `airc-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`), { recursive: true });
  await mkdir(path.join(root, ".airc", "responses"), { recursive: true });
  return root;
}

test("runCases passes deterministic contains checks", async () => {
  const root = await makeWorkspace();
  await writeFile(path.join(root, ".airc", "responses", "case_001.txt"), "refund policy", "utf8");

  const cases = [
    {
      id: "case_001",
      title: "Must mention refund policy",
      status: "draft",
      taskType: "rag_qa",
      createdFrom: "paste",
      expectedBehavior: { summary: "Include refund policy." },
      check: { type: "contains", config: { value: "refund policy" } },
      notes: { generatedBy: "test", reviewStatus: "reviewed" },
    },
  ];

  const { report } = await runCases(cases, "standard", root);
  assert.equal(report.totals.passed, 1);
  assert.equal(report.totals.failed, 0);
});

test("runCases supports equals and regex checks", async () => {
  const root = await makeWorkspace();
  await writeFile(path.join(root, ".airc", "responses", "case_equals.txt"), "APPROVED", "utf8");
  await writeFile(path.join(root, ".airc", "responses", "case_regex.txt"), "Order ID: 12345", "utf8");

  const cases = [
    {
      id: "case_equals",
      title: "Exact response",
      status: "draft",
      taskType: "chat",
      createdFrom: "manual",
      expectedBehavior: { summary: "Match exact response." },
      check: { type: "equals", config: { value: "approved", caseSensitive: false } },
      notes: { generatedBy: "test", reviewStatus: "reviewed" },
    },
    {
      id: "case_regex",
      title: "Regex response",
      status: "draft",
      taskType: "chat",
      createdFrom: "manual",
      expectedBehavior: { summary: "Match regex." },
      check: { type: "regex", config: { value: "Order ID: \\d+" } },
      notes: { generatedBy: "test", reviewStatus: "reviewed" },
    },
  ];

  const { report } = await runCases(cases, "standard", root);
  assert.equal(report.totals.passed, 2);
});

test("quick profile skips llm_judge cases", async () => {
  const root = await makeWorkspace();
  await writeFile(path.join(root, ".airc", "responses", "case_001.txt"), "some response", "utf8");

  const cases = [
    {
      id: "case_001",
      title: "Judge case",
      status: "active",
      taskType: "chat",
      createdFrom: "manual",
      expectedBehavior: { summary: "Use judge." },
      check: { type: "llm_judge", config: { rubric: "A rubric" } },
      notes: { generatedBy: "test", reviewStatus: "needs_review" },
    },
  ];

  const { report } = await runCases(cases, "quick", root);
  assert.equal(report.totals.skipped, 1);
  assert.equal(report.results[0].reason, "unsupported_check");
});

test("deep profile marks needs_review cases invalid", async () => {
  const root = await makeWorkspace();
  await writeFile(path.join(root, ".airc", "responses", "case_002.txt"), "refund policy", "utf8");

  const cases = [
    {
      id: "case_002",
      title: "Needs review first",
      status: "active",
      taskType: "chat",
      createdFrom: "manual",
      expectedBehavior: { summary: "Mention refund policy." },
      check: { type: "contains", config: { value: "refund policy" } },
      notes: { generatedBy: "test", reviewStatus: "needs_review" },
    },
  ];

  const { report } = await runCases(cases, "deep", root);
  assert.equal(report.totals.invalid, 1);
  assert.equal(report.results[0].reason, "review_needed");
});

test("runCases supports a custom responses directory", async () => {
  const root = await makeWorkspace();
  const responsesDir = path.join(root, "custom-responses");
  await mkdir(responsesDir, { recursive: true });
  await writeFile(path.join(responsesDir, "case_custom.txt"), "approved", "utf8");

  const cases = [
    {
      id: "case_custom",
      title: "Custom responses directory",
      status: "active",
      taskType: "chat",
      createdFrom: "manual",
      expectedBehavior: { summary: "Match exact response." },
      check: { type: "equals", config: { value: "approved" } },
      notes: { generatedBy: "test", reviewStatus: "reviewed" },
    },
  ];

  const { report } = await runCases(cases, "standard", root, { responsesDir });
  assert.equal(report.totals.passed, 1);
});
