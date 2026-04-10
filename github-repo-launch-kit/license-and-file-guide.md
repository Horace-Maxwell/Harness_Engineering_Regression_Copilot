# License and File Guide

日期 Date: 2026-04-09

## 1. 目标 / Goal

中文：
这份说明回答两个问题：应该放哪些文件，以及这些文件各自解决什么问题。

English:
This guide answers two questions: which files should exist, and what problem each file solves.

## 2. 核心文件 / Core Files

中文：
- `README.md`：项目入口
- `LICENSE`：法律边界
- `CONTRIBUTING.md`：贡献流程
- `SECURITY.md`：安全问题入口
- `SUPPORT.md`：支持与求助入口
- `CODE_OF_CONDUCT.md`：社区行为边界
- `CHANGELOG.md`：演进记录

English:
- `README.md`: project entry point
- `LICENSE`: legal boundary
- `CONTRIBUTING.md`: contribution workflow
- `SECURITY.md`: security issue intake path
- `SUPPORT.md`: support and help path
- `CODE_OF_CONDUCT.md`: community behavior boundary
- `CHANGELOG.md`: evolution record

## 3. GitHub 支撑文件 / GitHub Support Files

中文：
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ci.yml`

English:
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ci.yml`

## 4. 辅助文件 / Support Files

中文：
- `.editorconfig`：跨编辑器格式一致性
- `.gitattributes`：行尾和文本属性
- `.gitignore`：避免无关文件进入仓库
- `docs/PROJECT_BRIEF.md`：项目目标和非目标
- `docs/ARCHITECTURE.md`：结构边界和关键组件

English:
- `.editorconfig`: formatting consistency across editors
- `.gitattributes`: line endings and text attributes
- `.gitignore`: keeps irrelevant files out of the repo
- `docs/PROJECT_BRIEF.md`: project goals and non-goals
- `docs/ARCHITECTURE.md`: boundaries and key components

## 5. 许可证选择建议 / License Selection Guidance

中文：
- `MIT`：最宽松、最常见，适合多数工具和库
- `Apache-2.0`：在宽松基础上对专利条款更清晰
- `BSD-3-Clause`：宽松，企业环境也常见
- `Unlicense`：接近 public domain，但团队接受度不一定最好

English:
- `MIT`: the loosest and most common choice for many tools and libraries
- `Apache-2.0`: permissive, with clearer patent language
- `BSD-3-Clause`: permissive and common in company environments
- `Unlicense`: close to public domain, though not every team prefers it

## 6. 不要做的事 / What Not To Do

中文：
- 不要没有 license 就公开发布
- 不要把“暂时没想好”写成模糊 license 说明
- 不要只有 README，没有 SUPPORT 和 SECURITY
- 不要把 issue 区当成所有事情的唯一入口

English:
- Do not publish publicly without a license
- Do not ship a vague license statement because the team has not decided yet
- Do not stop at a README while skipping SUPPORT and SECURITY
- Do not make the issue tracker the only intake path for every kind of request

## 7. 对组织级 `.github` 仓库的建议 / Guidance for an Organization-Level `.github` Repo

中文：
组织级 `.github` 仓库更适合放默认的社区健康文件，而不是项目专属 README、LICENSE 或架构文档。也就是说，`community-health` 模式应优先生成：
- `CONTRIBUTING.md`
- `SECURITY.md`
- `SUPPORT.md`
- `CODE_OF_CONDUCT.md`
- issue templates
- PR template

English:
An organization-level `.github` repository is better suited for default community health files than project-specific README, LICENSE, or architecture docs. In practice, `community-health` mode should focus on:
- `CONTRIBUTING.md`
- `SECURITY.md`
- `SUPPORT.md`
- `CODE_OF_CONDUCT.md`
- issue templates
- the PR template
