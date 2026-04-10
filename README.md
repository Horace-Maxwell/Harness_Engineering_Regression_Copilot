<div align="center">
  <h1>Harness_Engineering_Regression_Copilot</h1>
  <p><strong>Failure-first regression testing for AI apps, RAG systems, agents, and copilots.</strong></p>
  <p><strong>把真实 AI 失败快速变成可执行回归资产和 GitHub PR 门禁。</strong></p>
  <p>
    <a href="#overview">Overview / 项目概览</a> ·
    <a href="#why-deploy-herc">Why Deploy / 为什么部署</a> ·
    <a href="#install">Install / 安装</a> ·
    <a href="#quick-start">Quick Start / 快速开始</a> ·
    <a href="#benchmarks">Benchmarks / 基准</a> ·
    <a href="EVALUATION_WHITEPAPER.md">Whitepaper / 白皮书</a> ·
    <a href="BENCHMARK_STABILITY_REPORT.md">Stability / 稳定性</a> ·
    <a href="#launch-kit">Launch Kit / 启动模板</a> ·
    <a href="#contributing">Contributing / 贡献</a>
  </p>
  <p>
    <a href="https://github.com/Horace-Maxwell/Harness_Engineering_Regression_Copilot/actions">
      <img src="https://img.shields.io/github/actions/workflow/status/Horace-Maxwell/Harness_Engineering_Regression_Copilot/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" />
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-0f172a?style=for-the-badge" alt="MIT License" />
    </a>
    <img src="https://img.shields.io/badge/Node-%3E%3D18-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node >=18" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.x" />
    <img src="https://img.shields.io/badge/Platforms-macOS%20%7C%20Linux%20%7C%20Windows-111827?style=for-the-badge" alt="Platforms: macOS, Linux, Windows" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/protected%20correctness-92.8%25%E2%86%92100%25-0f766e?style=for-the-badge" alt="Protected correctness 92.8% to 100%" />
    <img src="https://img.shields.io/badge/failure%20leakage-100%25%20reduced-15803d?style=for-the-badge" alt="Failure leakage reduced 100%" />
    <img src="https://img.shields.io/badge/report%20comparison-66.7%25%20fewer%20commands-1d4ed8?style=for-the-badge" alt="Report comparison 66.7% fewer commands" />
    <img src="https://img.shields.io/badge/preflight-65.1%25%20faster-f97316?style=for-the-badge" alt="Preflight 65.1% faster" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/first%20failing%20gate-472.5ms-0f766e?style=for-the-badge" alt="First failing gate 472.5ms" />
    <img src="https://img.shields.io/badge/100%20cases-145.1ms-1d4ed8?style=for-the-badge" alt="100 cases 145.1ms" />
    <img src="https://img.shields.io/badge/throughput-689.2%20cases%2Fs-15803d?style=for-the-badge" alt="Throughput 689.2 cases per second" />
    <img src="https://img.shields.io/badge/changed--only-5000%E2%86%923%20cases-f97316?style=for-the-badge" alt="Changed-only 5000 to 3 cases" />
    <img src="https://img.shields.io/badge/package-55.4%20KB-7c3aed?style=for-the-badge" alt="Package size 55.4 KB" />
  </p>
</div>

<a id="overview"></a>
## Overview / 项目概览

| 中文 | English |
| --- | --- |
| Harness_Engineering_Regression_Copilot，简称 `HERC`，是一个 repo-local 的 AI 回归测试 CLI。它把生产失败、坏对话、错误 trace、历史投诉和支持工单整理成可维护的 regression cases、baseline responses 和报告文件。 | Harness_Engineering_Regression_Copilot, abbreviated as `HERC`, is a repo-local AI regression testing CLI. It turns production failures, bad conversations, broken traces, historical complaints, and support tickets into maintainable regression cases, baseline responses, and report files. |
| 这个项目适合想把“这里以前出过错”稳定地转成“这里以后会被门禁拦住”的团队。它默认坚持 failure-first、local-first、deterministic-first，优先帮助团队建立一条短、稳、可复现的工程闭环。 | The project fits teams that want to reliably turn “this broke before” into “this will be blocked next time.” It stays failure-first, local-first, and deterministic-first by default, with an emphasis on short, stable, reproducible engineering loops. |

