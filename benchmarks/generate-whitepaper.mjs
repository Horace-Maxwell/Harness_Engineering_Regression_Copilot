import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");

function loadJson(relativePath) {
  return readFile(path.join(root, relativePath), "utf8").then((content) => JSON.parse(content));
}

function formatPct(value) {
  return `${Number(value).toFixed(1)}%`;
}

function formatMs(value) {
  return `${Number(value).toFixed(1)} ms`;
}

function formatIntervalPct(interval, pointKey = "pointPct", lowerKey = "lowerPct", upperKey = "upperPct") {
  return `${formatPct(interval[pointKey])} (95% CI ${formatPct(interval[lowerKey])} to ${formatPct(interval[upperKey])})`;
}

function formatIntervalPctPoints(interval) {
  return `${interval.pointPctPoints.toFixed(1)} pp (95% CI ${interval.lowerPctPoints.toFixed(1)} to ${interval.upperPctPoints.toFixed(1)} pp)`;
}

function row(cells) {
  return `| ${cells.join(" | ")} |`;
}

function table(headers, rows) {
  return [row(headers), row(headers.map(() => "---")), ...rows.map(row)].join("\n");
}

function stratificationRows(entries) {
  return entries.map((entry) => [
    entry.label,
    String(entry.scenarioCount),
    String(entry.totalProtectedInstructions),
    `${formatPct(entry.weightedRawCorrectInstructionPctWithoutHerc)} -> ${formatPct(entry.weightedCorrectInstructionPctWithHercAfterFix)}`,
    formatIntervalPctPoints(entry.confidenceIntervals95.upliftPctPoints),
    formatPct(entry.weightedExecutionReductionPctWithChangedOnly),
  ]);
}

const [benchmark, workflow, adoption, workflowUpgrade] = await Promise.all([
  loadJson("benchmarks/results/benchmark-results-2026-04-10.json"),
  loadJson("benchmarks/results/workflow-impact-results-2026-04-10.json"),
  loadJson("benchmarks/results/adoption-impact-results-2026-04-10.json"),
  loadJson("benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json"),
]);

const adoptionSummary = adoption.summary;
const ci = adoptionSummary.confidenceIntervals95;

