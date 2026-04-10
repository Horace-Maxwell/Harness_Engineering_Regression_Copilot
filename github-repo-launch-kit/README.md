# GitHub Repo Launch Kit

日期 Date: 2026-04-09

## 1. 这是什么 / What This Is

中文：
GitHub Repo Launch Kit 是一套通用、可复制、可让 AI agent 稳定消费的仓库启动包。它的目标不是把仓库细节规定死，而是把一个“看上去很成熟、很可信、很容易接手”的 GitHub repo 所必须具备的元素、文件、结构、说明方式和生成流程整理成模板与方法。

English:
GitHub Repo Launch Kit is a generic, reusable, agent-friendly repository starter pack. Its goal is not to hard-code one repository style, but to package the essential elements, files, structure, documentation patterns, and generation flow needed for a GitHub repo that feels mature, trustworthy, and easy to adopt.

## 2. 为什么做成仓库内目录 / Why It Lives Inside This Repository

中文：
这套东西目前更适合放在仓库内的版本化目录，而不是先做 GitHub Release。原因很简单：
- clone 或下载整个仓库后即可直接使用
- 更适合 AI agent 在本地读取模板、说明和占位符
- 更容易随着项目一起迭代和做自检
- 以后如果需要，再单独打 tag、打包 zip 或做 release 也很方便

English:
For now, this kit works better as a versioned directory inside the repository instead of a GitHub Release. The reasons are simple:
- It is immediately usable after cloning or downloading the repository
- It is easier for AI agents to consume locally with templates, guidance, and placeholders
- It evolves more naturally alongside the project and its self-checks
- If needed later, it can still be zipped, tagged, or released as a separate artifact

## 3. 适合什么 / What It Is Good For

中文：
- 给全新 repo 做首版 README、社区文件、CI、文档骨架
- 给 AI agent 一套固定规则，让不同电脑上生成出来的 repo 更一致
- 给团队做“最低可发布标准”与“优秀仓库标准”的共识
- 给个人项目、开源项目、内部工具项目快速做出像样的门面和结构
- 给组织级 `.github` 仓库生成默认 community health files

English:
- Creating the first README, community files, CI, and documentation skeleton for a new repo
- Giving AI agents a fixed rule set so generated repos look more consistent across machines
- Helping teams align on a minimum publishable standard and a strong repo standard
- Giving personal projects, open-source projects, and internal tools a polished starting point fast
- Generating default community health files for an organization-level `.github` repository

## 4. 目录内容 / What Is Included

中文：
- [repo-quality-checklist.md](repo-quality-checklist.md)：强仓库必须具备的要素清单
- [readme-anatomy.md](readme-anatomy.md)：README 应该怎么组织
- [license-and-file-guide.md](license-and-file-guide.md)：License、社区文件、辅助文件怎么选
- [repo-structure-guide.md](repo-structure-guide.md)：仓库结构怎么设计得通用又清晰
- [agent-playbook.md](agent-playbook.md)：给 AI agent 的执行规则
- [project.meta.example.json](project.meta.example.json)：可填写的项目元数据样例
- [scaffold-repo.mjs](scaffold-repo.mjs)：跨平台 Node 脚手架
- `templates/base/`：核心模板
- `templates/optional/`：可选增强模板
- `licenses/`：常见许可证文本

English:
- [repo-quality-checklist.md](repo-quality-checklist.md): the required factors for a strong repo
- [readme-anatomy.md](readme-anatomy.md): how a strong README should be structured
- [license-and-file-guide.md](license-and-file-guide.md): how to choose a license, community files, and supporting files
- [repo-structure-guide.md](repo-structure-guide.md): how to design a repo structure that stays generic and clear
- [agent-playbook.md](agent-playbook.md): execution rules for AI agents
- [project.meta.example.json](project.meta.example.json): an editable project metadata example
- [scaffold-repo.mjs](scaffold-repo.mjs): a cross-platform Node scaffolder
- `templates/base/`: the core starter templates
- `templates/optional/`: optional enhancement packs
- `licenses/`: common license texts

## 5. 两种使用方式 / Two Usage Modes

中文：
`full-repo`
- 生成完整仓库骨架，包括 README、LICENSE、社区文件、docs、CI、辅助文件

`community-health`
- 只生成适合组织级 `.github` 仓库的社区健康文件
- 用于统一 issue template、PR template、SECURITY、SUPPORT、CONTRIBUTING、CODE_OF_CONDUCT

