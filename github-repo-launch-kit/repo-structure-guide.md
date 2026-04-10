# Repo Structure Guide

日期 Date: 2026-04-09

## 1. 原则 / Principles

中文：
一个好的仓库结构应该做到三件事：找得到、猜得对、改得动。也就是说，别人第一次打开仓库时，能快速找到核心代码、文档、测试和示例，并且大致猜到哪些目录是做什么的。

English:
A good repo structure should do three things well: make things easy to find, easy to predict, and easy to change. Someone opening the repo for the first time should quickly find the core code, docs, tests, and examples and roughly understand what each directory is for.

## 2. 最小通用结构 / Minimal Generic Structure

中文：
下面这套结构适合多数项目：

```text
.
├─ README.md
├─ LICENSE
├─ CONTRIBUTING.md
├─ SECURITY.md
├─ SUPPORT.md
├─ CHANGELOG.md
├─ docs/
├─ src/
├─ test/ or tests/
├─ examples/ or demo/
└─ .github/
```

English:
This structure works for many projects:

```text
.
├─ README.md
├─ LICENSE
├─ CONTRIBUTING.md
├─ SECURITY.md
├─ SUPPORT.md
├─ CHANGELOG.md
├─ docs/
├─ src/
├─ test/ or tests/
├─ examples/ or demo/
└─ .github/
```

## 3. 按项目类型做轻微调整 / Light Adjustments by Project Type

中文：
`library`
- 重点是 `src/`、`test/`、`docs/`

`app`
- 往往还需要 `public/`、`assets/`、`app/` 或 `web/`

`service`
- 往往要明确 `api/`、`config/`、`scripts/`、`deploy/`

`research`
- 往往要区分 `paper/`、`notebooks/`、`data/`、`experiments/`

`monorepo`
- 应明确 `packages/`、`apps/`、`services/`、`tooling/`

English:
`library`
- Usually emphasizes `src/`, `test/`, and `docs/`

`app`
- Often also needs `public/`, `assets/`, `app/`, or `web/`

`service`
- Usually benefits from clearly separated `api/`, `config/`, `scripts/`, and `deploy/`

`research`
- Usually needs a boundary between `paper/`, `notebooks/`, `data/`, and `experiments/`

`monorepo`
- Should clearly separate `packages/`, `apps/`, `services/`, and `tooling/`

## 4. 目录命名建议 / Naming Guidance

中文：
- 用直白目录名，不要用内部黑话
- 不要同时存在 `docs/`、`documentation/`、`wiki/` 三套文档目录
- 测试目录统一成一种风格
- 不要把脚本、工具、实验内容都混在根目录

English:
- Prefer direct directory names over internal jargon
- Do not maintain `docs/`, `documentation/`, and `wiki/` all at once
- Keep test directory naming consistent
- Do not mix scripts, tools, and experiments directly into the repo root

## 5. 对 AI Agent 的结构规则 / Structural Rules for AI Agents

中文：
- 如果某目录还没有清晰职责，就不要先创建
- 根目录文件控制在必要范围内，避免一层太拥挤
- 文档和源码分层，但不要过度嵌套
- 如果项目很小，宁可少目录，也不要假装大型工程

English:
- Do not create a directory before its responsibility is clear
- Keep the repo root focused on necessary files instead of overcrowding it
- Separate docs from code, but avoid deep nesting
- If the project is small, prefer fewer directories over pretending it is a massive system