<a id="why-deploy-herc"></a>
## Why Deploy HERC / 为什么部署 HERC

| Metric / 指标 | 中文 | English | Source / 来源 |
| --- | --- | --- | --- |
| Protected instruction correctness / 历史受保护指令正确率 | 在 `920` 条历史受保护指令上，发布前不使用 HERC 的加权正确率是 `92.8%`，接入 HERC 后提升到 `100%`，净提升 `+7.2` 个百分点。 | Across `920` protected historical instructions, shipped correctness rises from `92.8%` without HERC to `100%` with HERC, a net lift of `+7.2` percentage points. | [adoption-impact-results-2026-04-10.json](benchmarks/results/adoption-impact-results-2026-04-10.json) |
| Failure leakage reduction / 历史失败泄漏下降 | 这组对照实验里，历史失败泄漏下降 `100%`，也就是已知失败不会再直接混进发布版本。 | In the controlled adoption benchmark, historical failure leakage drops by `100%`, meaning known failures stop slipping into the shipped build. | [adoption-impact-results-2026-04-10.json](benchmarks/results/adoption-impact-results-2026-04-10.json) |
| CI execution reduction / CI 执行面缩减 | 在 `5000` 个 case 的套件里，`--changed` 把执行面从 `5000` 个 case 缩到 `3` 个，执行量下降 `99.9%`，总时间下降 `25.9%`。 | In a `5000`-case suite, `--changed` reduces execution from `5000` cases to `3`, cutting executed cases by `99.9%` and total time by `25.9%`. | [workflow-impact-results-2026-04-10.json](benchmarks/results/workflow-impact-results-2026-04-10.json) |
| Faster regression triage / 更快的回归排查 | `herc report --compare-previous` 把报告对比从 `3` 条命令和 `9` 行临时逻辑压到 `1` 条命令，耗时中位数从 `287.8 ms` 降到 `112.5 ms`，时间下降 `60.9%`。 | `herc report --compare-previous` compresses report comparison from `3` commands and `9` lines of ad hoc logic into `1` command, cutting median time from `287.8 ms` to `112.5 ms`, a `60.9%` reduction. | [workflow-upgrade-impact-results-2026-04-10.json](benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json) |
| Faster preflight / 更快的预检 | `herc doctor --quick` 能在误跑前直接识别非 Git 工作区，让一次本来会白跑的 `1000` case 执行变成 `0` case；中位耗时从 `354.1 ms` 降到 `123.5 ms`，时间下降 `65.1%`。 | `herc doctor --quick` catches non-Git changed-only fallbacks before a wasted run, turning a would-be `1000`-case execution into `0` executed cases; median time drops from `354.1 ms` to `123.5 ms`, a `65.1%` reduction. | [workflow-upgrade-impact-results-2026-04-10.json](benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json) |
| Lightweight deployment / 轻量部署 | 包体积只有 `55.4 KB` packed、`255.8 KB` unpacked，运行时依赖是 `2` 个，CI 已覆盖 `macOS`、`Linux`、`Windows` 以及 `Node 18/20`。 | The package stays at `55.4 KB` packed and `255.8 KB` unpacked, ships with `2` runtime dependencies, and already runs in CI across `macOS`, `Linux`, `Windows`, plus `Node 18/20`. | [benchmark-results-2026-04-10.json](benchmarks/results/benchmark-results-2026-04-10.json), [.github/workflows/ci.yml](.github/workflows/ci.yml) |

## Why Teams Like It / 团队为什么会喜欢它

| Pillar / 支柱 | 中文 | English |
| --- | --- | --- |
| Failure-first / 失败优先 | 从真实线上问题和历史 bad cases 开始，第一批资产更贴近业务风险。 | Start from real production failures and historical bad cases, so the first regression assets map directly to business risk. |
| Local-first / 本地优先 | 资产保存在普通仓库里，不要求团队先搭一套云端 eval 平台。 | Assets live inside an ordinary repository, without forcing a cloud eval platform up front. |
| Deterministic-first / 确定性优先 | 先提供便宜、稳定、可复现的 gate，再逐步引入更重的评估。 | Give teams cheap, stable, reproducible gates first, then layer in heavier evaluation later if needed. |
| PR-ready / 面向 PR 工作流 | `--changed`、退出码、markdown/json 报告都能直接接进 GitHub PR 和 CI。 | `--changed`, exit codes, and markdown/json reports plug naturally into GitHub PRs and CI. |
| Cross-functional / 跨角色可用 | Support、PM、QA、AI engineer、平台同学都能共享同一套失败资产。 | Support, PM, QA, AI engineers, and platform teams can work from the same failure-derived assets. |

