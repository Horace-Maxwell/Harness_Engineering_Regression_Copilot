# HERC Benchmark Standard / HERC Benchmark 标准

| 中文 | English |
| --- | --- |
| 这份文档定义 HERC 公开 benchmark 的最小执行标准，目标是让外部复现实验时，拿到的是一套更稳定、更可解释的结果，而不是单次偶然跑出来的漂亮数字。 | This document defines the minimum execution standard for HERC's public benchmarks so external reproductions produce stable, interpretable results instead of one-off lucky numbers. |

## Scope / 范围

| 中文 | English |
| --- | --- |
| 这套标准覆盖 HERC 当前公开的四类 benchmark：基础性能、角色工作流、采用前后对照，以及工作流升级前后对照。 | This standard covers HERC's four public benchmark families: baseline performance, role-based workflows, adoption before/after comparisons, and workflow-upgrade before/after comparisons. |

## Required Protocol / 必要执行规范

| Rule / 规则 | 中文 | English |
| --- | --- | --- |
| Dependency lock / 依赖锁定 | 必须优先使用 `npm ci`，避免不同机器因为 lockfile 之外的依赖漂移而影响结果。 | Use `npm ci` whenever possible so results are not perturbed by dependency drift outside the lockfile. |
| Quiet machine / 空闲机器 | benchmark 期间尽量关闭高占用任务；如果机器明显忙碌，应重新执行。 | Keep the machine as quiet as practical during benchmark execution; rerun when the machine is obviously busy. |
| Warm-up / 预热 | 至少先跑 `1` 轮 warm-up，不把 warm-up 纳入正式统计。 | Run at least `1` warm-up round and exclude it from the measured statistics. |
| Measured rounds / 正式轮次 | 至少跑 `5` 轮正式测量。单次结果不能直接当作公开结论。 | Run at least `5` measured rounds. A single run must not be treated as the public conclusion. |
| Aggregation / 聚合方法 | 默认公开 `median`、`min`、`max`、`p90`、`stddev` 和 `CV`。 | Publish `median`, `min`, `max`, `p90`, `stddev`, and `CV` by default. |
| Correctness metrics / 正确率指标 | 质量 uplift 继续用 deterministic protected instructions 计算，同时保留 `95%` bootstrap 置信区间。 | Continue to compute quality uplift on deterministic protected instructions and retain the `95%` bootstrap confidence interval. |
| Reproducibility / 可复现性 | 公开结果必须能通过 `npm run benchmark:reproduce` 或 `npm run benchmark:stability` 在同一仓库中重新生成。 | Public results must be reproducible inside the same repository via `npm run benchmark:reproduce` or `npm run benchmark:stability`. |

## Stability Interpretation / 稳定性解释口径

| CV band / CV 档位 | 中文 | English |
| --- | --- | --- |
| `< 5%` | 波动很低，可以视为稳定。 | Very low variance; treat as stable. |
| `5% - 10%` | 轻微波动，通常仍可公开引用。 | Mild variance; usually still safe to cite publicly. |
| `10% - 20%` | 有感知波动，公开使用时应强调是 workflow-level directional result。 | Noticeable variance; public summaries should frame this as a workflow-level directional result. |
| `> 20%` | 噪音较大，应该扩大轮次或改善隔离条件后再发布。 | High noise; increase rounds or improve environment isolation before publication. |

## Public Commands / 公开命令

```bash
npm ci
npm run benchmark:reproduce
npm run benchmark:stability
```

## Notes / 说明

| 中文 | English |
| --- | --- |
| HERC 当前公开 benchmark 主要衡量 deterministic gate 和历史问题回归拦截能力，不等同于对所有开放式生成质量的完整评价。 | HERC's current public benchmarks primarily measure deterministic gates and historical-failure regression blocking, not every dimension of open-ended generation quality. |
