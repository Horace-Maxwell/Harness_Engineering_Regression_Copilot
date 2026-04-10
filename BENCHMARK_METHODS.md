# HERC Benchmark Methods / HERC Benchmark 方法学

| 中文 | English |
| --- | --- |
| 这份文档把 HERC 当前公开 benchmark 的执行流程、对照设计、统计口径、算法定义和结果文件组织方式整理成一份可审计说明。目标不是只给出一组漂亮数字，而是让别人知道这些数字是怎么得到的、应该怎么解释、怎样在另一台机器上复现。 | This document turns HERC's public benchmark process, control/treatment design, statistical rules, algorithm definitions, and artifact layout into an auditable reference. The goal is not just to show attractive numbers, but to explain how they were produced, how they should be interpreted, and how to reproduce them on another machine. |

## Public Benchmark Pack / 公开基准包

| Artifact / 文件 | 中文 | English |
| --- | --- | --- |
| [benchmarks/results/benchmark-results-2026-04-10.json](benchmarks/results/benchmark-results-2026-04-10.json) | 基础性能 benchmark，覆盖原始失败到红灯、手工 case 到通过、100 个确定性 case 执行，以及包体积与轻量对比。 | Baseline performance benchmark covering raw-failure-to-fail, manual-case-to-pass, 100 deterministic cases, and lightweight package comparisons. |
| [benchmarks/results/workflow-impact-results-2026-04-10.json](benchmarks/results/workflow-impact-results-2026-04-10.json) | 角色工作流 benchmark，覆盖 Support、AI engineer、QA、CI、release owner 的典型动作。 | Workflow benchmark covering representative support, AI engineer, QA, CI, and release-owner loops. |
| [benchmarks/results/adoption-impact-results-2026-04-10.json](benchmarks/results/adoption-impact-results-2026-04-10.json) | 对照组和实验组的采用前后对照实验，核心指标是历史受保护指令正确率 uplift。 | Controlled adoption benchmark comparing pre-HERC and post-HERC release quality, centered on protected-instruction correctness uplift. |
| [benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json](benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json) | 工作流升级前后对照实验，覆盖报告对比、changed-only 预检和 `.gitignore` 自动化。 | Workflow-upgrade before/after benchmark covering report comparison, changed-only preflight, and `.gitignore` automation. |
| [benchmarks/results/stability-study-results-2026-04-10.json](benchmarks/results/stability-study-results-2026-04-10.json) | 多轮稳定性复测结果，汇总 1 轮 warm-up 和 5 轮正式测量的分轮数据与统计摘要。 | Multi-round stability study that aggregates 1 warm-up plus 5 measured rounds with per-round data and summary statistics. |

## Reproduction Flow / 复现流程

| Step / 步骤 | 中文 | English |
| --- | --- | --- |
| 1 | 使用 `npm ci` 安装锁定依赖，避免 lockfile 外的漂移。 | Install locked dependencies with `npm ci` to avoid drift outside the lockfile. |
| 2 | 运行 `npm run build` 生成最新 CLI 构建产物。 | Run `npm run build` to produce the latest CLI build. |
| 3 | 运行 `npm run benchmark:reproduce` 重新生成公开 benchmark 结果和白皮书。 | Run `npm run benchmark:reproduce` to regenerate the public benchmark artifacts and whitepaper. |
| 4 | 如果要验证稳定性，再运行 `npm run benchmark:stability`。 | If you also want stability validation, run `npm run benchmark:stability`. |
| 5 | 用 [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md)、[BENCHMARK_STABILITY_REPORT.md](BENCHMARK_STABILITY_REPORT.md) 和本文件核对口径、环境、算法与解释边界。 | Use [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md), [BENCHMARK_STABILITY_REPORT.md](BENCHMARK_STABILITY_REPORT.md), and this file to verify protocol, environment, algorithms, and interpretation boundaries. |

```bash
npm ci
npm run build
npm run benchmark:reproduce
npm run benchmark:stability
```

## Environment And Execution Rules / 环境与执行规则