## Snapshot / 项目快照

| Item / 项目 | Value / 数值 | Why it matters / 意义 |
| --- | --- | --- |
| CLI commands / CLI 命令 | `12` | 覆盖初始化、导入、提炼、审核、执行、报告全流程 / Covers bootstrap, import, distill, review, execution, and reporting |
| Run profiles / 执行档位 | `quick`, `standard`, `deep` | 可以在本地调试、常规回归、严格 gate 之间切换 / Switch between local debugging, standard regression, and stricter gates |
| Report formats / 报告格式 | `summary`, `markdown`, `json` | 同时照顾人读和机器集成 / Works for both human review and machine integration |
| Runtime dependencies / 运行时依赖 | `2` | 依赖面小，安装和维护都更轻 / Small dependency surface keeps installs and maintenance lightweight |
| Package footprint / 包体积 | `55.4 KB` packed, `255.8 KB` unpacked | 适合本地优先和仓库内集成 / Well-suited to local-first and repo-embedded workflows |
| CI matrix / CI 矩阵 | `3 OS x 2 Node versions` | 当前 CI 覆盖 macOS、Linux、Windows，以及 Node 18/20 / Current CI covers macOS, Linux, Windows, and Node 18/20 |

<a id="install"></a>
## Install / 安装

| 中文 | English |
| --- | --- |
| 当前推荐方式是直接从源码安装并通过 `npm link` 暴露 `herc` 命令。默认 deterministic 路径适合本地直接跑通，不需要先准备复杂外部基础设施。 | The recommended path today is to install from source and expose the `herc` command with `npm link`. The default deterministic path is meant to run locally first, without requiring complex external infrastructure. |
| 如果你只是想让 AI 在一台新机器上 clone 后立刻复现仓库里的公开 benchmark、结果 JSON 和白皮书，现在也可以直接跑一条跨平台命令：`npm run benchmark:reproduce`。 | If you want an AI on a fresh machine to clone the repo and immediately reproduce the public benchmarks, JSON result files, and whitepaper, there is now a single cross-platform command: `npm run benchmark:reproduce`. |

```bash
git clone https://github.com/Horace-Maxwell/Harness_Engineering_Regression_Copilot.git
cd Harness_Engineering_Regression_Copilot
npm ci
npm run build
npm link
herc version
```

| 中文 | English |
| --- | --- |
| 如果你不想做全局 link，也可以直接用 `node dist/cli.js <command>`。仓库也提供了跨平台安装脚本：[scripts/install-herc.sh](scripts/install-herc.sh) 和 [scripts/install-herc.ps1](scripts/install-herc.ps1)。 | If you do not want a global link, you can run commands directly with `node dist/cli.js <command>`. The repository also includes cross-platform installers: [scripts/install-herc.sh](scripts/install-herc.sh) and [scripts/install-herc.ps1](scripts/install-herc.ps1). |

### Quick Install Scripts / 一键安装脚本

```bash
sh ./scripts/install-herc.sh
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-herc.ps1
```

### Cold-Start Reproduction / 冷启动复现

```bash
git clone https://github.com/Horace-Maxwell/Harness_Engineering_Regression_Copilot.git
cd Harness_Engineering_Regression_Copilot
npm ci
npm run benchmark:reproduce
```

| 中文 | English |
| --- | --- |
| 这条命令会自动 build CLI、重跑四组公开 benchmark、刷新 `benchmarks/results/*.json`，并重新生成 [EVALUATION_WHITEPAPER.md](EVALUATION_WHITEPAPER.md)。不需要手工重定向输出，也不需要记多条脚本命令。 | This command builds the CLI, reruns the four public benchmark suites, refreshes `benchmarks/results/*.json`, and regenerates [EVALUATION_WHITEPAPER.md](EVALUATION_WHITEPAPER.md). It does not require manual shell redirection or memorizing multiple script commands. |

