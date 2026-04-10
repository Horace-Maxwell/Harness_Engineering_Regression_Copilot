# HERC Benchmark Stability Report / HERC Benchmark 稳定性报告

| 中文 | English |
| --- | --- |
| 这份报告用于回答一个更严格的问题：不是 HERC 单次 benchmark 看起来好不好，而是这些结果在多轮重复执行之后是否仍然稳定。 | This report answers a stricter question: not whether one HERC benchmark run looks good, but whether the results remain stable after repeated reruns. |
| 当前报告采用 1 轮 warm-up 和 5 轮正式测量，执行标准见 [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md)。 | This report uses 1 warm-up round(s) and 5 measured round(s); the execution standard is defined in [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md). |

## Key Stability Summary / 核心稳定性结论

| Metric / 指标 | Median / 中位数 | CV / 波动系数 | Band / 稳定性 | Why it matters / 含义 |
| --- | --- | --- | --- | --- |
| Raw failure to first fail / 原始失败到首次红灯 | 464.6 ms | 0.6% | stable | Local failure reproduction stays within a tight latency band. |
| 100 deterministic cases / 100 个确定性 case | 144.7 ms | 0.8% | stable | The lightweight deterministic runner is consistently fast. |
| Changed-only time reduction / changed-only 总时间缩减 | 27.2% | 11.7% | directional | The large-suite workflow improvement remains directionally consistent across rounds. |
| Shipped correctness lift / 发布正确率 uplift | 7.2 pp | 0.0% | stable | The quality gain remains identical across reruns because the protected-instruction setup is deterministic. |
| Report comparison time reduction / 报告对比时间缩减 | 60.8% | 0.5% | stable | The upgraded single-command comparison workflow stays consistently better than the old manual path. |

## Detailed Metrics / 详细指标

| Metric / 指标 | Median / 中位数 | Min / 最小值 | Max / 最大值 | P90 | StdDev | CV | Band / 稳定性 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rawFailureToFirstFailMs | 464.6 ms | 459.1 ms | 466.1 ms | 466.1 ms | 2.6 ms | 0.6% | stable |
| manualCaseToPassMs | 460.7 ms | 460.0 ms | 462.5 ms | 462.5 ms | 0.9 ms | 0.2% | stable |
| hundredDeterministicCasesMs | 144.7 ms | 143.8 ms | 147.3 ms | 147.3 ms | 1.2 ms | 0.8% | stable |
| supportBatchImportMs | 542.2 ms | 540.1 ms | 549.6 ms | 549.6 ms | 3.5 ms | 0.7% | stable |
| aiEngineerReproToGateMs | 461.8 ms | 458.5 ms | 463.7 ms | 463.7 ms | 1.7 ms | 0.4% | stable |
| qaAcceptAndPassMs | 463.4 ms | 458.7 ms | 464.6 ms | 464.6 ms | 2.2 ms | 0.5% | stable |
| ciChangedOnlyTimeReductionPct | 27.2% | 22.1% | 31.7% | 31.7% | 3.2% | 11.7% | directional |
| ciChangedOnlyExecutedCaseReductionPct | 99.9% | 99.9% | 99.9% | 99.9% | 0.0% | 0.0% | stable |
| shippedCorrectnessLiftPctPoints | 7.2 | 7.2 | 7.2 | 7.2 | 0 | 0.0% | stable |
| failureLeakageReductionPct | 100.0% | 100.0% | 100.0% | 100.0% | 0.0% | 0.0% | stable |
| changedOnlyExecutionReductionPct | 89.7% | 89.7% | 89.7% | 89.7% | 0.0% | 0.0% | stable |
| reportComparisonTimeReductionPct | 60.8% | 60.5% | 61.3% | 61.3% | 0.3% | 0.5% | stable |
| preflightTimeReductionPct | 66.3% | 65.0% | 67.1% | 67.1% | 0.7% | 1.1% | stable |

## Round Data / 分轮结果

| Round / 轮次 | Raw fail ms | 100 cases ms | Changed-only time reduction | Correctness lift | Report comparison reduction |
| --- | --- | --- | --- | --- | --- |
| round_1 | 464.6 ms | 144.7 ms | 29.0% | 7.2 pp | 61.3% |
| round_2 | 459.1 ms | 147.3 ms | 22.1% | 7.2 pp | 60.5% |
| round_3 | 462.3 ms | 144.7 ms | 31.7% | 7.2 pp | 60.7% |
| round_4 | 466.1 ms | 144.6 ms | 26.1% | 7.2 pp | 61.1% |
| round_5 | 465.7 ms | 143.8 ms | 27.2% | 7.2 pp | 60.8% |

## Interpretation / 解读

| 中文 | English |
| --- | --- |
| 如果一个指标的 `CV < 5%`，我们把它视为稳定；`5% - 10%` 视为可接受；`10% - 20%` 视为方向稳定但会受机器噪音影响；`> 20%` 则说明应该扩大轮次或改善环境隔离。 | Metrics with `CV < 5%` are treated as stable; `5% - 10%` are acceptable; `10% - 20%` are directionally stable but more sensitive to machine noise; `> 20%` means you should increase rounds or improve environment isolation. |
| 这次多轮结果里，质量 uplift 和 failure leakage 这类 deterministic 指标保持完全一致；耗时类指标有正常波动，但核心 workflow uplift 仍然保持同一方向。 | In this rerun set, deterministic quality metrics such as uplift and failure leakage remain identical across rounds; latency metrics vary normally, but the core workflow uplift remains directionally consistent. |
