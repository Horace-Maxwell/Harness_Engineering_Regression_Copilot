import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cliPath = path.join(root, "dist", "cli.js");

function runNode(args, options = {}) {
  const startedAt = performance.now();
  const result = spawnSync("node", [cliPath, ...args], {
    cwd: options.cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const elapsedMs = performance.now() - startedAt;
  return { ...result, elapsedMs };
}

function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function round(value) {
  return Number(value.toFixed(1));
}

function caseId(index) {
  return `case_${String(index).padStart(3, "0")}`;
}

function tokenFor(index) {
  return `instruction_token_${String(index).padStart(3, "0")}`;
}

function titleFor(index) {
  return `Instruction case ${index}`;
}

function buildCaseYaml(index, changed = false) {
  const id = caseId(index);
  const token = tokenFor(index);
  const title = changed ? `Changed instruction case ${index}` : titleFor(index);
  return [
    `id: ${id}`,
    `title: ${title}`,
    "status: active",
    "taskType: chat",
    "createdFrom: manual",
    "updatedAt: 2026-04-10T00:00:00.000Z",
    "priority: medium",
    "expectedBehavior:",
    `  summary: The response must include ${token}.`,
    "check:",
    "  type: contains",
    "  config:",
    `    value: ${token}`,
    "notes:",
    "  generatedBy: adoption_benchmark",
    "  reviewStatus: reviewed",
    "  confidence: high",
    "  reviewedBy: benchmark",
    "",
  ].join("\n");
}

function buildPassingResponse(index, changed = false) {
  const token = tokenFor(index);
  if (changed) {
    return `Updated workflow still follows ${token} and keeps the instruction valid.`;
  }
  return `Baseline workflow follows ${token} and satisfies the instruction.`;
}

function buildBrokenResponse(index) {
  return `This candidate response dropped the protected instruction for case ${index}.`;
}

async function createBaselineWorkspace(totalCases) {
  const workspace = await mkdtemp(path.join(tmpdir(), "herc-adoption-"));
  await mkdir(path.join(workspace, ".herc", "cases"), { recursive: true });
  await mkdir(path.join(workspace, ".herc", "responses"), { recursive: true });
  await mkdir(path.join(workspace, ".herc", "incidents"), { recursive: true });
  await mkdir(path.join(workspace, ".herc", "reports"), { recursive: true });

  await writeFile(
    path.join(workspace, ".herc", "config.yaml"),
    [
      "version: 1",
      "schemaVersion: 1",
      "projectName: herc-adoption-benchmark",
      "defaultProfile: standard",
      "casesDir: .herc/cases",
      "incidentsDir: .herc/incidents",
      "reportsDir: .herc/reports",
      "responsesDir: .herc/responses",
      "",
    ].join("\n"),
    "utf8",
  );

  for (let index = 1; index <= totalCases; index += 1) {
    await writeFile(path.join(workspace, ".herc", "cases", `${caseId(index)}.yaml`), buildCaseYaml(index), "utf8");
    await writeFile(path.join(workspace, ".herc", "responses", `${caseId(index)}.txt`), buildPassingResponse(index), "utf8");
  }

  runCommand("git", ["init"], { cwd: workspace });
  runCommand("git", ["config", "user.email", "benchmark@example.com"], { cwd: workspace });
  runCommand("git", ["config", "user.name", "Benchmark"], { cwd: workspace });
  runCommand("git", ["add", "."], { cwd: workspace });
  runCommand("git", ["commit", "-m", "baseline"], { cwd: workspace });

  return workspace;
}

async function mutateCandidate(workspace, changedCount, brokenCount) {
  const changedIds = [];
  const brokenIds = [];

  for (let index = 1; index <= changedCount; index += 1) {
    const id = caseId(index);
    changedIds.push(id);
    await writeFile(path.join(workspace, ".herc", "cases", `${id}.yaml`), buildCaseYaml(index, true), "utf8");

    if (index <= brokenCount) {
      brokenIds.push(id);
      await writeFile(path.join(workspace, ".herc", "responses", `${id}.txt`), buildBrokenResponse(index), "utf8");
    } else {
      await writeFile(path.join(workspace, ".herc", "responses", `${id}.txt`), buildPassingResponse(index, true), "utf8");
    }
  }

  return { changedIds, brokenIds };
}

async function restoreBrokenResponses(workspace, brokenIds) {
  for (const id of brokenIds) {
    const index = Number(id.split("_")[1]);
    await writeFile(path.join(workspace, ".herc", "responses", `${id}.txt`), buildPassingResponse(index, true), "utf8");
  }
}

function failedCaseIdsFromReport(report) {
  return report.results.filter((result) => result.status === "failed").map((result) => result.caseId).sort();
}

function invalidCaseIdsFromReport(report) {
  return report.results.filter((result) => result.status === "invalid").map((result) => result.caseId).sort();
}

async function measureScenario(definition) {
  const fullRunMs = [];
  const changedRunMs = [];
  const postFixChangedRunMs = [];
  const rawCorrectPct = [];
  const postFixCorrectPct = [];
  const changedExecuted = [];
  const changedFailed = [];
  const changedInvalid = [];

  for (let iteration = 0; iteration < definition.iterations; iteration += 1) {
    const workspace = await createBaselineWorkspace(definition.totalCases);

    try {
      const { brokenIds } = await mutateCandidate(workspace, definition.changedCases, definition.brokenCases);

      const fullRun = runNode(["run", "--profile", "standard", "--format", "json"], { cwd: workspace });
      if (fullRun.status !== 1) {
        throw new Error(`Expected full run to fail for ${definition.id}, got status ${fullRun.status}.`);
      }
      const fullReport = JSON.parse(fullRun.stdout);
      const fullFailedIds = failedCaseIdsFromReport(fullReport);

      const changedRun = runNode(["run", "--profile", "standard", "--changed", "--format", "json"], { cwd: workspace });
      if (changedRun.status !== 1) {
        throw new Error(`Expected changed run to fail for ${definition.id}, got status ${changedRun.status}.`);
      }
      const changedReport = JSON.parse(changedRun.stdout);
      const changedFailedIds = failedCaseIdsFromReport(changedReport);
      const changedInvalidIds = invalidCaseIdsFromReport(changedReport);

      if (fullFailedIds.length !== brokenIds.length || changedFailedIds.length !== brokenIds.length) {
        throw new Error(`Detection mismatch in ${definition.id}. Expected ${brokenIds.length} broken cases.`);
      }

      fullRunMs.push(fullRun.elapsedMs);
      changedRunMs.push(changedRun.elapsedMs);
      rawCorrectPct.push(round((fullReport.totals.passed / fullReport.totals.total) * 100));
      changedExecuted.push(changedReport.totals.total);
      changedFailed.push(changedFailedIds.length);
      changedInvalid.push(changedInvalidIds.length);

      await restoreBrokenResponses(workspace, brokenIds);

      const fixedChangedRun = runNode(["run", "--profile", "standard", "--changed", "--format", "json"], { cwd: workspace });
      if (fixedChangedRun.status !== 0) {
        throw new Error(`Expected post-fix changed run to pass for ${definition.id}, got status ${fixedChangedRun.status}.`);
      }
      const fixedChangedReport = JSON.parse(fixedChangedRun.stdout);
      postFixChangedRunMs.push(fixedChangedRun.elapsedMs);
      postFixCorrectPct.push(round((fixedChangedReport.totals.passed / fixedChangedReport.totals.total) * 100));
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  const rawMedianPct = median(rawCorrectPct);
  const postFixMedianPct = median(postFixCorrectPct);
  const fullMedianMs = median(fullRunMs);
  const changedMedianMs = median(changedRunMs);
  const postFixChangedMedianMs = median(postFixChangedRunMs);
  const changedMedianExecuted = median(changedExecuted);

  return {
    ...definition,
    control: {
      shippedCorrectInstructionPct: round(rawMedianPct),
      shippedIncorrectInstructionPct: round(100 - rawMedianPct),
      brokenHistoricalInstructions: definition.brokenCases,
    },
    treatment: {
      gateDetectedFailures: median(changedFailed),
      gateDetectedInvalid: median(changedInvalid),
      detectionRecallPct: round((median(changedFailed) / definition.brokenCases) * 100),
      falsePositiveCount: round(median(changedFailed) - definition.brokenCases),
      changedCasesExecuted: changedMedianExecuted,
      changedExecutionReductionPct: round(((definition.totalCases - changedMedianExecuted) / definition.totalCases) * 100),
      fullGateMedianMs: round(fullMedianMs),
      changedGateMedianMs: round(changedMedianMs),
      changedGateP90Ms: round(percentile(changedRunMs, 90)),
      postFixChangedGateMedianMs: round(postFixChangedMedianMs),
      shippedCorrectInstructionPctAfterFix: round(postFixMedianPct),
      shippedIncorrectInstructionPctAfterFix: round(100 - postFixMedianPct),
      correctnessLiftPctPoints: round(postFixMedianPct - rawMedianPct),
      failureLeakageReductionPct: round(
        ((100 - rawMedianPct) - (100 - postFixMedianPct)) / Math.max(100 - rawMedianPct, 0.1) * 100,
      ),
    },
    rawSamples: {
      rawCorrectPct,
      fullRunMs: fullRunMs.map(round),
      changedRunMs: changedRunMs.map(round),
      postFixChangedRunMs: postFixChangedRunMs.map(round),
    },
  };
}

const scenarios = [
  {
    id: "customer-policy-hotfix",
    label: "Customer policy hotfix",
    totalCases: 20,
    changedCases: 4,
    brokenCases: 4,
    iterations: 5,
  },
  {
    id: "support-routing-refresh",
    label: "Support routing refresh",
    totalCases: 50,
    changedCases: 10,
    brokenCases: 8,
    iterations: 5,
  },
  {
    id: "agent-tool-contract-update",
    label: "Agent tool contract update",
    totalCases: 100,
    changedCases: 16,
    brokenCases: 12,
    iterations: 5,
  },
  {
    id: "rag-policy-release",
    label: "RAG policy release",
    totalCases: 250,
    changedCases: 25,
    brokenCases: 18,
    iterations: 3,
  },
  {
    id: "weekly-release-train",
    label: "Weekly release train",
    totalCases: 500,
    changedCases: 40,
    brokenCases: 24,
    iterations: 3,
  },
];

const measuredScenarios = [];
for (const scenario of scenarios) {
  measuredScenarios.push(await measureScenario(scenario));
}

const totalCases = measuredScenarios.reduce((sum, scenario) => sum + scenario.totalCases, 0);
const totalBroken = measuredScenarios.reduce((sum, scenario) => sum + scenario.brokenCases, 0);
const weightedRawCorrectPct = round(((totalCases - totalBroken) / totalCases) * 100);
const weightedChangedCases = measuredScenarios.reduce((sum, scenario) => sum + scenario.changedCases, 0);

const summary = {
  totalScenarioCount: measuredScenarios.length,
  weightedTotalProtectedInstructions: totalCases,
  weightedRawCorrectInstructionPctWithoutHerc: weightedRawCorrectPct,
  weightedIncorrectInstructionPctWithoutHerc: round(100 - weightedRawCorrectPct),
  weightedCorrectInstructionPctWithHercAfterFix: 100,
  weightedCorrectnessLiftPctPoints: round(100 - weightedRawCorrectPct),
  weightedFailureLeakageReductionPct: 100,
  weightedChangedCaseSharePct: round((weightedChangedCases / totalCases) * 100),
  weightedExecutionReductionPctWithChangedOnly: round(((totalCases - weightedChangedCases) / totalCases) * 100),
  medianChangedGateMsAcrossScenarios: round(median(measuredScenarios.map((scenario) => scenario.treatment.changedGateMedianMs))),
  medianFullGateMsAcrossScenarios: round(median(measuredScenarios.map((scenario) => scenario.treatment.fullGateMedianMs))),
};

const result = {
  measuredAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  methodology: {
    experimentType: "before_after_controlled_release_gate",
    note:
      "The control ships the same candidate without a regression gate. The treatment runs HERC before merge, fixes only the failed protected cases, and re-runs the changed gate.",
    protectedInstructionType: "deterministic contains checks derived from historical instruction requirements",
  },
  summary,
  scenarios: measuredScenarios,
};

console.log(JSON.stringify(result, null, 2));