<a id="quick-start"></a>
## Quick Start / 快速开始

| 中文 | English |
| --- | --- |
| 下面这条路径展示了最短的一条实用闭环：初始化工作区、导入一个真实失败、提炼成 case、执行 gate、读取报告。 | This path shows the shortest practical loop: initialize the workspace, import a real failure, distill it into a case, run the gate, and read the report. |

### Shell / Bash

```bash
herc init
printf 'The answer approved a refund after 45 days.\n' | herc import --paste --append-tag refunds,policy
herc distill
herc run --profile standard
herc report --format summary
```

### PowerShell

```powershell
herc init
"The answer approved a refund after 45 days." | herc import --paste --append-tag refunds,policy
herc distill
herc run --profile standard
herc report --format summary
```

| 中文 | English |
| --- | --- |
| 初始化之后，你也可以继续用 `herc doctor` 检查工作区健康状态，用 `herc inspect <caseId>` 看单个 case 的结构化细节。 | After initialization, you can also use `herc doctor` to check workspace health and `herc inspect <caseId>` to inspect one case in a structured view. |

## Typical Flow / 典型工作流

<p align="center">
  <strong>Failure / 失败</strong>
  &nbsp;→&nbsp;
  <strong>Import / 导入</strong>
  &nbsp;→&nbsp;
  <strong>Distill / 提炼</strong>
  &nbsp;→&nbsp;
  <strong>Review / 审核</strong>
  &nbsp;→&nbsp;
  <strong>Run / 执行</strong>
  &nbsp;→&nbsp;
  <strong>Report & Gate / 报告与门禁</strong>
</p>

| Step / 步骤 | Command / 命令 | 中文 | English |
| --- | --- | --- | --- |
| 1 | `herc init` | 在当前仓库建立本地工作区和基础目录 | Bootstrap the repo-local workspace and base directories |
| 2 | `herc doctor` | 检查配置、目录和 schema 可用性 | Validate configuration, directories, and schema health |
| 3 | `herc import` | 从文本、JSON、JSONL、CSV 或 stdin 导入失败记录 | Import failures from text, JSON, JSONL, CSV, or stdin |
| 4 | `herc distill` | 把 incident 归纳成 draft regression cases | Distill incidents into draft regression cases |
| 5 | `herc accept` | 标记 reviewed，并写入 baseline response | Mark a case as reviewed and write a baseline response |
| 6 | `herc run` | 以 `quick`、`standard` 或 `deep` 运行本地 gate | Run the local gate with `quick`, `standard`, or `deep` |
| 7 | `herc report` | 输出 summary、markdown 或 JSON 结果 | Produce summary, markdown, or JSON output |

<a id="benchmarks"></a>
## Benchmarks / 基准

| 中文 | English |
| --- | --- |
| 下面的数字来自仓库内公开的 benchmark 结果文件，方便别人直接复核。当前数据文件见 [benchmark-results-2026-04-10.json](benchmarks/results/benchmark-results-2026-04-10.json)、[workflow-impact-results-2026-04-10.json](benchmarks/results/workflow-impact-results-2026-04-10.json)、[adoption-impact-results-2026-04-10.json](benchmarks/results/adoption-impact-results-2026-04-10.json)、[workflow-upgrade-impact-results-2026-04-10.json](benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json) 和 [stability-study-results-2026-04-10.json](benchmarks/results/stability-study-results-2026-04-10.json)。如果你想在另一台机器上完整复现这组公开结果，现在只需要运行 `npm run benchmark:reproduce`；如果你想按更严格的标准验证稳定性，可以运行 `npm run benchmark:stability`，并查看 [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md) 和 [BENCHMARK_STABILITY_REPORT.md](BENCHMARK_STABILITY_REPORT.md)。如果你想看更接近论文/白皮书的完整分析，也可以直接看 [EVALUATION_WHITEPAPER.md](EVALUATION_WHITEPAPER.md)。 | The numbers below come from the public benchmark result files in this repository so that others can verify them directly. The current data files are [benchmark-results-2026-04-10.json](benchmarks/results/benchmark-results-2026-04-10.json), [workflow-impact-results-2026-04-10.json](benchmarks/results/workflow-impact-results-2026-04-10.json), [adoption-impact-results-2026-04-10.json](benchmarks/results/adoption-impact-results-2026-04-10.json), [workflow-upgrade-impact-results-2026-04-10.json](benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json), and [stability-study-results-2026-04-10.json](benchmarks/results/stability-study-results-2026-04-10.json). If you want to fully reproduce this public benchmark pack on another machine, you now only need to run `npm run benchmark:reproduce`; if you want a stricter stability validation pass, run `npm run benchmark:stability` and read [BENCHMARK_STANDARD.md](BENCHMARK_STANDARD.md) plus [BENCHMARK_STABILITY_REPORT.md](BENCHMARK_STABILITY_REPORT.md). For a more paper-like analysis, you can also read [EVALUATION_WHITEPAPER.md](EVALUATION_WHITEPAPER.md). |

