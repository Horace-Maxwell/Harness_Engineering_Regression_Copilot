# HERC Evaluation Whitepaper / HERC 评估白皮书

| 中文 | English |
| --- | --- |
| 这份白皮书整理了 HERC 当前公开 benchmark 的核心结果，并把原来偏“README 摘要”的数字补成更接近研究报告的结构：包含任务分层、95% 置信区间、工作流前后对照，以及部署体量与跨平台信息。 | This whitepaper consolidates HERC's public benchmarks into a more research-style package, extending the README summary with task stratification, 95% confidence intervals, before/after workflow comparisons, and deployment footprint data. |
| 当前文档基于仓库内公开结果文件生成，最新稳定性复测时间为 2026-04-10T04:52:45.904Z。 | This document is generated from the public result files in the repository, with the latest stability rerun captured at 2026-04-10T04:52:45.904Z. |
| 如果你想看这组结果在多轮重复执行后是否稳定，请继续查看 [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md)、[BENCHMARK_METHODS.md](BENCHMARK_METHODS.md) 和 [BENCHMARK_STABILITY_REPORT.md](BENCHMARK_STABILITY_REPORT.md)。 | If you want to see whether these results remain stable after repeated reruns, continue with [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md), [BENCHMARK_METHODS.md](BENCHMARK_METHODS.md), and [BENCHMARK_STABILITY_REPORT.md](BENCHMARK_STABILITY_REPORT.md). |

## Abstract / 摘要

| Metric / 指标 | Result / 结果 | Meaning / 含义 |
| --- | --- | --- |
| Protected instruction correctness / 历史受保护指令正确率 | 92.8% -> 100.0%; 7.2 pp (95% CI 5.5 to 8.8 pp) | HERC closes the last-mile gap between known historical failures and shipped behavior. |
| Failure leakage / 历史失败泄漏 | 100.0% | Known historical failures stop leaking into the shipped candidate in this controlled release-gate setup. |
| Changed-only execution reduction / changed-only 执行面缩减 | 89.7% | Most protected instructions stay out of the critical-path run when only a narrow slice changed. |
| Regression triage improvement / 回归排查提升 | 60.8% median time reduction; 66.7% fewer commands | Comparing the latest run against the previous run becomes a single-command workflow and stays materially faster across reruns. |
| Deployment footprint / 部署体量 | 59.9 KB packed; 87 files | The package remains lightweight enough for repo-local rollout and fast onboarding. |

## Primary Findings / 核心发现

| Topic / 主题 | 中文 | English |
| --- | --- | --- |
| Overall quality uplift / 总体质量提升 | 在 920 条历史受保护指令上，不使用 HERC 时加权正确率是 92.8%，95% 置信区间为 91.2% 到 94.5%；使用 HERC 后达到 100.0%。 | Across 920 protected historical instructions, weighted correctness is 92.8% without HERC, with a 95% confidence interval from 91.2% to 94.5%; with HERC it reaches 100.0%. |
| Lift estimate / uplift 估计 | 总体 uplift 是 7.2 个百分点，95% 置信区间为 5.5 到 8.8 个百分点。 | The overall uplift is 7.2 percentage points, with a 95% confidence interval from 5.5 to 8.8 percentage points. |
| Workflow efficiency / 工作流效率 | changed-only 平均把执行面缩小 89.7%；在 5000 case 套件里，执行量从 5000 降到 3，多轮复测后的总时间下降中位数是 27.2%。 | Changed-only execution reduces the average execution surface by 89.7%; in the 5000-case suite benchmark, execution drops from 5000 to 3 cases and the repeated-rerun median time reduction is 27.2%. |
| Method audit trail / 方法审计链 | 检查标准、复现流程、算法解释和稳定性结果分别写在 BENCHMARK_STANDARD、BENCHMARK_METHODS 和 BENCHMARK_STABILITY_REPORT 中。 | The execution standard, reproduction flow, algorithm notes, and stability results are split across BENCHMARK_STANDARD, BENCHMARK_METHODS, and BENCHMARK_STABILITY_REPORT. |

## Stability Summary / 稳定性摘要

| Metric / 指标 | Result / 结果 | Interpretation / 解读 |
| --- | --- | --- |
| Raw failure to first fail / 原始失败到首次红灯 | 464.6 ms; CV 0.6% | The shortest local failure loop remains tightly clustered across reruns. |
| 100 deterministic cases / 100 个确定性 case | 144.7 ms; CV 0.8% | The deterministic runner stays lightweight and repeatable. |
| Changed-only large-suite reduction / 大套件 changed-only 收益 | 27.2%; CV 11.7% | This is a directional workflow gain rather than a hard per-machine latency guarantee. |
| Report comparison / 报告对比 | 60.8%; CV 0.5% | The single-command comparison flow stays consistently faster than the old manual path. |

