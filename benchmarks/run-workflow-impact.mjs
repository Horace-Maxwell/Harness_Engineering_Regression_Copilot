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
    input: options.input,
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

async function withWorkspace(prefix, callback) {
  const workspace = await mkdtemp(path.join(tmpdir(), prefix));
  try {
    return await callback(workspace);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function supportOpsImportFlow(iterations = 5, incidentCount = 50) {
  const samples = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    await withWorkspace("airc-impact-import-", async (workspace) => {
      const rows = Array.from({ length: incidentCount }, (_, index) => ({
        message: `Customer asked for refund policy on order ${index + 1}, but the answer did not mention refund policy.`,
        tags: ["support", "refunds"],
      }));
      const inputPath = path.join(workspace, "incidents.jsonl");
      await writeFile(inputPath, rows.map((row) => JSON.stringify(row)).join("\n"), "utf8");

      const startedAt = performance.now();
      let result = runNode(["init"], { cwd: workspace });
      if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
      result = runNode(["import", inputPath], { cwd: workspace });
      if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
      result = runNode(["distill"], { cwd: workspace });
      if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
      const listResult = runNode(["list", "--json"], { cwd: workspace });
      if (listResult.status !== 0) {
        throw new Error(listResult.stderr || listResult.stdout);
      }
      const parsed = JSON.parse(listResult.stdout);
      const createdCases = parsed.cases.filter((record) => record.id !== "sample_case").length;
      samples.push({
        elapsedMs: performance.now() - startedAt,
        createdCases,
      });
    });
  }

  const durations = samples.map((sample) => sample.elapsedMs);
  return {
    iterations,
    incidentCount,
    medianMs: round(median(durations)),
    p90Ms: round(percentile(durations, 90)),
    createdCasesPerRun: samples.map((sample) => sample.createdCases),
    medianCreatedCases: median(samples.map((sample) => sample.createdCases)),
  };
}

async function engineerReproFlow(iterations = 10) {
  const samples = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    await withWorkspace("airc-impact-repro-", async (workspace) => {
      const startedAt = performance.now();
      let result = runNode(["init"], { cwd: workspace });
      if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
      result = runNode(["import", "--paste"], {
        cwd: workspace,
        input: "The answer did not mention refund policy.\n",
      });
      if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
      result = runNode(["distill"], { cwd: workspace });
      if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
      result = runNode(["run", "case_001", "--response", "We can help.", "--format", "json"], {
        cwd: workspace,
      });
      if (result.status !== 1) {
        throw new Error(`Expected failing run, got ${result.status}.`);
      }
      const parsed = JSON.parse(result.stdout);
      samples.push({
        elapsedMs: performance.now() - startedAt,
        failedCount: parsed.totals.failed,
      });
    });
  }

  const durations = samples.map((sample) => sample.elapsedMs);
  return {
    iterations,
    medianMs: round(median(durations)),
    p90Ms: round(percentile(durations, 90)),
    medianFailedCases: median(samples.map((sample) => sample.failedCount)),
  };
}

async function qaReviewFlow(iterations = 10) {
  const samples = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    await withWorkspace("airc-impact-review-", async (workspace) => {
      const startedAt = performance.now();
      let result = runNode(["init"], { cwd: workspace });
      if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
      result = runNode([
        "create-case",
        "Must mention refund policy",
        "--check-type",
        "contains",
        "--value",
        "refund policy",
      ], { cwd: workspace });
      if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
      result = runNode([
        "accept",
        "case_001",
        "--reviewer",
        "qa",
        "--response",
        "Please mention the refund policy in the reply.",
      ], { cwd: workspace });
      if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
      result = runNode(["run", "case_001", "--format", "json"], { cwd: workspace });
      if (result.status !== 0) {
        throw new Error(`Expected passing run, got ${result.status}.`);
      }
      const parsed = JSON.parse(result.stdout);
      samples.push({
        elapsedMs: performance.now() - startedAt,
        passedCount: parsed.totals.passed,
      });
    });
  }

  const durations = samples.map((sample) => sample.elapsedMs);
  return {
    iterations,
    medianMs: round(median(durations)),
    p90Ms: round(percentile(durations, 90)),
    medianPassedCases: median(samples.map((sample) => sample.passedCount)),
  };
}

async function createReviewedWorkspace(caseCount = 100) {
  const workspace = await mkdtemp(path.join(tmpdir(), "airc-impact-ci-"));
  await mkdir(path.join(workspace, ".airc", "cases"), { recursive: true });
  await mkdir(path.join(workspace, ".airc", "responses"), { recursive: true });
  await mkdir(path.join(workspace, ".airc", "incidents"), { recursive: true });
  await mkdir(path.join(workspace, ".airc", "reports"), { recursive: true });
  await writeFile(
    path.join(workspace, ".airc", "config.yaml"),
    [
      "version: 1",
      "schemaVersion: 1",
      "projectName: airc-impact-ci",
      "defaultProfile: standard",
      "casesDir: .airc/cases",
      "incidentsDir: .airc/incidents",
      "reportsDir: .airc/reports",
      "responsesDir: .airc/responses",
      "",
    ].join("\n"),
    "utf8",
  );

  for (let index = 1; index <= caseCount; index += 1) {
    const id = `case_${String(index).padStart(3, "0")}`;
    const yaml = [
      `id: ${id}`,
      `title: Case ${index}`,
      "status: active",
      "taskType: chat",
      "createdFrom: manual",
      "updatedAt: 2026-04-09T00:00:00.000Z",
      "priority: low",
      "expectedBehavior:",
      "  summary: Include refund policy in the response.",
      "check:",
      "  type: contains",
      "  config:",
      "    value: refund policy",
      "notes:",
      "  generatedBy: benchmark",
      "  reviewStatus: reviewed",
      "  confidence: high",
      "  reviewedBy: benchmark",
      "",
    ].join("\n");
    await writeFile(path.join(workspace, ".airc", "cases", `${id}.yaml`), yaml, "utf8");
    await writeFile(path.join(workspace, ".airc", "responses", `${id}.txt`), "refund policy", "utf8");
  }

  return workspace;
}

