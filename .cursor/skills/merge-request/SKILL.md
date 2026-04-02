---
name: merge-request
description: 当需要创建、提交、更新 Pull Request 时使用本规则（Git + GitHub CLI）
---

# github pull request

## 特性

- 忽略本地未提交的改动，不要提交或带入本次 PR。
- 如果没有指定目标分支，默认使用 `main`。
- 使用 `git` 与 `gh` 命令行工具（参考 [gh 安装与认证](./references/gh-setup.md)）。
- 对文档未明确给出的 `gh` 子命令、参数或输出格式，必须先查看本机 `--help` 再执行，不得凭经验补全。
- 使用中文描述，内容精简、重点突出，便于高效审查。
- 需要时可使用 Mermaid 图表辅助说明：
  - 先判断问题是否适合图表表达。
  - 图表前后补充文字说明关键点。
  - 复杂场景可拆分多个图表。
  - 不适合图表时可省略，不强制使用。
- 仅基于真实代码变更进行分析，避免过度依赖对话上下文。
- 以下改动默认不纳入重点分析：
  - 同步目标分支带来的变更
  - 图标库改动

## Pull Request Types

- feat: 新特性
- fix: 问题修复
- docs: 文档或注释变更
- refactor: 不改变逻辑的重构
- style: 代码风格与格式调整
- perf: 性能优化
- test: 测试用例新增或调整
- chore: 工具链、配置或工程维护

## 执行步骤

创建行动计划，严格遵循以下步骤：

0. 同步目标分支最新代码，确保差异分析准确。
1. 委派 code-reviewer 助理进行代码审查。
   - **必须在审查结果输出后停止，不得自动执行步骤 2～11**
2. 检查当前分支是否已推送、是否已存在 PR（`gh pr view`）。
3. 对比当前分支与目标分支差异，忽略“同步目标分支”引入的改动。
4. 确定 PR 类型，并生成标题，如 `feat: 增加域名解析能力`。
5. 基于 [PR 模版规范](./references/pr-template.md) 生成 PR 描述，写入临时文件 `tmp/pr_description.md`。
6. 使用 `gh` 创建或更新 PR：
   - 首次创建：`gh pr create --base main --title "标题" --body-file tmp/pr_description.md`
   - 已存在 PR：`gh pr edit --title "标题" --body-file tmp/pr_description.md`
7. 删除本次在 `tmp` 目录下生成的临时文件（不要删除整个目录）。
8. 输出 PR 概要信息：标题、目标分支、访问地址（需可点击）。
