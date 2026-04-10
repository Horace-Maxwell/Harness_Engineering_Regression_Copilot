# README Anatomy

日期 Date: 2026-04-09

## 1. 目标 / Goal

中文：
README 的任务不是把所有内容都写完，而是完成三件事：建立信任、帮助判断、降低开始成本。

English:
The README does not need to say everything. Its job is to do three things: build trust, help people decide, and reduce the cost of getting started.

## 2. 推荐顺序 / Recommended Order

中文：
1. 项目名和一句话价值
2. 项目说明与适用人群
3. 快速开始
4. 核心能力或特性亮点
5. 使用示例或最小工作流
6. 项目状态
7. 文档入口与仓库结构
8. 贡献、支持、安全、许可证

English:
1. Project name and one-line value proposition
2. Project overview and target audience
3. Quickstart
4. Core capabilities or highlights
5. Usage examples or the smallest working flow
6. Project status
7. Docs entry points and repo map
8. Contribution, support, security, and license

## 3. 首屏必须回答的问题 / Questions the First Screen Must Answer

中文：
- 这是什么
- 为什么值得关注
- 给谁用
- 现在能不能用
- 我最短怎么跑起来

English:
- What is this
- Why should anyone care
- Who is it for
- Is it ready to use now
- What is the shortest way to run it

## 4. 建议保留的章节 / Sections Usually Worth Keeping

中文：
- `Overview`
- `Why This Exists`
- `Quickstart`
- `Installation`
- `Usage`
- `Highlights`
- `Project Status`
- `Docs`
- `Repo Map`
- `Contributing`
- `Support`
- `Security`
- `License`

English:
- `Overview`
- `Why This Exists`
- `Quickstart`
- `Installation`
- `Usage`
- `Highlights`
- `Project Status`
- `Docs`
- `Repo Map`
- `Contributing`
- `Support`
- `Security`
- `License`

## 5. 什么时候删章节 / When To Remove a Section

中文：
- 没有单独安装步骤时，删掉 `Installation`
- 没有公开 demo 时，不要保留 demo 区块
- 不是开源协作型项目时，可简化 `Contributing`
- 没有 roadmap 时，不要硬写 roadmap
- 只有一个最小脚本时，不需要复杂 architecture 段落

English:
- Remove `Installation` when there is no separate install step
- Do not keep a demo section if there is no public demo
- If the repo is not open to broad collaboration, simplify `Contributing`
- Do not force a roadmap section if none exists
- A tiny script repo does not need a complicated architecture section

## 6. README 的强信号 / High-Signal README Elements

中文：
- 一句话承诺明确
- 例子短而真
- 命令可复制
- 状态透明
- 文档入口清楚
- 维护边界清楚

English:
- The one-line promise is clear
- Examples are short and real
- Commands are copyable
- Status is transparent
- Doc entry points are clear
- Maintenance boundaries are clear

## 7. README 的弱信号 / Low-Signal README Patterns

中文：
- 上来就是大段背景故事
- 一堆 badge 占了第一屏
- 只有概念，没有任何最小示例
- 术语太多，看不出实际用途
- “coming soon” 太多

English:
- Opening with a long background story
- Too many badges dominating the first screen
- Concepts with no minimal example
- Too much jargon and no obvious practical use
- Too many “coming soon” promises

## 8. 给 AI Agent 的 README 生成规则 / README Rules for AI Agents

中文：
- 第一屏不超过三小段
- 第一段必须给出项目定义
- 第二段必须给出目标用户或使用场景
- 第三段优先放 quickstart
- 不要保留空节和样例占位符
- 若命令未验证，不要写成确定语气

English:
- Keep the first screen within three short blocks
- The first paragraph must define the project
- The second paragraph must identify the target user or use case
- The third block should usually be the quickstart
- Do not keep empty sections or sample placeholders
- If a command was not verified, do not present it as certain