## Stratified Uplift By Task Group / 按任务组分层的 Uplift

| Task Group / 任务组 | Scenarios / 场景数 | Protected Instructions / 受保护指令数 | Correctness / 正确率 | Lift / 提升 | Changed-only Reduction / 执行缩减 |
| --- | --- | --- | --- | --- | --- |
| Ops and release | 2 | 550 | 94.2% -> 100.0% | 5.8 pp (95% CI 4.0 to 7.8 pp) | 90.9% |
| Policy and knowledge | 2 | 270 | 91.9% -> 100.0% | 8.1 pp (95% CI 5.2 to 11.5 pp) | 89.3% |
| Agent and platform | 1 | 100 | 88.0% -> 100.0% | 12.0 pp (95% CI 6.0 to 18.0 pp) | 84.0% |

## Stratified Uplift By Task Type / 按任务类型分层的 Uplift

| Task Type / 任务类型 | Scenarios / 场景数 | Protected Instructions / 受保护指令数 | Correctness / 正确率 | Lift / 提升 | Changed-only Reduction / 执行缩减 |
| --- | --- | --- | --- | --- | --- |
| Release ops | 1 | 500 | 95.2% -> 100.0% | 4.8 pp (95% CI 3.0 to 6.8 pp) | 92.0% |
| RAG policy | 1 | 250 | 92.8% -> 100.0% | 7.2 pp (95% CI 4.0 to 10.4 pp) | 90.0% |
| Agent tooling | 1 | 100 | 88.0% -> 100.0% | 12.0 pp (95% CI 6.0 to 18.0 pp) | 84.0% |
| Support routing | 1 | 50 | 84.0% -> 100.0% | 16.0 pp (95% CI 6.0 to 26.0 pp) | 80.0% |
| Policy compliance | 1 | 20 | 80.0% -> 100.0% | 20.0 pp (95% CI 5.0 to 40.0 pp) | 80.0% |

## Stratified Uplift By Scale / 按规模分层的 Uplift

| Scale Bucket / 规模档位 | Scenarios / 场景数 | Protected Instructions / 受保护指令数 | Correctness / 正确率 | Lift / 提升 | Changed-only Reduction / 执行缩减 |
| --- | --- | --- | --- | --- | --- |
| Large suites (>250 protected instructions) | 1 | 500 | 95.2% -> 100.0% | 4.8 pp (95% CI 3.0 to 6.8 pp) | 92.0% |
| Medium suites (51-250 protected instructions) | 2 | 350 | 91.4% -> 100.0% | 8.6 pp (95% CI 5.7 to 11.7 pp) | 88.3% |
| Small suites (<=50 protected instructions) | 2 | 70 | 82.9% -> 100.0% | 17.1 pp (95% CI 8.6 to 25.7 pp) | 80.0% |

## Workflow Upgrade Effects / 工作流升级效果

| Workflow / 工作流 | Before / 之前 | After / 之后 | Improvement / 提升 |
| --- | --- | --- | --- |
| Report comparison / 报告对比 | 3 commands; 9 manual LOC | 1 command; 0 manual LOC | 66.7% fewer commands; 60.8% median less time across reruns |
| Changed-only preflight / changed-only 预检 | 1000 executed cases; fallback run | 0 executed cases; quick preflight | 1000 cases avoided; 66.3% median less time across reruns |
| Automatic .gitignore sync / 自动 .gitignore 同步 | 1 manual file; 3 manual LOC | 0 manual files; 0 manual LOC | 100.0% fewer manual files |

## Operational Benchmarks / 运行工作流基准

| Workflow / 工作流 | Result / 结果 | Interpretation / 解读 |
| --- | --- | --- |
| Support batch import / 支持团队批量导入 | 50 cases in 542.2 ms | A support or ops team can convert historical incidents into draft regression cases in a sub-second local loop. |
| AI engineer repro-to-gate / AI 工程师从投诉到红灯 | 461.8 ms | A single complaint can become a failing gate quickly enough to fit into an ordinary debug session. |
| QA accept-and-pass / QA 审核并通过 | 463.4 ms | Review plus baseline confirmation remains short enough for high-frequency maintenance. |
| Large-suite changed-only / 大套件 changed-only | 5000 -> 3 cases; 27.2% median less time | The biggest savings show up when the suite grows and only a small portion changes. |

