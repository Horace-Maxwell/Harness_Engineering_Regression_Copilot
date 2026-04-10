import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
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

function round(value) {
  return Number(value.toFixed(1));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

async function listJsonReports(workspace) {
  const reportsDir = path.join(workspace, ".herc", "reports");
  const files = (await readdir(reportsDir))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();
  return files.map((file) => path.join(reportsDir, file));
}

async function createWorkspaceForComparison(caseCount = 40) {
  const workspace = await mkdtemp(path.join(tmpdir(), "herc-upgrade-compare-"));
  let result = runNode(["init"], { cwd: workspace });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  for (let index = 1; index <= caseCount; index += 1) {
    result = runNode([
      "create-case",
      `Must include token ${index}`,
      "--check-type",
      "contains",
      "--value",
      `token_${index}`,
    ], { cwd: workspace });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }
    result = runNode([
      "accept",
      `case_${String(index).padStart(3, "0")}`,
      "--reviewer",
      "qa",
      "--response",
      `Approved response includes token_${index}.`,
    ], { cwd: workspace });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout);
    }
  }

  result = runNode(["run"], { cwd: workspace });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  await writeFile(path.join(workspace, ".herc", "responses", "case_001.txt"), "Missing protected token.", "utf8");
  result = runNode(["run"], { cwd: workspace });
  if (result.status !== 1) {
    throw new Error(`Expected second run to fail, got ${result.status}.`);
  }

  return workspace;
}

