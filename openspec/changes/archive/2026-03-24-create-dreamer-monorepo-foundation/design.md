## Context

当前仓库仅包含 OpenSpec 目录，尚未有前后端应用代码。目标产品《梦想家》需要同时支持无限画布、AI 对话框与 AI 生图能力，但用户已经明确首期范围仅交付 `image + text` 节点能力，后端仅创建空 NestJS 项目并预留边界，不在本阶段实现实际 AI provider 对接逻辑。

该变更是跨模块基础建设：Monorepo 工程组织、前端渲染与编辑器组合、后端骨架与跨端类型契约。若不先形成清晰边界，后续快速迭代会出现目录漂移、接口不稳定与重复建模问题。

## Goals / Non-Goals

**Goals:**
- 建立单仓 Monorepo，统一管理前端、后端和共享模块。
- 形成前端基础架构：Vue 3 宿主应用 + Pixi.js 无限画布容器 + Tiptap 3 AI 对话框容器。
- 创建空 NestJS 服务，包含基础启动结构、健康检查与 AI 生图模块边界占位。
- 在 `packages/shared` 中定义首期跨端契约（节点类型、AI 任务状态、基础 DTO）。
- 明确首期范围只支持 `image` 与 `text` 节点，保证任务拆解可执行。

**Non-Goals:**
- 不实现真实 AI 生图 provider（如 Midjourney、SD、ComfyUI 等）调用逻辑。
- 不实现多人实时协作（presence、CRDT、冲突合并）。
- 不实现复杂画布节点（shape/group/path）及高级编辑器插件体系。
- 不实现生产级鉴权、计费、队列、对象存储流水线。

## Decisions

### Decision 1: 采用 Monorepo + `apps`/`packages` 标准布局
- 方案：使用 `apps/web`、`apps/api`、`packages/shared`。
- 理由：前后端可以独立演进，同时通过 shared 降低 DTO 漂移；也便于未来新增 `packages/ui`、`packages/config` 等模块。
- 备选：
  - 双仓（前后端分离）：初期上手快，但跨端契约同步成本高。
  - 单仓但无 shared：短期简单，长期类型重复和协议分叉风险高。

### Decision 2: 前端以 Pixi.js 负责画布渲染，以 Vue 3 负责壳层与状态编排
- 方案：Pixi 处理高性能画布交互（平移、缩放、节点渲染）；Vue 处理页面结构、工具栏、对话框与业务状态。
- 理由：渲染层与应用层职责分离，性能与可维护性平衡更好。
- 备选：
  - 纯 DOM/CSS 画布：实现门槛低，但大画布与复杂交互性能风险高。
  - 全部逻辑塞入 Pixi：可行但 UI 组织与业务可测性变差。

### Decision 3: Tiptap 3 用作 AI 对话框输入与富文本承载
- 方案：用 Tiptap 作为对话输入区和上下文引用容器，保留后续扩展 slash command/引用块的能力。
- 理由：比自定义 contenteditable 更稳定，插件化扩展能力更强。
- 备选：
  - 纯文本输入框：最快，但难承载后续结构化提示词和引用。
  - 自研富文本：灵活但开发维护成本高。

### Decision 4: 后端先提供“边界而非能力”
- 方案：Nest 仅搭空服务与模块边界（例如 `ai`、`health`），接口可先返回占位响应或未实现标记。
- 理由：满足前后端联调路径与后续接入点，避免在需求未定时过早实现。
- 备选：
  - 同步实现完整 AI 生图后端：超出首期范围，风险与工作量不可控。
  - 后端完全不建：会阻塞后续契约稳定与联调节奏。

### Decision 5: 共享契约先覆盖最小闭环
- 方案：shared 首期仅定义 `CanvasNode(image|text)`、`AiGenerationRequest`、`AiGenerationStatus` 等最小类型。
- 理由：减少过度设计，保证 MVP 快速推进。
- 备选：
  - 一次性定义全量领域模型：初期会增加认知负担且可能频繁推翻。

## Risks / Trade-offs

- [Risk] 前期只支持 `image + text` 可能导致后续节点扩展时模型调整较多  
  → Mitigation: 从第一天采用可扩展的 discriminated union 结构，并在 shared 中集中定义。

- [Risk] Pixi 与 Vue 的状态边界不清导致调试困难  
  → Mitigation: 约定“Pixi 仅渲染与事件回传，业务状态由 Vue/store 持有”。

- [Risk] 后端占位接口与最终真实接口差异过大  
  → Mitigation: 在 shared 中先定义稳定 DTO，后端占位实现必须严格遵守契约形状。

- [Risk] Monorepo 工具链复杂度上升（构建与依赖管理）  
  → Mitigation: 首期只引入最小工具链，统一脚本入口并保持目录命名固定。

## Migration Plan

1. 初始化 Monorepo 根结构与包管理配置，建立 `apps` 与 `packages` 目录。
2. 创建 `apps/web` 前端基础应用，并接入 Pixi 画布容器与 Tiptap 对话框容器。
3. 创建 `apps/api` 空 Nest 服务，提供健康检查与 AI 模块边界。
4. 建立 `packages/shared`，沉淀跨端类型与 DTO。
5. 跑通基础本地开发脚本（前端、后端、共享类型检查）并验证首期范围可迭代。

回滚策略：
- 若任一步骤引发结构性阻塞，可回退到仅保留目录与最小启动脚本的状态，暂停业务接入。

## Open Questions

- Monorepo 编排工具最终选择（pnpm + turbo / pnpm + nx）是否需要在本变更内锁定？
- AI 生图第一批 provider 的接入优先级与鉴权方式是否有既定方向？
- 画布文档持久化首期走本地存储还是直接对接后端草稿接口？