### Benchmark Scorecard / 基准总览

| Dimension / 维度 | 中文 | English |
| --- | --- | --- |
| Baseline runner performance / 基础执行性能 | 从一条原始失败到第一次红灯，HERC 的中位耗时是 `472.5 ms`；100 个确定性 case 的执行中位耗时是 `145.1 ms`。 | HERC reaches the first failing gate from one raw failure in `472.5 ms` median, and executes `100` deterministic cases in `145.1 ms` median. |
| Real workflow throughput / 真实工作流吞吐 | Support 批量导入 `50` 条 incident 并提炼成 case 的中位耗时是 `534.7 ms`，AI engineer 从投诉到红灯 gate 的中位耗时是 `458.9 ms`。 | A support batch import of `50` incidents to draft cases finishes in `534.7 ms` median, and an AI engineer can turn one complaint into a failing gate in `458.9 ms` median. |
| Shipped quality lift / 发布质量提升 | 在 `5` 个发布场景、`920` 条历史受保护指令上，采用 HERC 后的加权发布正确率从 `92.8%` 提升到 `100%`。 | Across `5` release scenarios and `920` protected historical instructions, adopting HERC raises weighted shipped correctness from `92.8%` to `100%`. |
| Workflow upgrade gains / 工作流升级收益 | 报告对比命令数下降 `66.7%`，非 Git 误跑预检时间下降 `65.1%`，并避免了 `1000` 个无意义执行 case。 | Workflow upgrades reduce report comparison commands by `66.7%`, cut non-Git preflight time by `65.1%`, and avoid `1000` wasted case executions. |
| Cross-platform deployability / 跨平台部署性 | 当前包体积 `55.4 KB`，运行时依赖 `2` 个，并已在 `3` 个操作系统和 `2` 个 Node 版本矩阵里验证。 | The current package is `55.4 KB`, uses `2` runtime dependencies, and is validated across a `3`-OS by `2`-Node-version matrix. |
| Multi-round stability / 多轮稳定性 | 在 `1` 轮 warm-up 加 `5` 轮正式复测里，核心 latency 指标 `CV` 基本都低于 `1%`，报告对比时间缩减 `CV` 仅 `0.5%`。 | In `1` warm-up plus `5` measured rerun rounds, the core latency metrics stay mostly below `1%` coefficient of variation, and the report-comparison time reduction has a `CV` of only `0.5%`. |

### Baseline Performance / 基础性能

| Scenario / 场景 | Result / 结果 | Why it matters / 意义 |
| --- | --- | --- |
| Raw failure to first failing gate / 原始失败到第一次红灯 | `472.5 ms` median | 适合本地调试、快速复现和修复回路 / Fast enough for local repro and fix loops |
| Manual case to first passing gate / 手工建 case 到首次通过 | `457.7 ms` median | case 审核和 baseline 循环很短 / Keeps review and baseline loops short |
| 100 deterministic cases / 100 个确定性 case | `145.1 ms` median | 单次执行足够轻，适合高频本地运行 / Light enough for frequent local runs |
| Approximate throughput / 近似吞吐 | `~689.2 cases/sec` | 说明 deterministic runner 的执行面很轻 / Shows the deterministic runner stays lightweight |
| Packed package size / 打包体积 | `55.4 KB` | 适合小仓库、脚本化接入和本地工具链 / Friendly to small repos, scripts, and local toolchains |

### Stability Check / 稳定性复测

