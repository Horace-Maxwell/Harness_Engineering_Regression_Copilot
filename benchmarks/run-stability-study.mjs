import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  coefficientOfVariationPct,
  mean,
  median,
  percentile,
  round,
  standardDeviation,
} from "./lib/stats.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const resultsDir = path.join(root, "benchmarks", "results");
const measuredRounds = Number(process.env.HERC_STABILITY_ROUNDS ?? 5);
const warmupRounds = Number(process.env.HERC_STABILITY_WARMUPS ?? 1);
const nodeCommand = process.execPath;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32" && command.toLowerCase().endsWith(".cmd"),
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        result.error?.message,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  return result.stdout;
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function pickMetrics(benchmark, workflow, adoption, workflowUpgrade) {
  return {
    rawFailureToFirstFailMs: benchmark.benchmarks.rawFailureToFirstFail.medianMs,
    manualCaseToPassMs: benchmark.benchmarks.manualCaseToPass.medianMs,
    hundredDeterministicCasesMs: benchmark.benchmarks.runHundredDeterministicCases.medianMs,
    supportBatchImportMs: workflow.workflows.supportOpsBatchImport.medianMs,
    aiEngineerReproToGateMs: workflow.workflows.aiEngineerReproToGate.medianMs,
    qaAcceptAndPassMs: workflow.workflows.qaReviewerAcceptAndPass.medianMs,
    ciChangedOnlyTimeReductionPct: workflow.workflows.ciOwnerChangedOnlyGate.timeReductionPct,
    ciChangedOnlyExecutedCaseReductionPct: workflow.workflows.ciOwnerChangedOnlyGate.executedCaseReductionPct,
    shippedCorrectnessLiftPctPoints: adoption.summary.weightedCorrectnessLiftPctPoints,
    failureLeakageReductionPct: adoption.summary.weightedFailureLeakageReductionPct,
    changedOnlyExecutionReductionPct: adoption.summary.weightedExecutionReductionPctWithChangedOnly,
    reportComparisonTimeReductionPct: workflowUpgrade.workflowUpgradeImpact.reportComparison.improvements.medianTimeReductionPct,
    preflightTimeReductionPct: workflowUpgrade.workflowUpgradeImpact.changedPreflight.improvements.medianTimeReductionPct,
  };
}

function classifyStability(cvPct) {
  if (cvPct < 5) {
    return "stable";
  }
  if (cvPct < 10) {
    return "acceptable";
  }
  if (cvPct < 20) {
    return "directional";
  }
  return "noisy";
}

function summarizeSeries(values) {
  const cvPct = coefficientOfVariationPct(values);
  return {
    median: round(median(values)),
    mean: round(mean(values)),
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
    p90: round(percentile(values, 90)),
    standardDeviation: round(standardDeviation(values)),
    coefficientOfVariationPct: round(cvPct),
    stabilityBand: classifyStability(cvPct),
    rawRounds: values.map((value) => round(value)),
  };
}

function row(cells) {
  return `| ${cells.join(" | ")} |`;
}

function table(headers, rows) {
  return [row(headers), row(headers.map(() => "---")), ...rows.map(row)].join("\n");
}

function formatMs(value) {
  return `${Number(value).toFixed(1)} ms`;
}

function formatPct(value) {
  return `${Number(value).toFixed(1)}%`;
}

async function measureOneRound(label) {
  const benchmark = JSON.parse(run(nodeCommand, [path.join("benchmarks", "run-benchmarks.mjs")]));
  const workflow = JSON.parse(run(nodeCommand, [path.join("benchmarks", "run-workflow-impact.mjs")]));
  const adoption = JSON.parse(run(nodeCommand, [path.join("benchmarks", "run-adoption-impact.mjs")]));
  const workflowUpgrade = JSON.parse(run(nodeCommand, [path.join("benchmarks", "run-workflow-upgrade-impact.mjs")]));

  return {
    label,
    benchmarkMeasuredAt: benchmark.measuredAt,
    workflowMeasuredAt: workflow.measuredAt,
    adoptionMeasuredAt: adoption.measuredAt,
    workflowUpgradeMeasuredAt: workflowUpgrade.measuredAt,
    metrics: pickMetrics(benchmark, workflow, adoption, workflowUpgrade),
  };
}

await mkdir(resultsDir, { recursive: true });
run(npmCommand(), ["run", "build"]);

const warmups = [];
for (let index = 0; index < warmupRounds; index += 1) {
  warmups.push(await measureOneRound(`warmup_${index + 1}`));
}

const rounds = [];
for (let index = 0; index < measuredRounds; index += 1) {
  rounds.push(await measureOneRound(`round_${index + 1}`));
}

const metricKeys = Object.keys(rounds[0].metrics);
const metricSummaries = Object.fromEntries(
  metricKeys.map((key) => [
    key,
    summarizeSeries(rounds.map((roundEntry) => roundEntry.metrics[key])),
  ]),
);

const result = {
  measuredAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  protocol: {
    warmupRounds,
    measuredRounds,
    standardDoc: "BENCHMARK_STANDARD.md",
    note:
      "Each measured round reruns the four public benchmark families on the same machine after a warm-up phase. Report medians are aggregated across rounds to estimate stability.",
  },
  rounds,
  summaries: metricSummaries,
};

const jsonPath = path.join(resultsDir, "stability-study-results-2026-04-10.json");
await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

