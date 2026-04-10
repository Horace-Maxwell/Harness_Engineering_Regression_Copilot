# Contributing

## 1. 如何参与 / How To Contribute

中文：
欢迎贡献 bug 修复、测试、文档、CLI 体验改进、benchmark 改进，以及更多高置信度的 deterministic checks。

English:
Contributions are welcome across bug fixes, tests, docs, CLI ergonomics, benchmark improvements, and stronger high-confidence deterministic checks.

## 2. 开始之前 / Before You Start

中文：
- 先阅读 [README.md](README.md)
- 先跑一次 `node dist/cli.js --help`
- 如果是方向性改动，先开 issue 或 discussion 对齐

English:
- Read [README.md](README.md) first
- Run `node dist/cli.js --help` once for the current CLI surface
- For directional changes, open an issue or discussion first

## 3. 提交前检查 / Before Opening a PR

中文：
请至少运行：

```bash
npm run check
```

English:
Please run at least:

```bash
npm run check
```

## 4. 改动原则 / Change Principles

中文：
- 保持 local-first、cross-platform、轻依赖
- 优先真实可验证的能力
- 避免把简单工作流变重
- 不做无关重构

English:
- Keep the project local-first, cross-platform, and lightweight
- Prefer real, verifiable behavior
- Avoid making simple workflows heavier
- Skip unrelated refactors