| Metric / 指标 | Result / 结果 | Why it matters / 意义 |
| --- | --- | --- |
| Raw failure to first fail / 原始失败到首次红灯 | `464.6 ms` median across `5` rounds, `CV 0.6%` | 说明本地 failure reproduction 足够稳，不是偶然跑快 / Shows local failure reproduction is genuinely steady, not a lucky run |
| 100 deterministic cases / `100` 个确定性 case | `144.7 ms` median, `CV 0.8%` | 说明 deterministic runner 的轻量级执行面在多轮下仍然稳定 / Shows the lightweight deterministic runner remains stable across reruns |
| Report comparison uplift / 报告对比收益 | `60.8%` median time reduction, `CV 0.5%` | 这类 workflow 提升可以更放心地公开引用 / This workflow improvement is stable enough to cite with confidence |
| Changed-only large-suite reduction / 大套件 changed-only 收益 | `27.2%` median time reduction, `CV 11.7%` | 方向很稳，但更容易受机器噪音影响，适合按“方向性收益”表达 / The direction is stable, but it is more machine-sensitive and should be framed as directional uplift |
| Correctness uplift / 正确率 uplift | `+7.2 pp` across all `5` rounds, `CV 0.0%` | 质量收益是完全稳定的 deterministic 结果 / The quality uplift is fully stable in the deterministic setup |

### Adoption Lift / 接入后的质量提升

| Scenario / 场景 | 中文 | English |
| --- | --- | --- |
| Global result / 总体结果 | 在 `5` 个候选发布场景和 `920` 条历史受保护指令上，不使用 HERC 时加权正确执行率是 `92.8%`，使用 HERC 并修复失败项后达到 `100%`。 | Across `5` candidate release scenarios and `920` protected historical instructions, weighted correctness is `92.8%` without HERC and reaches `100%` after using HERC and fixing the failed cases. |
| Confidence interval / 置信区间 | 这组总体正确率 uplift 是 `+7.2 pp`，95% bootstrap 置信区间是 `+5.5` 到 `+8.8 pp`。 | The overall correctness uplift is `+7.2 pp`, with a 95% bootstrap confidence interval from `+5.5` to `+8.8 pp`. |
| Leakage reduction / 泄漏抑制 | 历史失败泄漏下降 `100%`，changed-only 路径把平均执行面缩小 `89.7%`。 | Historical failure leakage drops by `100%`, while changed-only execution reduces the average execution surface by `89.7%`. |
| Scenario detail / 场景细节 | `customer-policy-hotfix`：`80.0% -> 100.0%`；`support-routing-refresh`：`84.0% -> 100.0%`；`agent-tool-contract-update`：`88.0% -> 100.0%`；`rag-policy-release`：`92.8% -> 100.0%`；`weekly-release-train`：`95.2% -> 100.0%`。 | `customer-policy-hotfix`: `80.0% -> 100.0%`; `support-routing-refresh`: `84.0% -> 100.0%`; `agent-tool-contract-update`: `88.0% -> 100.0%`; `rag-policy-release`: `92.8% -> 100.0%`; `weekly-release-train`: `95.2% -> 100.0%`. |

### Stratified Uplift / 分层 Uplift

| Slice / 分层 | Result / 结果 | Why it matters / 意义 |
| --- | --- | --- |
| Task group: Policy and knowledge / 任务组：政策与知识 | `91.9% -> 100.0%`, uplift `+8.1 pp` | 面向用户的政策和知识面回归，提升依然明显 / Policy-heavy customer-facing surfaces still show material uplift |
| Task group: Ops and release / 任务组：运维与发布 | `94.2% -> 100.0%`, uplift `+5.8 pp` | 发布列车和路由类问题也能被同一套机制稳定拦截 / The same workflow still blocks routing and release-train failures |
| Scale bucket: Small suites / 规模：小套件 | `82.9% -> 100.0%`, uplift `+17.1 pp` | 早期或高风险小套件提升最显著 / Small, focused suites see the sharpest uplift |
| Scale bucket: Large suites / 规模：大套件 | `95.2% -> 100.0%`, uplift `+4.8 pp` | 大套件虽然基础更稳，但仍能持续压低已知失败泄漏 / Large suites start from a higher baseline but still reduce known-failure leakage |

### Workflow Impact / 工作流收益