## Deployment and Portability / 部署与可移植性

| Item / 项目 | 中文 | English |
| --- | --- | --- |
| Package size / 包体积 | 当前 npm 打包体积为 59.9 KB，解包后 272.5 KB。 | The current npm package is 59.9 KB packed and 272.5 KB unpacked. |
| Dependency surface / 依赖面 | 运行时依赖是 2 个，便于本地接入、审计和长期维护。 | The runtime dependency surface is 2 packages, which keeps local rollout, auditing, and long-term maintenance straightforward. |
| Cross-platform matrix / 跨平台矩阵 | CI 当前覆盖 macOS、Linux、Windows，以及 Node 18 和 Node 20。 | CI currently covers macOS, Linux, and Windows, plus Node 18 and Node 20. |

## Methodology / 方法说明

| 中文 | English |
| --- | --- |
| 对照组会直接发布同一个候选版本，不运行 HERC。实验组会先运行 HERC，修复所有失败的受保护 case，再重新运行 changed-only gate 后发布。 | The control ships the same candidate directly without running HERC. The treatment runs HERC first, fixes every failing protected case, and re-runs the changed-only gate before shipping. |
| 95% 置信区间使用 bootstrap 计算，重采样单位是受保护指令，before/after uplift 采用同一条指令上的配对重采样。 | The 95% confidence intervals use bootstrap resampling at the protected-instruction level, and before/after uplift uses paired resampling on the same instruction positions. |
| 这个方法和 OpenAI 系统卡中公开描述的 bootstrap 评估思路一致，适合表达评估分数本身的波动范围，但不会自动覆盖所有分布漂移或未来数据变化。 | This matches the bootstrap-style uncertainty reporting described in OpenAI system cards: it captures uncertainty in the observed evaluation results, but it does not automatically cover every future distribution shift or dataset change. |
| 更完整的 benchmark 流程、数据集组织、执行规则和公式说明见 BENCHMARK_METHODS；公开稳定性解释规则见 BENCHMARK_STANDARD。 | For the full benchmark workflow, dataset layout, execution rules, and formulas, see BENCHMARK_METHODS; for the public stability interpretation rules, see BENCHMARK_STANDARD. |

## Reproduction / 复现方式

```bash
npm ci
npm run benchmark:reproduce
```

## Limitations / 局限性

| 中文 | English |
| --- | --- |
| 当前 adoption benchmark 仍然是 deterministic protected instructions，而不是开放式 judge-based eval，因此它更适合衡量“已知历史问题是否被挡住”，而不是语言质量的全部维度。 | The current adoption benchmark still focuses on deterministic protected instructions rather than open-ended judge-based evaluation, so it is better at measuring whether known historical failures are blocked than at covering every dimension of language quality. |
| 任务类型分层已经可以看出哪些任务面 uplift 更大，但场景数还不算多，后续如果接入更多真实发布场景，区间会更稳、分层也会更细。 | The task-type stratification already shows where uplift is larger, but the number of scenarios is still modest. With more real release scenarios, the intervals will become steadier and the stratification can become more granular. |

## Public Inputs / 公开输入文件

- [benchmarks/results/adoption-impact-results-2026-04-10.json](benchmarks/results/adoption-impact-results-2026-04-10.json)
- [benchmarks/results/workflow-impact-results-2026-04-10.json](benchmarks/results/workflow-impact-results-2026-04-10.json)
- [benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json](benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json)
- [benchmarks/results/benchmark-results-2026-04-10.json](benchmarks/results/benchmark-results-2026-04-10.json)
- [benchmarks/results/stability-study-results-2026-04-10.json](benchmarks/results/stability-study-results-2026-04-10.json)
- [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md)
- [BENCHMARK_METHODS.md](BENCHMARK_METHODS.md)
- [BENCHMARK_STABILITY_REPORT.md](BENCHMARK_STABILITY_REPORT.md)

## References / 参考资料

- [OpenAI o3 and o4-mini system card](https://cdn.openai.com/pdf/2221c875-02dc-4789-800b-e7758f3722c1/o3-and-o4-mini-system-card.pdf)
- [OpenAI AI in the Enterprise](https://cdn.openai.com/business-guides-and-resources/ai-in-the-enterprise.pdf)
- [LangSmith evaluation concepts](https://docs.langchain.com/langsmith/evaluation-concepts)
- [Langfuse experiments overview](https://langfuse.com/docs/evaluation/experiments/overview)