const markdown = `# HERC Evaluation Whitepaper / HERC 评估白皮书

| 中文 | English |
| --- | --- |
| 这份白皮书整理了 HERC 当前公开 benchmark 的核心结果，并把原来偏“README 摘要”的数字补成更接近研究报告的结构：包含任务分层、95% 置信区间、工作流前后对照，以及部署体量与跨平台信息。 | This whitepaper consolidates HERC's public benchmarks into a more research-style package, extending the README summary with task stratification, 95% confidence intervals, before/after workflow comparisons, and deployment footprint data. |
| 当前文档基于仓库内公开结果文件生成，测量日期为 ${adoption.measuredAt}。 | This document is generated from the public result files in the repository, with measurements captured at ${adoption.measuredAt}. |
| 如果你想看这组结果在多轮重复执行后是否稳定，请继续查看 [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md) 和 [BENCHMARK_STABILITY_REPORT.md](BENCHMARK_STABILITY_REPORT.md)。 | If you want to see whether these results remain stable after repeated reruns, continue with [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md) and [BENCHMARK_STABILITY_REPORT.md](BENCHMARK_STABILITY_REPORT.md). |

## Abstract / 摘要

${table(
  ["Metric / 指标", "Result / 结果", "Meaning / 含义"],
  [
    [
      "Protected instruction correctness / 历史受保护指令正确率",
      `${formatPct(adoptionSummary.weightedRawCorrectInstructionPctWithoutHerc)} -> ${formatPct(adoptionSummary.weightedCorrectInstructionPctWithHercAfterFix)}; ${formatIntervalPctPoints(ci.weightedCorrectnessLiftPctPoints)}`,
      "HERC closes the last-mile gap between known historical failures and shipped behavior.",
    ],
    [
      "Failure leakage / 历史失败泄漏",
      formatPct(adoptionSummary.weightedFailureLeakageReductionPct),
      "Known historical failures stop leaking into the shipped candidate in this controlled release-gate setup.",
    ],
    [
      "Changed-only execution reduction / changed-only 执行面缩减",
      formatPct(adoptionSummary.weightedExecutionReductionPctWithChangedOnly),
      "Most protected instructions stay out of the critical-path run when only a narrow slice changed.",
    ],
    [
      "Regression triage improvement / 回归排查提升",
      `${formatMs(workflowUpgrade.workflowUpgradeImpact.reportComparison.before.medianMs)} -> ${formatMs(workflowUpgrade.workflowUpgradeImpact.reportComparison.after.medianMs)}`,
      "Comparing the latest run against the previous run becomes a single-command workflow.",
    ],
    [
      "Deployment footprint / 部署体量",
      `${(benchmark.packageFootprints.herc.packageSizeBytes / 1000).toFixed(1)} KB packed; ${benchmark.packageFootprints.herc.fileCount} files`,
      "The package remains lightweight enough for repo-local rollout and fast onboarding.",
    ],
  ],
)}

## Primary Findings / 核心发现

${table(
  ["Topic / 主题", "中文", "English"],
  [
    [
      "Overall quality uplift / 总体质量提升",
      `在 ${adoptionSummary.weightedTotalProtectedInstructions} 条历史受保护指令上，不使用 HERC 时加权正确率是 ${formatPct(adoptionSummary.weightedRawCorrectInstructionPctWithoutHerc)}，95% 置信区间为 ${formatPct(ci.weightedRawCorrectInstructionPctWithoutHerc.lowerPct)} 到 ${formatPct(ci.weightedRawCorrectInstructionPctWithoutHerc.upperPct)}；使用 HERC 后达到 ${formatPct(adoptionSummary.weightedCorrectInstructionPctWithHercAfterFix)}。`,
      `Across ${adoptionSummary.weightedTotalProtectedInstructions} protected historical instructions, weighted correctness is ${formatPct(adoptionSummary.weightedRawCorrectInstructionPctWithoutHerc)} without HERC, with a 95% confidence interval from ${formatPct(ci.weightedRawCorrectInstructionPctWithoutHerc.lowerPct)} to ${formatPct(ci.weightedRawCorrectInstructionPctWithoutHerc.upperPct)}; with HERC it reaches ${formatPct(adoptionSummary.weightedCorrectInstructionPctWithHercAfterFix)}.`,
    ],
    [
      "Lift estimate / uplift 估计",
      `总体 uplift 是 ${adoptionSummary.weightedCorrectnessLiftPctPoints.toFixed(1)} 个百分点，95% 置信区间为 ${ci.weightedCorrectnessLiftPctPoints.lowerPctPoints.toFixed(1)} 到 ${ci.weightedCorrectnessLiftPctPoints.upperPctPoints.toFixed(1)} 个百分点。`,
      `The overall uplift is ${adoptionSummary.weightedCorrectnessLiftPctPoints.toFixed(1)} percentage points, with a 95% confidence interval from ${ci.weightedCorrectnessLiftPctPoints.lowerPctPoints.toFixed(1)} to ${ci.weightedCorrectnessLiftPctPoints.upperPctPoints.toFixed(1)} percentage points.`,
    ],
    [
      "Workflow efficiency / 工作流效率",
      `changed-only 平均把执行面缩小 ${formatPct(adoptionSummary.weightedExecutionReductionPctWithChangedOnly)}；在 5000 case 套件里，执行量从 5000 降到 3，总时间下降 ${formatPct(workflow.workflows.ciOwnerChangedOnlyGate.timeReductionPct)}。`,
      `Changed-only execution reduces the average execution surface by ${formatPct(adoptionSummary.weightedExecutionReductionPctWithChangedOnly)}; in the 5000-case suite benchmark, execution drops from 5000 to 3 cases and total time falls by ${formatPct(workflow.workflows.ciOwnerChangedOnlyGate.timeReductionPct)}.`,
    ],
  ],
)}

## Stratified Uplift By Task Group / 按任务组分层的 Uplift

${table(
  ["Task Group / 任务组", "Scenarios / 场景数", "Protected Instructions / 受保护指令数", "Correctness / 正确率", "Lift / 提升", "Changed-only Reduction / 执行缩减"],
  stratificationRows(adoption.stratification.byTaskGroup),
)}

## Stratified Uplift By Task Type / 按任务类型分层的 Uplift

${table(
  ["Task Type / 任务类型", "Scenarios / 场景数", "Protected Instructions / 受保护指令数", "Correctness / 正确率", "Lift / 提升", "Changed-only Reduction / 执行缩减"],
  stratificationRows(adoption.stratification.byTaskType),
)}

## Stratified Uplift By Scale / 按规模分层的 Uplift

${table(
  ["Scale Bucket / 规模档位", "Scenarios / 场景数", "Protected Instructions / 受保护指令数", "Correctness / 正确率", "Lift / 提升", "Changed-only Reduction / 执行缩减"],
  stratificationRows(adoption.stratification.byScaleBucket),
)}

## Workflow Upgrade Effects / 工作流升级效果

${table(
  ["Workflow / 工作流", "Before / 之前", "After / 之后", "Improvement / 提升"],
  [
    [
      "Report comparison / 报告对比",
      `${workflowUpgrade.workflowUpgradeImpact.reportComparison.before.commands} commands; ${formatMs(workflowUpgrade.workflowUpgradeImpact.reportComparison.before.medianMs)}`,
      `${workflowUpgrade.workflowUpgradeImpact.reportComparison.after.commands} command; ${formatMs(workflowUpgrade.workflowUpgradeImpact.reportComparison.after.medianMs)}`,
      `${formatPct(workflowUpgrade.workflowUpgradeImpact.reportComparison.improvements.commandReductionPct)} fewer commands; ${formatPct(workflowUpgrade.workflowUpgradeImpact.reportComparison.improvements.medianTimeReductionPct)} less time`,
    ],
    [
      "Changed-only preflight / changed-only 预检",
      `${workflowUpgrade.workflowUpgradeImpact.changedPreflight.before.executedCases} executed cases; ${formatMs(workflowUpgrade.workflowUpgradeImpact.changedPreflight.before.medianMs)}`,
      `${workflowUpgrade.workflowUpgradeImpact.changedPreflight.after.executedCases} executed cases; ${formatMs(workflowUpgrade.workflowUpgradeImpact.changedPreflight.after.medianMs)}`,
      `${workflowUpgrade.workflowUpgradeImpact.changedPreflight.improvements.avoidedExecutedCases} cases avoided; ${formatPct(workflowUpgrade.workflowUpgradeImpact.changedPreflight.improvements.medianTimeReductionPct)} less time`,
    ],
    [
      "Automatic .gitignore sync / 自动 .gitignore 同步",
      `${workflowUpgrade.workflowUpgradeImpact.gitignoreAutomation.before.manualFiles} manual file; ${workflowUpgrade.workflowUpgradeImpact.gitignoreAutomation.before.manualLoc} manual LOC`,
      `${workflowUpgrade.workflowUpgradeImpact.gitignoreAutomation.after.manualFiles} manual files; ${workflowUpgrade.workflowUpgradeImpact.gitignoreAutomation.after.manualLoc} manual LOC`,
      `${formatPct(workflowUpgrade.workflowUpgradeImpact.gitignoreAutomation.improvements.manualFileReductionPct)} fewer manual files`,
    ],
  ],
)}

## Operational Benchmarks / 运行工作流基准

${table(
  ["Workflow / 工作流", "Result / 结果", "Interpretation / 解读"],
  [
    [
      "Support batch import / 支持团队批量导入",
      `${workflow.workflows.supportOpsBatchImport.medianCreatedCases} cases in ${formatMs(workflow.workflows.supportOpsBatchImport.medianMs)}`,
      "A support or ops team can convert historical incidents into draft regression cases in a sub-second local loop.",
    ],
    [
      "AI engineer repro-to-gate / AI 工程师从投诉到红灯",
      formatMs(workflow.workflows.aiEngineerReproToGate.medianMs),
      "A single complaint can become a failing gate quickly enough to fit into an ordinary debug session.",
    ],
    [
      "QA accept-and-pass / QA 审核并通过",
      formatMs(workflow.workflows.qaReviewerAcceptAndPass.medianMs),
      "Review plus baseline confirmation remains short enough for high-frequency maintenance.",
    ],
    [
      "Large-suite changed-only / 大套件 changed-only",
      `${workflow.workflows.ciOwnerChangedOnlyGate.fullSuiteCaseCount} -> ${workflow.workflows.ciOwnerChangedOnlyGate.changedCaseCount} cases; ${formatPct(workflow.workflows.ciOwnerChangedOnlyGate.timeReductionPct)} less time`,
      "The biggest savings show up when the suite grows and only a small portion changes.",
    ],
  ],
)}

## Deployment and Portability / 部署与可移植性

${table(
  ["Item / 项目", "中文", "English"],
  [
    [
      "Package size / 包体积",
      `当前 npm 打包体积为 ${(benchmark.packageFootprints.herc.packageSizeBytes / 1000).toFixed(1)} KB，解包后 ${(benchmark.packageFootprints.herc.unpackedSizeBytes / 1000).toFixed(1)} KB。`,
      `The current npm package is ${(benchmark.packageFootprints.herc.packageSizeBytes / 1000).toFixed(1)} KB packed and ${(benchmark.packageFootprints.herc.unpackedSizeBytes / 1000).toFixed(1)} KB unpacked.`,
    ],
    [
      "Dependency surface / 依赖面",
      "运行时依赖是 2 个，便于本地接入、审计和长期维护。",
      "The runtime dependency surface is 2 packages, which keeps local rollout, auditing, and long-term maintenance straightforward.",
    ],
    [
      "Cross-platform matrix / 跨平台矩阵",
      "CI 当前覆盖 macOS、Linux、Windows，以及 Node 18 和 Node 20。",
      "CI currently covers macOS, Linux, and Windows, plus Node 18 and Node 20.",
    ],
  ],
)}

## Methodology / 方法说明

${table(
  ["中文", "English"],
  [
    [
      "对照组会直接发布同一个候选版本，不运行 HERC。实验组会先运行 HERC，修复所有失败的受保护 case，再重新运行 changed-only gate 后发布。",
      "The control ships the same candidate directly without running HERC. The treatment runs HERC first, fixes every failing protected case, and re-runs the changed-only gate before shipping.",
    ],
    [
      "95% 置信区间使用 bootstrap 计算，重采样单位是受保护指令，before/after uplift 采用同一条指令上的配对重采样。",
      "The 95% confidence intervals use bootstrap resampling at the protected-instruction level, and before/after uplift uses paired resampling on the same instruction positions.",
    ],
    [
      "这个方法和 OpenAI 系统卡中公开描述的 bootstrap 评估思路一致，适合表达评估分数本身的波动范围，但不会自动覆盖所有分布漂移或未来数据变化。",
      "This matches the bootstrap-style uncertainty reporting described in OpenAI system cards: it captures uncertainty in the observed evaluation results, but it does not automatically cover every future distribution shift or dataset change.",
    ],
  ],
)}

## Reproduction / 复现方式

\`\`\`bash
npm ci
npm run benchmark:reproduce
\`\`\`

## Limitations / 局限性

${table(
  ["中文", "English"],
  [
    [
      "当前 adoption benchmark 仍然是 deterministic protected instructions，而不是开放式 judge-based eval，因此它更适合衡量“已知历史问题是否被挡住”，而不是语言质量的全部维度。",
      "The current adoption benchmark still focuses on deterministic protected instructions rather than open-ended judge-based evaluation, so it is better at measuring whether known historical failures are blocked than at covering every dimension of language quality.",
    ],
    [
      "任务类型分层已经可以看出哪些任务面 uplift 更大，但场景数还不算多，后续如果接入更多真实发布场景，区间会更稳、分层也会更细。",
      "The task-type stratification already shows where uplift is larger, but the number of scenarios is still modest. With more real release scenarios, the intervals will become steadier and the stratification can become more granular.",
    ],
  ],
)}

## Public Inputs / 公开输入文件

- [benchmarks/results/adoption-impact-results-2026-04-10.json](benchmarks/results/adoption-impact-results-2026-04-10.json)
- [benchmarks/results/workflow-impact-results-2026-04-10.json](benchmarks/results/workflow-impact-results-2026-04-10.json)
- [benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json](benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json)
- [benchmarks/results/benchmark-results-2026-04-10.json](benchmarks/results/benchmark-results-2026-04-10.json)

## References / 参考资料

- [OpenAI o3 and o4-mini system card](https://cdn.openai.com/pdf/2221c875-02dc-4789-800b-e7758f3722c1/o3-and-o4-mini-system-card.pdf)
- [OpenAI AI in the Enterprise](https://cdn.openai.com/business-guides-and-resources/ai-in-the-enterprise.pdf)
- [LangSmith evaluation concepts](https://docs.langchain.com/langsmith/evaluation-concepts)
- [Langfuse experiments overview](https://langfuse.com/docs/evaluation/experiments/overview)
`;

await writeFile(path.join(root, "EVALUATION_WHITEPAPER.md"), markdown, "utf8");
console.log("Wrote EVALUATION_WHITEPAPER.md");