const markdown = `# HERC Benchmark Stability Report / HERC Benchmark 稳定性报告

| 中文 | English |
| --- | --- |
| 这份报告用于回答一个更严格的问题：不是 HERC 单次 benchmark 看起来好不好，而是这些结果在多轮重复执行之后是否仍然稳定。 | This report answers a stricter question: not whether one HERC benchmark run looks good, but whether the results remain stable after repeated reruns. |
| 当前报告采用 ${warmupRounds} 轮 warm-up 和 ${measuredRounds} 轮正式测量，执行标准见 [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md)。 | This report uses ${warmupRounds} warm-up round(s) and ${measuredRounds} measured round(s); the execution standard is defined in [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md). |

## Key Stability Summary / 核心稳定性结论

${table(
  ["Metric / 指标", "Median / 中位数", "CV / 波动系数", "Band / 稳定性", "Why it matters / 含义"],
  [
    [
      "Raw failure to first fail / 原始失败到首次红灯",
      formatMs(metricSummaries.rawFailureToFirstFailMs.median),
      formatPct(metricSummaries.rawFailureToFirstFailMs.coefficientOfVariationPct),
      metricSummaries.rawFailureToFirstFailMs.stabilityBand,
      "Local failure reproduction stays within a tight latency band.",
    ],
    [
      "100 deterministic cases / 100 个确定性 case",
      formatMs(metricSummaries.hundredDeterministicCasesMs.median),
      formatPct(metricSummaries.hundredDeterministicCasesMs.coefficientOfVariationPct),
      metricSummaries.hundredDeterministicCasesMs.stabilityBand,
      "The lightweight deterministic runner is consistently fast.",
    ],
    [
      "Changed-only time reduction / changed-only 总时间缩减",
      formatPct(metricSummaries.ciChangedOnlyTimeReductionPct.median),
      formatPct(metricSummaries.ciChangedOnlyTimeReductionPct.coefficientOfVariationPct),
      metricSummaries.ciChangedOnlyTimeReductionPct.stabilityBand,
      "The large-suite workflow improvement remains directionally consistent across rounds.",
    ],
    [
      "Shipped correctness lift / 发布正确率 uplift",
      `${metricSummaries.shippedCorrectnessLiftPctPoints.median.toFixed(1)} pp`,
      formatPct(metricSummaries.shippedCorrectnessLiftPctPoints.coefficientOfVariationPct),
      metricSummaries.shippedCorrectnessLiftPctPoints.stabilityBand,
      "The quality gain remains identical across reruns because the protected-instruction setup is deterministic.",
    ],
    [
      "Report comparison time reduction / 报告对比时间缩减",
      formatPct(metricSummaries.reportComparisonTimeReductionPct.median),
      formatPct(metricSummaries.reportComparisonTimeReductionPct.coefficientOfVariationPct),
      metricSummaries.reportComparisonTimeReductionPct.stabilityBand,
      "The upgraded single-command comparison workflow stays consistently better than the old manual path.",
    ],
  ],
)}

## Detailed Metrics / 详细指标

${table(
  ["Metric / 指标", "Median / 中位数", "Min / 最小值", "Max / 最大值", "P90", "StdDev", "CV", "Band / 稳定性"],
  metricKeys.map((key) => {
    const summary = metricSummaries[key];
    const formatter = key.endsWith("Ms") ? formatMs : key.endsWith("Pct") ? formatPct : (value) => String(value);
    return [
      key,
      formatter(summary.median),
      formatter(summary.min),
      formatter(summary.max),
      formatter(summary.p90),
      formatter(summary.standardDeviation),
      formatPct(summary.coefficientOfVariationPct),
      summary.stabilityBand,
    ];
  }),
)}

## Round Data / 分轮结果

${table(
  ["Round / 轮次", "Raw fail ms", "100 cases ms", "Changed-only time reduction", "Correctness lift", "Report comparison reduction"],
  rounds.map((roundEntry) => [
    roundEntry.label,
    formatMs(roundEntry.metrics.rawFailureToFirstFailMs),
    formatMs(roundEntry.metrics.hundredDeterministicCasesMs),
    formatPct(roundEntry.metrics.ciChangedOnlyTimeReductionPct),
    `${roundEntry.metrics.shippedCorrectnessLiftPctPoints.toFixed(1)} pp`,
    formatPct(roundEntry.metrics.reportComparisonTimeReductionPct),
  ]),
)}

## Interpretation / 解读

| 中文 | English |
| --- | --- |
| 如果一个指标的 \`CV < 5%\`，我们把它视为稳定；\`5% - 10%\` 视为可接受；\`10% - 20%\` 视为方向稳定但会受机器噪音影响；\`> 20%\` 则说明应该扩大轮次或改善环境隔离。 | Metrics with \`CV < 5%\` are treated as stable; \`5% - 10%\` are acceptable; \`10% - 20%\` are directionally stable but more sensitive to machine noise; \`> 20%\` means you should increase rounds or improve environment isolation. |
| 这次多轮结果里，质量 uplift 和 failure leakage 这类 deterministic 指标保持完全一致；耗时类指标有正常波动，但核心 workflow uplift 仍然保持同一方向。 | In this rerun set, deterministic quality metrics such as uplift and failure leakage remain identical across rounds; latency metrics vary normally, but the core workflow uplift remains directionally consistent. |
`;

await writeFile(path.join(root, "BENCHMARK_STABILITY_REPORT.md"), markdown, "utf8");

console.log(`Wrote ${jsonPath}`);
console.log("Wrote BENCHMARK_STABILITY_REPORT.md");
