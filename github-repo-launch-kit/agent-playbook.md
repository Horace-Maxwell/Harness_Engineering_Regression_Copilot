# Agent Playbook

日期 Date: 2026-04-09

## 1. 目标 / Goal

中文：
这份 playbook 是给 AI agent 用的。目标是让 agent 在不同电脑、不同仓库、不同项目类型下，都能稳定生成一套看上去成熟、可信、可维护的 GitHub repo 起始结构。

English:
This playbook is for AI agents. Its goal is to help agents generate a mature, trustworthy, and maintainable GitHub repo starter across different machines, repositories, and project types.

## 2. 先收集这些输入 / Collect These Inputs First

中文：
- 项目名
- 一句话价值
- 项目类型：library、app、service、tool、research、docs、monorepo
- 目标用户
- 当前成熟度：experimental、beta、stable、maintenance
- 许可证
- 最短安装命令
- 最短运行命令
- 最短测试命令
- 支持渠道和安全联系方式

English:
- Project name
- One-line value proposition
- Project type: library, app, service, tool, research, docs, or monorepo
- Target user
- Current maturity: experimental, beta, stable, or maintenance
- License
- Shortest install command
- Shortest run command
- Shortest test command
- Support channel and security contact

## 3. 再做这些决策 / Then Make These Decisions

中文：
- 是生成完整 repo，还是只生成 `community-health`
- 是否需要 `CODEOWNERS`
- 是否需要 `GOVERNANCE.md`
- 是否需要 `ROADMAP.md`
- 是否需要 demo、examples、docs 入口

English:
- Whether to generate a full repo or only `community-health`
- Whether `CODEOWNERS` is needed
- Whether `GOVERNANCE.md` is needed
- Whether `ROADMAP.md` is needed
- Whether demo, examples, and docs entry points are needed

## 4. 生成顺序 / Generation Order

中文：
1. 先填元数据
2. 生成模板
3. 用真实内容替换首页关键段落
4. 删掉不适用章节
5. 校验所有链接与命令
6. 校验 CI 和 issue forms
7. 最后再公开发布

English:
1. Fill the metadata
2. Generate the templates
3. Replace the key homepage sections with real project content
4. Delete sections that do not apply
5. Validate all links and commands
6. Validate CI and issue forms
7. Publish only after that

## 5. 不要做的事 / Do Not Do These Things

中文：
- 不要凭空发明 benchmark、兼容性、用户数、stars、下载量
- 不要保留假的 badge
- 不要留下 `TODO`、`TBD`、`your-org`、`your-project` 这类占位符
- 不要把每个项目都包装成“大平台”
- 不要在没有验证命令前写“works on all platforms”

English:
- Do not invent benchmarks, compatibility claims, user counts, stars, or download numbers
- Do not keep fake badges
- Do not leave placeholders like `TODO`, `TBD`, `your-org`, or `your-project`
- Do not frame every project as a “platform”
- Do not claim “works on all platforms” before commands are verified

## 6. 完成标准 / Definition of Done

中文：
- 首页第一屏清楚
- README 命令可运行
- 基础社区文件存在
- 支持与安全入口明确
- 目录结构和项目实际规模一致
- 没有明显模板痕迹

English:
- The first screen of the homepage is clear
- README commands run
- Core community files exist
- Support and security paths are explicit
- The repo structure matches the real project size
- No obvious template residue remains

## 7. 推荐给 Agent 的一句话任务模板 / Recommended One-Line Task Prompt for Agents

中文：
“基于 `project.meta.json` 和这套 repo launch kit，为目标项目生成一个通用但高质量的 GitHub 仓库骨架；保留必要元素，删除不适用部分，保证 README 首屏清楚、命令可复制、社区文件完整、结构不过度设计。”

English:
“Using `project.meta.json` and this repo launch kit, generate a generic but high-quality GitHub repository starter for the target project; keep the essential elements, remove the parts that do not apply, and make sure the first screen of the README is clear, commands are copyable, community files are complete, and the structure is not overdesigned.”