| Rule / 规则 | 中文 | English |
| --- | --- | --- |
| Machine state / 机器状态 | benchmark 尽量在空闲机器上执行；如果机器当时有明显后台负载，应重新执行。 | Run benchmarks on a reasonably quiet machine; rerun if the machine is clearly busy. |
| Warm-up / 预热 | 稳定性研究先执行 1 轮 warm-up，不纳入正式统计。 | The stability study runs 1 warm-up round before measured rounds, and excludes it from public statistics. |
| Measured rounds / 正式轮次 | 稳定性研究至少执行 5 轮 measured rounds。README 中的最新耗时数据优先引用这些多轮中位数。 | The stability study executes at least 5 measured rounds. The latest latency figures cited in the README prefer these multi-round medians. |
| Determinism / 确定性 | 质量实验基于 deterministic protected instructions，不依赖开放式模型裁判。 | Quality experiments are based on deterministic protected instructions and do not depend on open-ended model judges. |
| Reproducibility / 可复现性 | 所有公开结论都必须能从当前仓库内脚本与结果文件追溯。 | Every public conclusion must be traceable to scripts and artifacts inside the current repository. |

## Benchmark Families / 基准家族

### 1. Baseline Performance / 基础性能

| 中文 | English |
| --- | --- |
| 这组 benchmark 测试 CLI 在最小本地循环中的成本，例如把一个原始失败变成第一次红灯、手工 case 到首次通过，以及在确定性 runner 里执行 100 个 case。 | This benchmark measures the cost of HERC's shortest local loops, such as turning a raw failure into the first failing gate, moving a manual case to first pass, and executing 100 cases in the deterministic runner. |

### 2. Workflow Impact / 工作流收益

| 中文 | English |
| --- | --- |
| 这组 benchmark 更接近实际团队动作，分别模拟 Support 批量整理历史 incident、AI engineer 从投诉到 gate、QA 审核并确认 baseline、CI 跑 changed-only，以及 release owner 在 deep profile 下执行审核门禁。 | This benchmark focuses on team-shaped workflows: support batch incident import, AI engineer repro-to-gate, QA review plus baseline confirmation, CI changed-only execution, and deep-profile review enforcement for release owners. |

### 3. Adoption Impact / 接入前后质量对照

| 中文 | English |
| --- | --- |
| 这组 benchmark 是真正的对照实验。对照组直接发布候选版本，不运行 HERC。实验组先运行 HERC，修复所有失败的受保护 case，再重新运行 changed-only gate 后发布。 | This benchmark is a true control/treatment experiment. The control ships the candidate directly without HERC. The treatment runs HERC first, fixes every failing protected case, then reruns the changed-only gate before shipping. |
| 当前公开数据包含 5 个发布场景、920 条历史受保护指令。核心输出是发布正确率 uplift、失败泄漏下降，以及 changed-only 执行面缩减。 | The current public dataset contains 5 release scenarios and 920 protected historical instructions. The main outputs are shipped correctness uplift, failure leakage reduction, and changed-only execution reduction. |

### 4. Workflow Upgrade Impact / 工作流升级对照

| 中文 | English |
| --- | --- |
| 这组 benchmark 衡量具体产品改进是否真的减少了命令数、手工逻辑和误执行成本。当前覆盖 `report --compare-previous`、`doctor --quick` 和自动 `.gitignore` 同步。 | This benchmark measures whether product upgrades actually reduce command count, ad hoc logic, and wasted execution cost. The current pack covers `report --compare-previous`, `doctor --quick`, and automatic `.gitignore` sync. |

### 5. Stability Study / 稳定性复测

| 中文 | English |
| --- | --- |
| 这组 benchmark 不新增新场景，而是重复执行前面四组 benchmark，用来检查结果是否稳定。公开摘要默认给出 `median`、`min`、`max`、`p90`、`stddev` 和 `CV`。 | This benchmark does not introduce new tasks; it reruns the other four benchmark families to test stability. The public summary reports `median`, `min`, `max`, `p90`, `stddev`, and `CV` by default. |

## Statistical Outputs / 统计输出

| Metric / 指标 | 中文 | English |
| --- | --- | --- |
| `median` | 默认中心值，减少偶发系统噪音的影响。 | Default central tendency used to reduce the effect of occasional system noise. |
| `min` / `max` | 展示多轮中的边界值。 | Show the observed bounds across repeated rounds. |
| `p90` | 用来描述尾部延迟而不是均值幻觉。 | Used to describe tail latency rather than relying on mean-only summaries. |
| `stddev` | 衡量结果围绕均值的离散程度。 | Measures dispersion around the mean. |
| `CV` | `stddev / mean * 100`，用于跨量纲比较波动。 | `stddev / mean * 100`, used to compare relative variability across metrics with different scales. |