English:
`full-repo`
- Generates a complete repo skeleton, including README, LICENSE, community files, docs, CI, and support files

`community-health`
- Generates only the community health files appropriate for an organization-level `.github` repository
- Useful for standardizing issue templates, PR templates, SECURITY, SUPPORT, CONTRIBUTING, and CODE_OF_CONDUCT

## 6. 快速开始 / Quickstart

中文：
1. 复制元数据样例并填写：

```bash
cp github-repo-launch-kit/project.meta.example.json /tmp/project.meta.json
```

2. 先 dry run 看要生成什么：

```bash
node github-repo-launch-kit/scaffold-repo.mjs --meta /tmp/project.meta.json --target /tmp/my-repo --dry-run
```

3. 真正生成：

```bash
node github-repo-launch-kit/scaffold-repo.mjs --meta /tmp/project.meta.json --target /tmp/my-repo
```

4. 让 AI agent 或你自己把占位符替换成真实项目内容，删除不需要的章节。

English:
1. Copy and fill the metadata example:

```bash
cp github-repo-launch-kit/project.meta.example.json /tmp/project.meta.json
```

2. Run a dry run first to inspect the output:

```bash
node github-repo-launch-kit/scaffold-repo.mjs --meta /tmp/project.meta.json --target /tmp/my-repo --dry-run
```

3. Generate the actual repo starter:

```bash
node github-repo-launch-kit/scaffold-repo.mjs --meta /tmp/project.meta.json --target /tmp/my-repo
```

4. Let an AI agent or a human replace the placeholders with real project content and remove unused sections.

## 7. 设计原则 / Design Principles

中文：
- 通用优先，不绑死语言、框架、部署平台
- 漂亮但不过度装饰，优先清晰、可信、易接手
- 必要元素完整，细节保持可裁剪
- 对 AI agent 友好，避免依赖交互式工具
- 跨平台，默认用 Node 标准库和文本模板

English:
- Generic first, without hard-coding one language, framework, or deployment platform
- Polished without being overdesigned, prioritizing clarity, trust, and handoff quality
- Complete on essentials while keeping details easy to trim
- Friendly to AI agents and non-interactive workflows
- Cross-platform by default, built on Node standard library and text templates

## 8. 给 AI Agent 的最短规则 / The Shortest Rule Set for AI Agents

中文：
- 不要带着空占位符公开发布仓库
- 不要保留与项目无关的章节、badge、目录或 workflow
- 不要写“看上去很厉害但其实不存在”的链接和指标
- 优先保证首页 30 秒内能说清楚项目是什么、给谁用、怎么开始
- 如果有运行方式，就必须给出最短可复制命令

English:
- Do not publish a repo with unresolved placeholders
- Do not keep sections, badges, directories, or workflows that are unrelated to the project
- Do not invent links, metrics, or claims that do not actually exist
- Make sure the homepage explains what the project is, who it is for, and how to start within 30 seconds
- If the project can run, always provide the shortest copy-pasteable command path

## 9. 下一步 / Next Step

中文：
优先按这个顺序阅读：
1. [repo-quality-checklist.md](repo-quality-checklist.md)
2. [readme-anatomy.md](readme-anatomy.md)
3. [agent-playbook.md](agent-playbook.md)

English:
Read these in order first:
1. [repo-quality-checklist.md](repo-quality-checklist.md)
2. [readme-anatomy.md](readme-anatomy.md)
3. [agent-playbook.md](agent-playbook.md)

## 10. 参考来源 / Reference Signals

中文：
这套 kit 主要吸收了两类信号：
- GitHub 官方社区健康文件和模板规则
- 一些成熟开源仓库常见的 README 和仓库组织模式，例如 FastAPI、Vite、Playwright 这类项目常见的“价值先行、快速开始、文档入口清楚、社区边界明确”的做法

English:
This kit mainly draws from two kinds of signals:
- GitHub’s official community health and template guidance
- Common README and repo organization patterns found in mature open-source repos, such as the value-first, quickstart-first, docs-visible, and community-boundary patterns seen in projects like FastAPI, Vite, and Playwright

中文：
官方参考：
- [Creating a default community health file](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)
- [About issue and pull request templates](https://docs.github.com/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates)

English:
Official references:
- [Creating a default community health file](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)
- [About issue and pull request templates](https://docs.github.com/communities/using-templates-to-encourage-useful-issues-and-pull-requests/about-issue-and-pull-request-templates)