async function ciChangedOnlyFlow(iterations = 3, caseCount = 5000, changedCount = 3) {
  const fullDurations = [];
  const changedDurations = [];
  const changedCaseTotals = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const workspace = await createReviewedWorkspace(caseCount);
    try {
      runCommand("git", ["init"], { cwd: workspace });
      runCommand("git", ["config", "user.email", "bench@example.com"], { cwd: workspace });
      runCommand("git", ["config", "user.name", "Benchmark"], { cwd: workspace });
      runCommand("git", ["add", "."], { cwd: workspace });
      runCommand("git", ["commit", "-m", "baseline"], { cwd: workspace });

      const fullResult = runNode(["run", "--profile", "standard", "--format", "json"], { cwd: workspace });
      if (fullResult.status !== 0) {
        throw new Error(fullResult.stderr || fullResult.stdout);
      }
      fullDurations.push(fullResult.elapsedMs);

      for (let index = 1; index <= changedCount; index += 1) {
        const id = `case_${String(index).padStart(3, "0")}`;
        const filePath = path.join(workspace, ".airc", "cases", `${id}.yaml`);
        const raw = await readFile(filePath, "utf8");
        await writeFile(filePath, raw.replace("Case", "Changed case"), "utf8");
      }

      const changedResult = runNode(["run", "--profile", "standard", "--changed", "--format", "json"], { cwd: workspace });
      if (changedResult.status !== 0) {
        throw new Error(changedResult.stderr || changedResult.stdout);
      }
      const parsed = JSON.parse(changedResult.stdout);
      changedDurations.push(changedResult.elapsedMs);
      changedCaseTotals.push(parsed.totals.total);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  const fullMedian = median(fullDurations);
  const changedMedian = median(changedDurations);
  return {
    iterations,
    fullSuiteCaseCount: caseCount,
    changedCaseCount: changedCount,
    fullMedianMs: round(fullMedian),
    changedMedianMs: round(changedMedian),
    speedupX: round(fullMedian / changedMedian),
    timeReductionPct: round(((fullMedian - changedMedian) / fullMedian) * 100),
    executedCaseReductionPct: round(((caseCount - median(changedCaseTotals)) / caseCount) * 100),
    changedTotals: changedCaseTotals,
  };
}

async function releaseSafetyFlow(reviewedCount = 15, unreviewedCount = 5) {
  return withWorkspace("airc-impact-release-", async (workspace) => {
    let result = runNode(["init"], { cwd: workspace });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }
    result = runNode(["set-status", "sample_case", "archived"], { cwd: workspace });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }

    for (let index = 1; index <= reviewedCount + unreviewedCount; index += 1) {
      result = runNode([
        "create-case",
        `Release case ${index}`,
        "--id",
        `case_${String(index).padStart(3, "0")}`,
        "--check-type",
        "contains",
        "--value",
        "refund policy",
      ], { cwd: workspace });
      if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
      const response = "Please follow the refund policy.";
      if (index <= reviewedCount) {
        result = runNode([
          "accept",
          `case_${String(index).padStart(3, "0")}`,
          "--reviewer",
          "release-qa",
          "--response",
          response,
        ], { cwd: workspace });
      } else {
        const responsePath = path.join(workspace, ".airc", "responses", `case_${String(index).padStart(3, "0")}.txt`);
        await mkdir(path.dirname(responsePath), { recursive: true });
        await writeFile(responsePath, response, "utf8");
      }
      if (index <= reviewedCount && result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
    }

    const standardResult = runNode(["run", "--profile", "standard", "--format", "json"], { cwd: workspace });
    const deepResult = runNode(["run", "--profile", "deep", "--format", "json"], { cwd: workspace });
    if (standardResult.status !== 0) {
      throw new Error(standardResult.stderr || standardResult.stdout);
    }
    if (deepResult.status !== 1) {
      throw new Error(`Expected deep run to fail gate, got ${deepResult.status}.`);
    }

    const standard = JSON.parse(standardResult.stdout);
    const deep = JSON.parse(deepResult.stdout);

    return {
      reviewedCount,
      unreviewedCount,
      standardPassed: standard.totals.passed,
      standardInvalid: standard.totals.invalid,
      deepPassed: deep.totals.passed,
      deepInvalid: deep.totals.invalid,
      deepBlockedUnreviewedRatePct: round((deep.totals.invalid / unreviewedCount) * 100),
    };
  });
}

const result = {
  measuredAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  methodology: {
    metrics: ["task_success", "time_on_task_ms", "manual_files", "manual_loc", "executed_cases", "blocked_unreviewed_cases"],
    note: "Role-based workflows were measured on local-first CLI paths that match AIRC's intended use.",
  },
  workflows: {
    supportOpsBatchImport: await supportOpsImportFlow(5, 50),
    aiEngineerReproToGate: await engineerReproFlow(10),
    qaReviewerAcceptAndPass: await qaReviewFlow(10),
    ciOwnerChangedOnlyGate: await ciChangedOnlyFlow(3, 5000, 3),
    releaseOwnerReviewEnforcement: await releaseSafetyFlow(15, 5),
  },
};

console.log(JSON.stringify(result, null, 2));