## Algorithms / 算法说明

| Topic / 主题 | 中文 | English |
| --- | --- | --- |
| Time reduction / 时间下降 | 公式为 `(before - after) / before * 100`。 | Formula: `(before - after) / before * 100`. |
| Execution reduction / 执行量下降 | 公式为 `(beforeCases - afterCases) / beforeCases * 100`。 | Formula: `(beforeCases - afterCases) / beforeCases * 100`. |
| Weighted correctness / 加权正确率 | 先按场景统计受保护指令是否正确执行，再按受保护指令数量进行加权汇总。 | First compute correctness at the protected-instruction level inside each scenario, then aggregate with weights equal to protected-instruction counts. |
| Failure leakage reduction / 失败泄漏下降 | 公式为 `(rawFailures - shippedFailures) / rawFailures * 100`。 | Formula: `(rawFailures - shippedFailures) / rawFailures * 100`. |
| Bootstrap confidence interval / Bootstrap 置信区间 | 使用受保护指令级别的 bootstrap 重采样。对于 uplift，采用同一条指令位置上的配对重采样，输出 95% 区间。 | Uses bootstrap resampling at the protected-instruction level. For uplift, paired resampling is applied across the same instruction positions and a 95% interval is reported. |
| Stability band / 稳定性档位 | `<5%` 视为 stable，`5%-10%` 为 acceptable，`10%-20%` 为 directional，`>20%` 为 noisy。 | `<5%` is treated as stable, `5%-10%` as acceptable, `10%-20%` as directional, and `>20%` as noisy. |

## Dataset And Scenario Design / 数据集与场景设计

| Slice / 切片 | 中文 | English |
| --- | --- | --- |
| Release scenarios / 发布场景 | 当前 adoption benchmark 包含 `customer-policy-hotfix`、`support-routing-refresh`、`agent-tool-contract-update`、`rag-policy-release`、`weekly-release-train` 共 5 个场景。 | The current adoption benchmark contains 5 scenarios: `customer-policy-hotfix`, `support-routing-refresh`, `agent-tool-contract-update`, `rag-policy-release`, and `weekly-release-train`. |
| Protected instructions / 受保护指令 | 总计 `920` 条，覆盖政策、知识、工具契约、路由和发版列车类问题。 | A total of `920` protected instructions covering policy, knowledge, tool-contract, routing, and release-train failures. |
| Large-suite CI gate / 大套件 CI gate | `5000` case 套件用来衡量 `--changed` 在大规模回归里的执行面缩减。 | A `5000`-case suite is used to quantify `--changed` execution reduction in a large regression pack. |
| Incident import / 事故导入 | `50` 条 incident 批次用于模拟 Support 和 Ops 的历史事故整理路径。 | A `50`-incident batch simulates the support and operations path for turning historical incidents into regression assets. |

## Reporting Rules / 报告规则

| Rule / 规则 | 中文 | English |
| --- | --- | --- |
| Latest public latency / 最新公开耗时 | README 默认引用稳定性研究中的多轮中位数，不再优先引用单轮耗时。 | The README now defaults to multi-round medians from the stability study instead of single-run latencies. |
| Structural values / 结构型指标 | 包体积、命令数、manual LOC、CI matrix 这类结构型指标可直接引用当前最新脚本结果。 | Structural metrics such as package size, command count, manual LOC, and CI matrix are cited directly from the current script outputs. |
| Raw inputs / 原始输入 | 单轮 JSON 结果文件保留为原始输入，供白皮书、稳定性研究和外部审计复核。 | Single-run JSON result files are retained as raw inputs for the whitepaper, stability study, and external audit. |

## Limitations / 局限性

| 中文 | English |
| --- | --- |
| 这些 benchmark 更擅长衡量“已知历史错误是否被挡住”和“工作流是否更短更稳”，并不试图覆盖所有开放式生成质量维度。 | These benchmarks are strongest at measuring whether known historical failures are blocked and whether workflows become shorter and steadier; they do not attempt to cover every dimension of open-ended generation quality. |
| latency 结果仍然会受机器噪音影响，因此 README 会优先公开稳定性复测后的中位数和 CV，而不是承诺所有机器都达到同样毫秒数。 | Latency results remain machine-sensitive, which is why the README now prioritizes post-stability medians and CV values rather than promising the same millisecond numbers on every machine. |
