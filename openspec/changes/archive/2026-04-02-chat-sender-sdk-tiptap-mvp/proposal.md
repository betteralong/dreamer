## Why

当前 `apps/web` 的 AI 输入框虽然已经接入 Tiptap，但提交链路仍以纯文本 `prompt` 为中心，无法承载图片占位、内联输入、内联选择等结构化富文本能力。团队希望先在当前仓库验证一套轻量、可复用、可安装的对话输入 SDK，确认体验达到预期后再考虑替换到更大的 meta 项目中，以降低迁移和回归风险。

## What Changes

- 新增一个可独立复用的 Chat Sender SDK（基于 Tiptap），将富文本输入能力从业务页面中解耦。
- 在 SDK 内建立 `Part` 驱动的数据模型，支持文本、媒体、输入占位、选择占位等结构化输入片段。
- 对外提供稳定的实例能力（如 `focus`、`blur`、`setParts`、`getParts`、`insertText`、`insertPart`、`clear`、`submit`），便于其他业务方安装后直接使用。
- 在当前 `apps/web` 中落地 MVP 接入，支持将 `apps/web/src/services/mock.ts` 的结构化数据灌入输入框，并呈现接近目标图示的富文本交互效果。
- 保持与现有后端协议兼容：MVP 阶段仍可编译为纯文本 `prompt` 提交，避免阻塞现有 `ai/chat/stream` 流程。

## Capabilities

### New Capabilities

- `chat-sender-sdk`: 提供一个可安装、可复用的 Tiptap Chat Sender 组件与实例 API，支持基础富文本编辑与外部命令控制。
- `structured-chat-parts`: 定义并驱动结构化 `Part` 输入模型（text/media/input/select），支持 `mock.ts` 等数据源直接映射到输入态与提交态。

### Modified Capabilities

- `api-ai-boundary-skeleton`: 前端请求侧新增“结构化内容可降级为 prompt 文本”的约束与行为，保证旧接口不变时功能可持续演进。

## Impact

- Affected code:
  - `apps/web/src/components/AiChatBox.vue`（改为消费 SDK 组件）
  - `apps/web/src/composables/useAiCanvasGeneration.ts`（提交参数从纯文本拓展为“结构化 + 兼容文本”）
  - `apps/web/src/services/mock.ts`（作为结构化输入的验收样例）
  - 新增 `packages/chat-sender-sdk/*`（SDK 主体）
- API / contract:
  - MVP 阶段不强制修改后端接口；默认继续提交 `prompt`，并保留结构化扩展位。
- Dependencies:
  - 复用现有 Tiptap 依赖；SDK 内新增的扩展保持最小集合，避免把业务侧重依赖耦合进来。
- Systems:
  - 影响 Web 端输入体验与组件复用方式，不影响画布渲染内核与现有 SSE 消息协议。
