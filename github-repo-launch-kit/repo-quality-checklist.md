# Repo Quality Checklist

日期 Date: 2026-04-09

## 1. 目标 / Goal

中文：
这份清单用来回答一个问题：一个“看上去很成熟、值得 star、值得 fork、值得接手”的 GitHub repo，至少应该具备什么。

English:
This checklist answers one question: what a GitHub repo must contain to feel mature, forkable, star-worthy, and easy to adopt.

## 2. 最低可发布标准 / Minimum Publishable Standard

中文：
- `README.md`：能解释项目是什么、为什么存在、怎么开始
- `LICENSE`：许可证明确
- `CONTRIBUTING.md`：说明怎样贡献
- `SECURITY.md`：说明如何报告安全问题
- `SUPPORT.md`：说明去哪里求助
- `.github/ISSUE_TEMPLATE/`：至少 bug report 和 feature request
- `.github/PULL_REQUEST_TEMPLATE.md`：统一 PR 质量
- 一个最基础的 CI workflow
- 基本目录结构清楚，别人能找到源码、文档、示例、测试

English:
- `README.md`: explains what the project is, why it exists, and how to start
- `LICENSE`: makes the license explicit
- `CONTRIBUTING.md`: explains how to contribute
- `SECURITY.md`: explains how to report security issues
- `SUPPORT.md`: explains where to get help
- `.github/ISSUE_TEMPLATE/`: at least bug report and feature request
- `.github/PULL_REQUEST_TEMPLATE.md`: standardizes PR quality
- A basic CI workflow
- A clear directory layout so people can find source, docs, examples, and tests

## 3. 优秀仓库标准 / Strong Repo Standard

中文：
- 首页 30 秒可理解，且第一屏就说清楚价值
- 有快速开始命令，而不是只给大段文字
- 有项目状态说明：experimental、beta、stable 或 maintenance
- 有面向用户和面向开发者的文档入口
- 有清晰的支持边界：哪里可以提问，哪里应该提 bug，哪里报告安全问题
- 有 release、changelog 或 roadmap 之一来体现项目演进
- 有维护者信息或 ownership 说明
- 有结构化 issue / PR 流程，减少维护者负担

English:
- The homepage is understandable within 30 seconds and states the value above the fold
- There is a quickstart command path instead of only long prose
- The project status is explicit: experimental, beta, stable, or maintenance
- There are clear entry points for both user-facing and developer-facing docs
- Support boundaries are clear: where to ask questions, file bugs, and report security issues
- There is at least one of release notes, a changelog, or a roadmap to show project evolution
- Maintainers or ownership are visible
- Issue and PR flows are structured to reduce maintainer burden

## 4. AI Agent 友好标准 / AI-Agent-Friendly Standard

中文：
- 文件名和目录名直观，不玩花哨命名
- README 中的运行命令可直接复制
- docs 中有简洁的项目 brief 和架构说明
- 模板里尽量用占位符和显式注释，而不是隐式假设
- 避免要求人工点击网页才能完成初始化
- workflow、issue forms、配置文件尽量可脚本生成

English:
- File and directory names are straightforward instead of clever
- Commands in the README are directly copyable
- Docs include a concise project brief and architecture note
- Templates use placeholders and explicit notes instead of hidden assumptions
- Initialization does not depend on manual web UI clicking
- Workflows, issue forms, and config files are scriptable whenever possible

## 5. 容易被忽略但很重要的点 / Easy-To-Miss but Important Factors

中文：
- 不要忘记项目状态说明，否则用户无法判断可用性
- 不要只有安装，没有“验证安装成功”的最小示例
- 不要只有代码，没有支持与安全入口
- 不要让 issue 区同时承担提问、bug、需求、支持四种角色
- 不要把所有内容塞进 README，长文档应拆到 `docs/`

English:
- Do not forget a project status statement, or users cannot gauge readiness
- Do not stop at installation; add a minimal “verify it works” example
- Do not ship code without support and security paths
- Do not force issues to carry questions, bugs, feature ideas, and support requests all at once
- Do not cram everything into the README; longer material should move into `docs/`

## 6. 常见反模式 / Common Anti-Patterns

中文：
- badge 一堆，但看不出项目实际做什么
- README 很长，却没有快速开始
- 自动生成了很多文件，但内容几乎全是空话
- workflow 很复杂，但没有稳定通过
- 目录很多，但没有边界说明
- 用了模板，却忘记删占位符和示例文字

English:
- Too many badges while the actual project purpose remains unclear
- A very long README with no quickstart
- Many generated files with almost no concrete content
- A complex workflow that does not pass reliably
- Many directories with no boundary explanation
- Template placeholders and sample text left in the final repo

## 7. 发布前最后检查 / Final Pre-Publish Check

中文：
- 首页第一屏是否能说清楚“是什么、给谁用、怎么开始”
- 所有链接是否真实存在
- 所有 badge 是否真实有效
- 所有命令是否真的可运行
- 所有模板占位符是否都已清理
- 如果删掉不必要文件，仓库会不会更好

English:
- Does the first screen explain what it is, who it is for, and how to start
- Do all links actually exist
- Are all badges real and working
- Do all commands actually run
- Have all template placeholders been removed
- Would the repo improve if unnecessary files were deleted
