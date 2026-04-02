## Context

当前 `apps/web/src/components/AiChatBox.vue` 已使用 Tiptap，但仍将输入内容压扁为纯文本 `prompt` 提交；`apps/web/src/services/mock.ts` 中定义的结构化片段（图片、输入占位、选择占位）无法在输入框中被完整表达与编辑。与此同时，meta 仓库已有较成熟的 `Part` 驱动思路，但当前项目目标是先以最小成本验证体验，不引入其重型依赖与复杂业务耦合。

该变更需要同时覆盖三层：可复用组件层（SDK）、业务接入层（`apps/web`）、协议兼容层（现有后端仍以 `prompt` 为主）。

## Goals / Non-Goals

**Goals:**
- 提供一个可独立安装与复用的 `chat-sender` SDK，主能力由 Tiptap 承载。
- 以 `Part[]` 作为输入态单一数据源，支持 `text/media/input/select` 四类片段在输入框中的编辑与序列化。
- 暴露稳定命令式 API（focus、插入、设置内容、获取内容、提交），支持外部业务控制输入框。
- 在 `apps/web` 中接入 SDK，确保 `mock.ts` 可直接回填并呈现富文本输入效果。
- 保持对现有 `/ai/chat/stream` 的兼容：在后端不改造时可降级为 `prompt` 文本提交。

**Non-Goals:**
- 不复制 meta 项目中的完整能力（如复杂上传链路、提及系统、视频帧高级交互、商业化逻辑）。
- 不在本次变更中强制修改后端请求协议为 `content parts`。
- 不包含 SDK 的对外发布流程自动化（如 CI 发布到 npm）与版本治理策略。

## Decisions

1. **采用 `packages/chat-sender-sdk` 作为独立工作区包**
   - 决策：将编辑器扩展、数据模型、Vue 组件和对外 API 放在 `packages/chat-sender-sdk`，`apps/web` 只做消费与场景配置。
   - 原因：避免 UI/业务逻辑深耦合，便于后续迁移到其他项目或独立发布。
   - 备选：直接在 `apps/web` 内扩展 `AiChatBox`。  
     - 取舍：实现快，但复用性差，后续迁移成本高。

2. **`Part[]` 为主，`prompt` 为兼容输出**
   - 决策：SDK 内以 `Part[]` 驱动渲染与编辑，同时提供 `partsToPromptText()` 序列化器用于向旧接口降级提交。
   - 原因：既满足富文本结构化需求，又不阻塞现有后端。
   - 备选：仅维护富文本 HTML，再在业务层解析。  
     - 取舍：解析不稳定、跨端语义一致性弱、难以回填。

3. **MVP 仅实现四类片段与最小命令集**
   - 决策：首期支持 `text/media/input/select` + `focus/blur/setParts/getParts/insertText/insertPart/clear/submit`。
   - 原因：覆盖截图核心体验与业务联调必需能力，避免一次性过度设计。
   - 备选：一次性对齐 meta 全部能力。  
     - 取舍：周期长、调试成本高、验证反馈慢。

4. **NodeView 负责交互，Core 层负责语义与序列化**
   - 决策：Tiptap Node/NodeView 仅处理输入展示与编辑，`core` 层维护类型、转换和命令协议。
   - 原因：便于测试（core 可单测）、便于后续替换渲染实现（如迁移到其他编辑器）。

## Risks / Trade-offs

- **[Risk] `Part` 与 Tiptap 文档双向同步不一致** → Mitigation：定义单向提交源（以 `Part[]` 为准），并在每次编辑后统一走 `doc -> Part[]` 归一化转换。
- **[Risk] `select/input` 行内组件键盘与光标行为复杂** → Mitigation：MVP 明确最小交互规范（可编辑、可选择、可删除），高级键盘导航后续迭代。
- **[Risk] SDK 抽象过早导致业务定制困难** → Mitigation：将样式与 slot 扩展点作为可注入配置，先保证必要可扩展面。
- **[Risk] 仅文本降级会损失结构信息** → Mitigation：保留 `parts` 的本地态与事件回调，为后续后端协议升级预留通道。

## Migration Plan

1. 新增 `packages/chat-sender-sdk` 并实现 `Part` 类型、序列化器、Tiptap 扩展和对外组件 API。
2. `apps/web` 的 `AiChatBox` 替换为 SDK 组件实例，保留现有消息列表与发送流程。
3. 接入 `apps/web/src/services/mock.ts` 作为初始/回填数据，验证输入框视觉与交互一致性。
4. 提交链路仍走 `prompt`；由 SDK 输出 `partsToPromptText()` 结果传给现有 `streamAiChat`。
5. 若线上/验收反馈良好，再评估将 API 扩展为同时接收结构化 `parts`。

回滚策略：若接入后体验或稳定性不达标，可快速切回原 `AiChatBox` 文本提交路径，不影响后端协议与画布流程。

## Open Questions

- SDK 对外是否默认暴露样式主题能力（CSS variables）还是仅暴露无样式核心组件？
- `media` 片段在 MVP 是否只支持 URL（由业务上传后传入）还是需要内置上传回调接口？
- 后续若引入后端 `parts` 协议，是否要求 `prompt` 与 `parts` 同步传输以便灰度对比？

## Known Gaps After MVP Apply

- 当前 `media` 仅支持已存在 URL 的展示与序列化，未内置上传链路。
- `input/select` 已支持基础内联编辑与选择，但高级键盘导航（跨 token 光标进出）尚未完善。
- 提交链路仍以 `prompt` 为主，`parts` 仅作为前端侧扩展字段透传，后端尚未解析结构化内容。

## MVP Status Notes

- 已完成 SDK 化拆分：`packages/chat-sender-sdk` 可被 `apps/web` 直接消费。
- 已完成 Vue NodeView 路径：`input/select/media` 均基于 Vue 组件而非原生 DOM NodeView。
- 已完成外部控制能力验证：业务侧可通过 `ref` 调用 focus/insert/setParts/readOnly 等方法。
- 已完成事件透出：支持 token focus/select 事件，便于埋点与联动。