async function measureComparisonWorkflow(iterations = 5) {
  const beforeSamples = [];
  const afterSamples = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const workspace = await createWorkspaceForComparison();
    try {
      const [currentReportPath, previousReportPath] = await listJsonReports(workspace);
      const previousId = path.basename(previousReportPath, ".json");
      const currentId = path.basename(currentReportPath, ".json");

      const baselineStartedAt = performance.now();
      const previous = runNode(["report", "--id", previousId, "--format", "json"], { cwd: workspace });
      const current = runNode(["report", "--id", currentId, "--format", "json"], { cwd: workspace });
      const manualDiff = spawnSync("node", [
        "-e",
        `
          const previous = JSON.parse(process.argv[1]);
          const current = JSON.parse(process.argv[2]);
          const previousById = new Map(previous.results.map((item) => [item.caseId, item.status]));
          const regressions = current.results
            .filter((item) => previousById.get(item.caseId) && previousById.get(item.caseId) !== item.status)
            .map((item) => \`\${item.caseId}: \${previousById.get(item.caseId)} -> \${item.status}\`);
          console.log(regressions.join("\\n"));
        `,
        previous.stdout,
        current.stdout,
      ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
      const baselineElapsedMs = performance.now() - baselineStartedAt;

      if (!manualDiff.stdout.includes("case_001: passed -> failed")) {
        throw new Error("Baseline comparison workflow did not detect the expected regression.");
      }

      const upgraded = runNode(["report", "--compare-previous"], { cwd: workspace });
      if (!upgraded.stdout.includes("case_001: passed -> failed")) {
        throw new Error("Upgraded comparison workflow did not detect the expected regression.");
      }

      beforeSamples.push(round(baselineElapsedMs));
      afterSamples.push(round(upgraded.elapsedMs));
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  return {
    iterations,
    before: {
      commands: 3,
      manualFiles: 0,
      manualLoc: 9,
      medianMs: round(median(beforeSamples)),
      rawSamplesMs: beforeSamples,
    },
    after: {
      commands: 1,
      manualFiles: 0,
      manualLoc: 0,
      medianMs: round(median(afterSamples)),
      rawSamplesMs: afterSamples,
    },
    improvements: {
      commandReductionPct: round(((3 - 1) / 3) * 100),
      manualLocReductionPct: 100,
      medianTimeReductionPct: round(((median(beforeSamples) - median(afterSamples)) / median(beforeSamples)) * 100),
    },
  };
}

async function createWorkspaceForChangedPreflight(caseCount = 1000) {
  const workspace = await mkdtemp(path.join(tmpdir(), "herc-upgrade-preflight-"));
  await mkdir(path.join(workspace, ".herc", "cases"), { recursive: true });
  await mkdir(path.join(workspace, ".herc", "responses"), { recursive: true });
  await mkdir(path.join(workspace, ".herc", "incidents"), { recursive: true });
  await mkdir(path.join(workspace, ".herc", "reports"), { recursive: true });

  await writeFile(
    path.join(workspace, ".herc", "config.yaml"),
    [
      "version: 1",
      "schemaVersion: 1",
      "projectName: herc-upgrade-preflight",
      "defaultProfile: standard",
      "casesDir: .herc/cases",
      "incidentsDir: .herc/incidents",
      "reportsDir: .herc/reports",
      "responsesDir: .herc/responses",
      "",
    ].join("\n"),
    "utf8",
  );

  for (let index = 1; index <= caseCount; index += 1) {
    const id = `case_${String(index).padStart(3, "0")}`;
    const yaml = [
      `id: ${id}`,
      `title: Preflight case ${index}`,
      "status: active",
      "taskType: chat",
      "createdFrom: manual",
      "updatedAt: 2026-04-10T00:00:00.000Z",
      "priority: low",
      "expectedBehavior:",
      `  summary: Include preflight_token_${index}.`,
      "check:",
      "  type: contains",
      "  config:",
      `    value: preflight_token_${index}`,
      "notes:",
      "  generatedBy: benchmark",
      "  reviewStatus: reviewed",
      "  confidence: high",
      "  reviewedBy: benchmark",
      "",
    ].join("\n");
    await writeFile(path.join(workspace, ".herc", "cases", `${id}.yaml`), yaml, "utf8");
    await writeFile(path.join(workspace, ".herc", "responses", `${id}.txt`), `Response includes preflight_token_${index}.`, "utf8");
  }

  return workspace;
}

async function measureChangedPreflightWorkflow(iterations = 3, caseCount = 1000) {
  const beforeSamples = [];
  const afterSamples = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const workspace = await createWorkspaceForChangedPreflight(caseCount);
    try {
      const fallbackRun = runNode(["run", "--changed", "--format", "json"], { cwd: workspace });
      if (fallbackRun.status !== 0) {
        throw new Error(fallbackRun.stderr || fallbackRun.stdout);
      }
      const fallbackParsed = JSON.parse(fallbackRun.stdout);
      if (fallbackParsed.changedAvailable !== false || fallbackParsed.totals.total !== caseCount) {
        throw new Error("Expected changed-only fallback to execute the full suite in a non-git workspace.");
      }

      const doctor = runNode(["doctor", "--quick", "--json"], { cwd: workspace });
      if (doctor.status !== 0) {
        throw new Error(doctor.stderr || doctor.stdout);
      }
      const doctorParsed = JSON.parse(doctor.stdout);
      const gitRepoCheck = doctorParsed.checks.find((check) => check.name === "git-repo");
      if (!gitRepoCheck || gitRepoCheck.status !== "warn") {
        throw new Error("Expected doctor to warn about non-git changed-only readiness.");
      }

      beforeSamples.push(round(fallbackRun.elapsedMs));
      afterSamples.push(round(doctor.elapsedMs));
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  return {
    iterations,
    suiteCaseCount: caseCount,
    before: {
      commands: 1,
      executedCases: caseCount,
      medianMs: round(median(beforeSamples)),
      rawSamplesMs: beforeSamples,
    },
    after: {
      commands: 1,
      executedCases: 0,
      medianMs: round(median(afterSamples)),
      rawSamplesMs: afterSamples,
    },
    improvements: {
      avoidedExecutedCases: caseCount,
      executedCaseReductionPct: 100,
      medianTimeReductionPct: round(((median(beforeSamples) - median(afterSamples)) / median(beforeSamples)) * 100),
    },
  };
}

async function measureGitignoreAutomation(iterations = 5) {
  const beforeSamples = [];
  const afterSamples = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const beforeWorkspace = await mkdtemp(path.join(tmpdir(), "herc-upgrade-gitignore-before-"));
    try {
      const beforeStartedAt = performance.now();
      const initResult = runNode(["init", "--no-sync-gitignore"], { cwd: beforeWorkspace });
      if (initResult.status !== 0) {
        throw new Error(initResult.stderr || initResult.stdout);
      }
      await writeFile(path.join(beforeWorkspace, ".gitignore"), [".herc/incidents", ".herc/reports", ".herc/responses", ""].join("\n"), "utf8");
      beforeSamples.push(round(performance.now() - beforeStartedAt));
    } finally {
      await rm(beforeWorkspace, { recursive: true, force: true });
    }

    const afterWorkspace = await mkdtemp(path.join(tmpdir(), "herc-upgrade-gitignore-after-"));
    try {
      const initResult = runNode(["init"], { cwd: afterWorkspace });
      if (initResult.status !== 0) {
        throw new Error(initResult.stderr || initResult.stdout);
      }
      const gitignore = await readFile(path.join(afterWorkspace, ".gitignore"), "utf8");
      if (!gitignore.includes(".herc/responses")) {
        throw new Error("Expected init to create recommended .gitignore entries.");
      }
      afterSamples.push(round(initResult.elapsedMs));
    } finally {
      await rm(afterWorkspace, { recursive: true, force: true });
    }
  }

  return {
    iterations,
    before: {
      commands: 1,
      manualFiles: 1,
      manualLoc: 3,
      medianMs: round(median(beforeSamples)),
      rawSamplesMs: beforeSamples,
    },
    after: {
      commands: 1,
      manualFiles: 0,
      manualLoc: 0,
      medianMs: round(median(afterSamples)),
      rawSamplesMs: afterSamples,
    },
    improvements: {
      manualFileReductionPct: 100,
      manualLocReductionPct: 100,
      medianTimeReductionPct: round(((median(beforeSamples) - median(afterSamples)) / median(beforeSamples)) * 100),
    },
  };
}

function loadJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

const adoption = loadJson("benchmarks/results/adoption-impact-results-2026-04-10.json");
const workflow = loadJson("benchmarks/results/workflow-impact-results-2026-04-10.json");

const result = {
  measuredAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  methodology: {
    experimentType: "workflow_upgrade_before_after",
    note: "Each benchmark compares the older manual workflow against the current upgraded HERC workflow on the same task shape.",
    references: {
      openaiEvalBestPractices: "https://developers.openai.com/api/docs/guides/evaluation-best-practices",
      langfuseExperiments: "https://langfuse.com/docs/evaluation/experiments/overview",
    },
  },
  qualityCarryOver: {
    weightedCorrectInstructionPctWithoutHerc: adoption.summary.weightedRawCorrectInstructionPctWithoutHerc,
    weightedCorrectInstructionPctWithUpdatedHercWorkflow: adoption.summary.weightedCorrectInstructionPctWithHercAfterFix,
    weightedCorrectnessLiftPctPoints: adoption.summary.weightedCorrectnessLiftPctPoints,
    weightedFailureLeakageReductionPct: adoption.summary.weightedFailureLeakageReductionPct,
  },
  workflowUpgradeImpact: {
    reportComparison: await measureComparisonWorkflow(5),
    changedPreflight: await measureChangedPreflightWorkflow(3, 1000),
    gitignoreAutomation: await measureGitignoreAutomation(5),
  },
  existingWorkflowReference: {
    supportOpsBatchImportMedianMs: workflow.workflows.supportOpsBatchImport.medianMs,
    aiEngineerReproToGateMedianMs: workflow.workflows.aiEngineerReproToGate.medianMs,
    qaReviewerAcceptAndPassMedianMs: workflow.workflows.qaReviewerAcceptAndPass.medianMs,
    largeSuiteChangedOnlyTimeReductionPct: workflow.workflows.ciOwnerChangedOnlyGate.timeReductionPct,
    largeSuiteChangedOnlyExecutedCaseReductionPct: workflow.workflows.ciOwnerChangedOnlyGate.executedCaseReductionPct,
  },
};

console.log(JSON.stringify(result, null, 2));
