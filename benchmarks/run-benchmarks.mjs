import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import https from "node:https";
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
  });
  const elapsedMs = performance.now() - startedAt;
  return { ...result, elapsedMs };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function round(value) {
  return Number(value.toFixed(1));
}

function countNonCommentLoc(filePath) {
  const raw = readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .length;
}

async function measureRawFailureFlow(iterations = 10) {
  const samples = [];

  for (let index = 0; index < iterations; index += 1) {
    const workspace = await mkdtemp(path.join(tmpdir(), "herc-bench-raw-"));
    const startedAt = performance.now();
    try {
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
        throw new Error(`Expected failing gate, got status ${result.status}.`);
      }

      samples.push(performance.now() - startedAt);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  return {
    iterations,
    medianMs: round(median(samples)),
    p90Ms: round(percentile(samples, 90)),
    minMs: round(Math.min(...samples)),
    maxMs: round(Math.max(...samples)),
    rawSamplesMs: samples.map(round),
  };
}

async function measureManualCaseFlow(iterations = 10) {
  const samples = [];

  for (let index = 0; index < iterations; index += 1) {
    const workspace = await mkdtemp(path.join(tmpdir(), "herc-bench-manual-"));
    const startedAt = performance.now();
    try {
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
        throw new Error(`Expected passing gate, got status ${result.status}.`);
      }

      samples.push(performance.now() - startedAt);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  return {
    iterations,
    medianMs: round(median(samples)),
    p90Ms: round(percentile(samples, 90)),
    minMs: round(Math.min(...samples)),
    maxMs: round(Math.max(...samples)),
    rawSamplesMs: samples.map(round),
  };
}

async function createLargeWorkspace(caseCount = 100) {
  const workspace = await mkdtemp(path.join(tmpdir(), "herc-bench-run-"));
  await mkdir(path.join(workspace, ".herc", "cases"), { recursive: true });
  await mkdir(path.join(workspace, ".herc", "responses"), { recursive: true });
  await mkdir(path.join(workspace, ".herc", "incidents"), { recursive: true });
  await mkdir(path.join(workspace, ".herc", "reports"), { recursive: true });
  await writeFile(
    path.join(workspace, ".herc", "config.yaml"),
    [
      "version: 1",
      "schemaVersion: 1",
      "projectName: herc-benchmark",
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
      `title: Benchmark case ${index}`,
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
    await writeFile(path.join(workspace, ".herc", "cases", `${id}.yaml`), yaml, "utf8");
    await writeFile(path.join(workspace, ".herc", "responses", `${id}.txt`), "refund policy", "utf8");
  }

  return workspace;
}

async function measureHundredCaseRun(iterations = 5, caseCount = 100) {
  const samples = [];

  for (let index = 0; index < iterations; index += 1) {
    const workspace = await createLargeWorkspace(caseCount);
    try {
      const result = runNode(["run", "--profile", "standard", "--format", "json"], { cwd: workspace });
      if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
      }
      samples.push(result.elapsedMs);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }

  return {
    caseCount,
    iterations,
    medianMs: round(median(samples)),
    p90Ms: round(percentile(samples, 90)),
    minMs: round(Math.min(...samples)),
    maxMs: round(Math.max(...samples)),
    rawSamplesMs: samples.map(round),
  };
}

function npmJson(args) {
  const result = spawnSync("npm", args, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  return result.stdout.trim();
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function packageFootprints() {
  const packJson = JSON.parse(npmJson(["pack", "--dry-run", "--json"]));
  const localPack = Array.isArray(packJson) ? packJson[0] : packJson;
  const promptfooView = npmJson(["view", "promptfoo@latest", "dist.unpackedSize", "version", "--json"]);
  const promptfoo = JSON.parse(promptfooView);
  const deepeval = await fetchJson("https://pypi.org/pypi/deepeval/json");

  return {
    herc: {
      version: localPack.version,
      packageSizeBytes: localPack.size,
      unpackedSizeBytes: localPack.unpackedSize,
      fileCount: localPack.files?.length ?? null,
    },
    promptfoo: {
      version: promptfoo.version,
      unpackedSizeBytes: promptfoo["dist.unpackedSize"],
    },
    deepeval: {
      version: deepeval.info.version,
      releaseArtifactSizeBytes: deepeval.urls.reduce((sum, item) => sum + (item.size ?? 0), 0),
      releaseFileCount: deepeval.urls.length,
    },
  };
}

const promptfooFixture = path.join(root, "benchmarks", "fixtures", "promptfoo-logged-output", "promptfooconfig.yaml");
const deepevalFixture = path.join(root, "benchmarks", "fixtures", "deepeval-quickstart", "test_chatbot.py");

const result = {
  measuredAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  methodology: {
    hercRawFailure: {
      commands: 4,
      manualFiles: 0,
      manualLoc: 0,
      description: "init -> import --paste -> distill -> run case_001",
    },
    promptfooLoggedOutput: {
      commandsAfterConfig: 1,
      manualFiles: 1,
      manualLoc: countNonCommentLoc(promptfooFixture),
      description: "promptfooconfig.yaml using the official Echo Provider pattern for logged outputs",
    },
    deepevalQuickstart: {
      shellStepsShownInQuickstart: 5,
      manualFiles: 1,
      manualLoc: countNonCommentLoc(deepevalFixture),
      requiresApiKeyInQuickstart: true,
      description: "official GitHub QuickStart using GEval and OPENAI_API_KEY",
    },
  },
  benchmarks: {
    rawFailureToFirstFail: await measureRawFailureFlow(10),
    manualCaseToPass: await measureManualCaseFlow(10),
    runHundredDeterministicCases: await measureHundredCaseRun(5, 100),
  },
  packageFootprints: await packageFootprints(),
};

console.log(JSON.stringify(result, null, 2));