| Role / 角色 | Workflow / 工作流 | Result / 结果 |
| --- | --- | --- |
| Support / Ops / PM | Import `50` incidents and distill draft cases / 导入 `50` 条 incident 并提炼 case | `50 -> 50` draft cases, `534.7 ms` median |
| AI engineer | Turn one complaint into a failing gate / 把一条投诉变成红灯 gate | `458.9 ms` median |
| QA / Reviewer | Accept one case and validate baseline / 接受一个 case 并验证 baseline | `459.1 ms` median |
| CI / Platform | Run only changed cases in a `5000` case suite / 在 `5000` 个 case 的套件里只跑 changed cases | `5000 -> 3` executed cases, `99.9%` fewer cases, `25.9%` less time |
| Release owner | Enforce review quality in `deep` profile / 在 `deep` 档严格执行审核门禁 | Blocked `5/5` unreviewed cases |
| Regression triage | Compare latest run against the previous run / 对比最新 run 与上一次 run | `287.8 ms -> 112.5 ms`, `66.7%` fewer commands |
| CI preflight | Detect non-git changed-only fallback before wasting a run / 在误跑前发现非 Git changed-only fallback | Avoided `1000` executed cases, `65.1%` less time with `doctor --quick` |

### Workflow Upgrade Details / 工作流升级细节

| Upgrade / 升级点 | 中文 | English | Source / 来源 |
| --- | --- | --- | --- |
| `report --compare-previous` | 把历史上需要 `3` 条命令和 `9` 行临时逻辑的对比操作压缩成 `1` 条命令，时间中位数下降 `60.9%`。 | Compresses a comparison workflow that previously needed `3` commands and `9` lines of ad hoc logic into `1` command, reducing median time by `60.9%`. | [workflow-upgrade-impact-results-2026-04-10.json](benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json) |
| `doctor --quick` | 在非 Git 工作区能提前阻止 `--changed` 误跑，避免 `1000` 个无意义 case 执行，时间下降 `65.1%`。 | Stops `--changed` from misfiring in a non-Git workspace, avoiding `1000` meaningless case executions while cutting time by `65.1%`. | [workflow-upgrade-impact-results-2026-04-10.json](benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json) |
| automatic `.gitignore` sync | `herc init` 默认自动写入 `.herc/incidents`、`.herc/reports`、`.herc/responses`，把手工修改文件数从 `1` 降到 `0`。 | `herc init` now writes `.herc/incidents`, `.herc/reports`, and `.herc/responses` into `.gitignore` by default, reducing manual file edits from `1` to `0`. | [workflow-upgrade-impact-results-2026-04-10.json](benchmarks/results/workflow-upgrade-impact-results-2026-04-10.json) |

| 中文 | English |
| --- | --- |
| 这些结果来自本地 `darwin arm64 / Node v25.6.1` 测试环境，主要用于说明工作流结构和相对执行成本，不应被当作所有机器上的统一性能保证。 | These results were measured on a local `darwin arm64 / Node v25.6.1` environment. They are intended to show workflow shape and relative execution cost, not a universal performance guarantee for every machine. |

## CLI Surface / CLI 能力一览

| Command / 命令 | 中文 | English |
| --- | --- | --- |
| `init` | 初始化 repo-local 工作区 | Initialize the repo-local workspace |
| `doctor` | 检查工作区、schema 和环境状态，支持 `--quick` 预检 | Validate workspace, schema, and environment health, with `--quick` for fast preflight checks |
| `import` | 从文件、stdin 和结构化格式导入失败 | Import failures from files, stdin, and structured formats |
| `distill` | 从 incident 生成 draft cases | Generate draft cases from incidents |
| `create-case` | 不经 import 直接手工建 case | Create a case manually without import first |
| `accept` | 标记 reviewed，并可写 baseline | Mark a case as reviewed and optionally write a baseline |
| `set-status` | 切换 `active`、`draft`、`muted`、`archived` | Change a case to `active`, `draft`, `muted`, or `archived` |
| `run` | 运行 gate，支持 `--changed`、`--fail-on` 等选项 | Run gates with options such as `--changed` and `--fail-on` |
| `report` | 读取最新结果，并可和上一次 run 做对比 | Read the latest result and optionally compare it with the previous run |
| `list` | 浏览和过滤现有 cases | Browse and filter existing cases |
| `inspect` | 结构化查看单个 case 或原始内容 | Inspect one case in structured or raw form |
| `version` | 输出 CLI 和环境版本信息 | Print CLI and environment version details |

