# Harness_Engineering_Regression_Copilot

[![CI](https://img.shields.io/github/actions/workflow/status/Horace-Maxwell/Harness_Engineering_Regression_Copilot/ci.yml?branch=main&label=CI)](https://github.com/Horace-Maxwell/Harness_Engineering_Regression_Copilot/actions)
![Node >=18](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![Failure-first](https://img.shields.io/badge/workflow-failure--first-0f766e)
![Local-first](https://img.shields.io/badge/runtime-local--first-1d4ed8)
![Deterministic-first](https://img.shields.io/badge/evals-deterministic--first-7c3aed)
![First failing gate 459.1ms](https://img.shields.io/badge/first%20failing%20gate-459.1ms-0a7ea4)
![699.8 cases/sec](https://img.shields.io/badge/throughput-699.8%20cases%2Fsec-16a34a)
![Changed run 99.9% fewer cases](https://img.shields.io/badge/changed%20run-99.9%25%20fewer%20cases-f97316)

中文：
Harness_Engineering_Regression_Copilot，简称 `AIRC`，是一个面向 AI 应用、RAG、agent 和 Copilot 场景的回归测试 CLI。它把生产失败、坏对话、错误 trace 和支持工单直接转成可维护的回归资产，再把这些资产接进本地开发循环和 GitHub PR gate。

English:
Harness_Engineering_Regression_Copilot, abbreviated as `AIRC`, is a regression testing CLI for AI apps, RAG systems, agents, and copilots. It turns production failures, bad conversations, broken traces, and support tickets into maintainable regression assets, then plugs those assets into local development loops and GitHub PR gates.

中文：
这个项目关注的是一条很具体的路径：让团队更快地把“这里出过错”变成“这里以后会被拦住”。默认路径保持本地优先、跨平台、轻依赖，适合从单人项目一路长到团队工作流。

English:
The project is centered on one concrete path: helping teams turn “this broke before” into “this will be caught next time” much faster. The default path stays local-first, cross-platform, and lightweight, which makes it useful for both solo projects and team workflows.

## 1. 项目快照 / Snapshot

| 项目 / Item | 数值 / Value | 说明 / Notes |
| --- | --- | --- |
| CLI 命令数 / CLI commands | `12` | 基于当前实现统计 / Based on the current implementation |
| 执行档位 / Run profiles | `3` | `quick`、`standard`、`deep` / `quick`, `standard`, `deep` |
| 运行时依赖 / Runtime dependencies | `2` | `commander`、`yaml` / `commander`, `yaml` |
| 支持平台 / Supported platforms | `3` | macOS、Linux、Windows / macOS, Linux, Windows |
| 原始失败到红灯门禁 / Raw failure to failing gate | `459.1 ms` | 本地 benchmark 中位数 / Median from a local benchmark run |
| 确定性执行吞吐 / Deterministic throughput | `699.8 cases/sec` | 本地 deterministic runner 实测 / Measured on the local deterministic runner |
| `--changed` 执行量下降 / `--changed` execution reduction | `99.9%` | 大套件 changed-only 实测 / Measured on a large changed-only suite |
| `deep` 档未审核阻断率 / `deep` review blocking rate | `100%` on `5/5` cases | 严格 gate 实测 / Measured in the stricter gate flow |

## 2. 它解决什么问题 / What It Solves

中文：
很多 AI 团队已经有 trace、聊天记录、失败工单和线上反馈，但这些内容经常停留在“知道出过事”的层面，没能变成真正会跑、会拦、会积累的回归体系。AIRC 负责把这一步做短，让失败样本更容易进入工程流程。

English:
Many AI teams already have traces, chat logs, support tickets, and production failures, but that material often stays at the “we know this broke once” stage instead of becoming a real regression system that runs, blocks, and compounds over time. AIRC shortens that step so failure samples enter engineering workflows much more easily.

中文：
适合这些场景：
- AI 客服和知识库问答
- RAG 检索与回答质量回归
- Browser agent、workflow agent、internal Copilot
- 需要把历史 bad cases 放进 GitHub gate 的团队

English:
It fits especially well for:
- AI support and knowledge-base assistants
- RAG retrieval and answer-quality regression
- Browser agents, workflow agents, and internal copilots
- Teams that want historical bad cases to become GitHub gates

## 3. 团队为什么会喜欢它 / Why Teams Like It

| 优势 / Benefit | 中文 / Chinese | English |
| --- | --- | --- |
| Failure-first / 失败优先 | 从真实失败开始，而不是先编造一套合成 eval | Start from real failures instead of inventing synthetic evals first |
| Local-first / 本地优先 | 能直接放进普通仓库，不需要先搭云端 eval 平台 | Fits ordinary repos without requiring a cloud eval platform first |
| Deterministic-first / 确定性优先 | 先给出更便宜、更稳定、可复现的 gate | Gives teams cheaper, more stable, and reproducible gates first |
| 接入面小 / Small setup surface | 第一条能跑通的工作流足够短，容易接进 CI | The first working flow is short enough to fit into normal CI and repo setups |
| GitHub 友好 / GitHub-ready | 报告、退出码和 `--changed` 都贴合 PR 工作流 | Reports, exit codes, and `--changed` fit PR workflows naturally |

## 4. 快速开始 / Quick Start

中文：
下面这条路径适合第一次体验完整闭环。

English:
This is the shortest useful end-to-end path for a first run.

```bash
npm install
npm run build
node dist/cli.js init
printf 'The answer approved a refund after 45 days.\n' | node dist/cli.js import --paste --append-tag refunds,policy
node dist/cli.js distill
node dist/cli.js run --profile standard
node dist/cli.js report --format summary
```

中文：
PowerShell 示例：

English:
PowerShell example:

```powershell
npm install
npm run build
node dist/cli.js init
"The answer approved a refund after 45 days." | node dist/cli.js import --paste --append-tag refunds,policy
node dist/cli.js distill
node dist/cli.js run --profile standard
node dist/cli.js report --format summary
```

## 5. 典型工作流 / Typical Flow

| 步骤 / Step | 命令 / Command | 中文 / Chinese | English |
| --- | --- | --- | --- |
| 1 | `airc init` | 创建 repo 内本地工作区和样例结构 | Create a repo-local workspace and sample structure |
| 2 | `airc doctor` | 检查工作区、配置和目录可写性 | Check workspace health, configuration, and directory writability |
| 3 | `airc import` | 从文本、JSON、JSONL、CSV 或 stdin 导入历史失败 | Import historical failures from text, JSON, JSONL, CSV, or stdin |
| 4 | `airc distill` | 把 incident 提炼成 draft regression cases | Turn incidents into draft regression cases |
| 5 | `airc inspect` | 结构化检查单个 case | Review one case in a structured view |
| 6 | `airc accept` | 标记 reviewed，并写入 baseline response | Mark a case as reviewed and write a baseline response |
| 7 | `airc run` | 用 `quick`、`standard`、`deep` 执行本地 gate | Execute local gates with `quick`, `standard`, or `deep` |
| 8 | `airc report` | 输出 summary、markdown 或 JSON 结果 | Produce summary, markdown, or JSON results |

## 6. 基准结果 / Benchmark Highlights

| 场景 / Scenario | 结果 / Result | 中文 / Chinese | English |
| --- | --- | --- | --- |
| 原始失败到第一次红灯 / Raw failure to first failing gate | `459.1 ms` median | 本地调试和修复回归循环足够快 | Fast enough for local debugging and tight fix loops |
| 手工建 case 到首次通过 / Manual case to first passing gate | `455.2 ms` median | review 和 baseline 循环很短 | Keeps review and baseline loops short |
| 100 个确定性 case / 100 deterministic cases | `142.9 ms` median | 足以接进 PR gate 和高频本地运行 | Cheap enough for PR gates and frequent local runs |
| 执行吞吐 / Throughput | `699.8 cases/sec` | 说明本地 deterministic runner 很轻 | Confirms the local deterministic runner is lightweight |

中文：
这些数字来自本地 benchmark 和 workflow impact 实验。完整实验文档保存在本地开发文档目录，不默认上传 GitHub。

English:
These numbers come from local benchmark and workflow impact runs. The full experiment write-ups are kept in the local development docs folder and are not uploaded to GitHub by default.

## 7. 按角色看的工作流提升 / Workflow Impact by Role

| 角色 / Role | 工作流 / Workflow | 中文结果 / Chinese Result | English Result |
| --- | --- | --- | --- |
| Support / Ops / PM | 导入 50 条 incidents 并生成 draft cases / Import 50 incidents and distill draft cases | `50 -> 50` 个 draft cases，中位数 `579.6 ms` | `50 -> 50` draft cases, `579.6 ms` median |
| AI engineer | 把一个投诉变成 failing gate / Turn one complaint into a failing gate | 中位数 `456.5 ms` | `456.5 ms` median |
| QA / Reviewer | 接受一个 case 并验证 baseline / Accept one case and validate the baseline | 中位数 `457.1 ms` | `457.1 ms` median |
| CI / Platform engineer | 大套件里只跑 changed cases / Run only changed cases in a large suite | `5000 -> 3` 个执行 case，执行量下降 `99.9%`，时间下降 `27%` | `5000 -> 3` executed cases, `99.9%` fewer cases, `27%` less time |
| Release owner | 在严格 gate 里阻断未审核 case / Block unreviewed cases in stricter gates | `deep` 档拦下 `5/5` 个 case | `deep` blocked `5/5` cases |

## 8. CLI 能力一览 / CLI Surface

| 命令 / Command | 中文 / Chinese | English |
| --- | --- | --- |
| `init` | 初始化 repo 内工作区 | Bootstrap a repo-local workspace |
| `doctor` | 检查工作区、schema 和环境状态 | Validate workspace health, schema, and environment state |
| `import` | 从文件、stdin 和结构化格式导入失败 | Import failures from files, stdin, and structured formats |
| `distill` | 从 incident 生成 draft cases | Generate draft cases from incidents |
| `create-case` | 不经过 import 直接建 case | Create a case manually without import first |
| `accept` | 标记 reviewed，并可写 baseline | Mark a case as reviewed and optionally write a baseline |
| `set-status` | 把 case 切到 `active`、`draft`、`muted`、`archived` | Change a case to `active`, `draft`, `muted`, or `archived` |
| `run` | 用 profile 和 fail-on 规则执行 gate | Execute gates with profile and fail-on controls |
| `report` | 读取最新 summary、markdown 或 JSON 结果 | Read the latest summary, markdown, or JSON results |
| `list` | 浏览和过滤现有 cases | Browse and filter existing cases |
| `inspect` | 结构化查看单个 case 或原始内容 | Inspect one case in structured or raw form |
| `version` | 输出 CLI 和环境版本信息 | Print CLI and environment version details |

中文：
更完整的 CLI 规格保存在本地开发文档目录。

English:
The fuller CLI specification is kept in the local development docs folder.

## 9. 机器集成 / Machine Integration

中文：
所有命令都支持 `--json`，适合脚本、CI 和 GitHub Actions。`run` 还支持 `--changed`、`--fail-on`、`--stdin-response`、`--response-file` 等选项，方便接入不同工程形态。

English:
Every command supports `--json`, which makes shell scripts, CI, and GitHub Actions straightforward. `run` also supports flags such as `--changed`, `--fail-on`, `--stdin-response`, and `--response-file`, which helps the tool fit different engineering setups.

```bash
npm ci
npm run build
node dist/cli.js run --profile standard --fail-on failed,invalid,skipped
```

## 10. 仓库内容 / Repository Contents

| 路径 / Path | 中文 / Chinese | English |
| --- | --- | --- |
| [src](src) | TypeScript CLI 实现 | TypeScript CLI implementation |
| [test](test) | 单元测试和端到端测试 | Unit tests and end-to-end tests |
| [benchmarks](benchmarks) | benchmark runner、fixtures 和原始结果 | Benchmark runners, fixtures, and raw outputs |
| [github-repo-launch-kit](github-repo-launch-kit) | 内置 GitHub 仓库启动模板包 | Built-in GitHub repository launch kit |

## 11. 内置 GitHub Repo Launch Kit / Built-In GitHub Repo Launch Kit

中文：
仓库里附带了一套 [GitHub Repo Launch Kit](github-repo-launch-kit/README.md)。它可以为任何新项目生成高质量 README、社区文件、CI、docs 骨架和仓库结构模板，也能直接为组织级 `.github` 仓库生成 community health files。

English:
This repository includes a [GitHub Repo Launch Kit](github-repo-launch-kit/README.md). It can generate high-quality README files, community files, CI, docs skeletons, and repo structure starters for new projects, and it can also generate community health files for an organization-level `.github` repository.

```bash
npm run repo-kit:scaffold -- --meta github-repo-launch-kit/project.meta.example.json --target /tmp/my-repo --dry-run
```

## 12. 本地开发文档 / Local Development Docs

中文：
产品规划、竞品扫描、CLI 规格、schema、benchmark 记录和发布清单等开发文档已经移动到根目录下的 `.local-dev-docs/`。该目录默认被 `.gitignore` 忽略，只保留在本地，不随 GitHub 一起上传。

English:
Development materials such as product planning notes, competitive scans, CLI specifications, schema drafts, benchmark write-ups, and publish checklists have been moved into `.local-dev-docs/` at the project root. That directory is ignored by `.gitignore` by default and stays local instead of being uploaded to GitHub.

## 13. 参与贡献 / Contributing

中文：
欢迎通过 bug、tests、docs、CLI 体验优化和 benchmark 改进来贡献。提交前建议至少运行：

English:
Contributions are welcome across bugs, tests, docs, CLI ergonomics, and benchmark improvements. Before opening a PR, run at least:

```bash
npm run check
```

中文：
更详细的说明见 [CONTRIBUTING.md](CONTRIBUTING.md)。

English:
See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## 14. 支持与安全 / Support and Security

中文：
- 一般使用问题和建议看 [SUPPORT.md](SUPPORT.md)
- 安全问题看 [SECURITY.md](SECURITY.md)
- 行为规范看 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

English:
- For usage questions and support, see [SUPPORT.md](SUPPORT.md)
- For security reporting, see [SECURITY.md](SECURITY.md)
- For collaboration expectations, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## 15. 许可证 / License

中文：
本项目采用 [MIT](LICENSE)。

English:
This project is licensed under [MIT](LICENSE).
