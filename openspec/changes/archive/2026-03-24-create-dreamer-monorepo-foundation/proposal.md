## Why

《梦想家》需要在一个统一产品中同时承载无限画布创作、AI 对话式交互和 AI 生图能力。当前仓库尚未建立前后端基础工程与跨端契约，先搭建可扩展 Monorepo 骨架可以尽快进入功能迭代并降低后续重构成本。

## What Changes

- 新建 Monorepo 基础结构，包含前端 `apps/web`、后端 `apps/api` 与共享模块 `packages/shared`。
- 前端技术栈明确为 Vue 3 + Pixi.js + Tiptap 3，并建立可支撑无限画布与 AI 对话框的工程入口与模块边界。
- 后端创建空 NestJS 项目（不实现业务），仅建立健康检查与后续 AI 生图能力的模块边界占位。
- 定义前后端共享的数据契约与基础类型，覆盖画布节点（首期仅 `image`、`text`）与 AI 任务状态模型。
- 明确首期范围与非目标：首期仅支持 `image + text` 节点，不包含多人协作、复杂图形节点与完整 AI 任务编排。

## Capabilities

### New Capabilities
- `dreamer-monorepo-foundation`: 建立《梦想家》Monorepo 基础工程、前后端应用骨架与共享包组织规范。
- `canvas-ai-mvp-scope`: 定义首期可交付能力边界，支持无限画布中的 `image` 与 `text` 节点，以及 AI 对话入口与生图集成点。
- `api-ai-boundary-skeleton`: 为 NestJS 后端建立空服务与 AI 生图相关模块边界，支持后续接入真实 provider。

### Modified Capabilities
- 无

## Impact

- Affected code: `apps/web/**`、`apps/api/**`、`packages/shared/**`、Monorepo 根配置文件。
- Affected APIs: 新增后端基础接口（如健康检查）与后续 AI 任务接口占位（契约级定义）。
- Dependencies: 引入前端（Vue 3 / Pixi.js / Tiptap 3）与后端（NestJS）依赖及 Monorepo 工具链。
- Systems: 影响本地开发流程、构建流程、以及后续前后端协作方式（共享类型/契约）。