## Machine Integration / 机器集成

| 中文 | English |
| --- | --- |
| 所有命令都支持 `--json`，适合脚本、CI 和 GitHub Actions。`run` 额外支持 `--changed`、`--strict-skips`、`--stdin-response`、`--response-file`、`--fail-on` 等选项，可以较自然地嵌进现有工程流程。 | Every command supports `--json`, which makes shell scripts, CI, and GitHub Actions straightforward. `run` also supports options such as `--changed`, `--strict-skips`, `--stdin-response`, `--response-file`, and `--fail-on`, which helps it fit existing engineering workflows. |

```bash
npm ci
npm run build
node dist/cli.js run --profile standard --fail-on failed,invalid,skipped
node dist/cli.js report --compare-previous
```

<a id="launch-kit"></a>
## Built-In GitHub Repo Launch Kit / 内置 GitHub 仓库启动模板

| 中文 | English |
| --- | --- |
| 仓库内附带了一套 [GitHub Repo Launch Kit](github-repo-launch-kit/README.md)。它可以生成高质量 README、社区文件、CI、docs 骨架和仓库结构模板，也可以为组织级 `.github` 仓库生成 community health files。 | The repository ships with a built-in [GitHub Repo Launch Kit](github-repo-launch-kit/README.md). It can generate high-quality README files, community files, CI, docs skeletons, and repository structure starters, and it can also generate community health files for an organization-level `.github` repository. |

```bash
npm run repo-kit:scaffold -- --meta github-repo-launch-kit/project.meta.example.json --target /tmp/my-repo --dry-run
```

## Repository Layout / 仓库结构

| Path / 路径 | 中文 | English |
| --- | --- | --- |
| [src](src) | TypeScript CLI 源码 | TypeScript CLI source |
| [test](test) | 单元测试和端到端测试 | Unit tests and end-to-end tests |
| [benchmarks](benchmarks) | benchmark runner、fixtures 和结果文件 | Benchmark runners, fixtures, and result files |
| [EVALUATION_WHITEPAPER.md](EVALUATION_WHITEPAPER.md) | 公开的评估白皮书，包含分层 uplift、95% 置信区间和方法说明 | Public evaluation whitepaper with stratified uplift, 95% confidence intervals, and methodology notes |
| [github-repo-launch-kit](github-repo-launch-kit) | 内置仓库启动模板包 | Built-in repository launch kit |
| [.github](.github) | CI、issue templates 和 PR 模板 | CI, issue templates, and PR templates |
| [.local-dev-docs](.local-dev-docs) | 本地开发文档目录，默认不上传 GitHub | Local development docs folder, ignored from GitHub by default |

<a id="contributing"></a>
## Contributing / 参与贡献

| 中文 | English |
| --- | --- |
| 欢迎通过 bug 修复、测试补强、CLI 体验优化、benchmark 改进和文档完善来贡献。提交 PR 前建议至少运行下面这条检查。 | Contributions are welcome across bug fixes, stronger tests, CLI ergonomics, benchmark improvements, and documentation. Before opening a PR, run the check below at minimum. |

```bash
npm run check
```

| 中文 | English |
| --- | --- |
| 更多协作说明见 [CONTRIBUTING.md](CONTRIBUTING.md)。 | See [CONTRIBUTING.md](CONTRIBUTING.md) for collaboration details. |

## Support, Security, and License / 支持、安全与许可

| Topic / 主题 | 中文 | English |
| --- | --- | --- |
| Support / 支持 | 使用问题和一般建议见 [SUPPORT.md](SUPPORT.md) | For usage questions and general support, see [SUPPORT.md](SUPPORT.md) |
| Security / 安全 | 安全问题提交流程见 [SECURITY.md](SECURITY.md) | For security reporting, see [SECURITY.md](SECURITY.md) |
| Code of Conduct / 行为规范 | 协作规范见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | For collaboration expectations, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |
| License / 许可证 | 本项目采用 [MIT](LICENSE) | This project is licensed under [MIT](LICENSE) |
