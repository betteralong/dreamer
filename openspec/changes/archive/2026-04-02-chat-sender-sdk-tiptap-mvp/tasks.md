## 1. SDK 包与数据模型搭建

- [x] 1.1 在 `packages/` 下创建 `chat-sender-sdk` 工作区包，并完成 `package.json`、入口文件与基础导出结构
- [x] 1.2 定义 MVP `Part` 类型与运行时字段（`text/media/input/select`），补齐类型守卫与基础工厂函数
- [x] 1.3 实现 `partsToPromptText` 与 `parts` 归一化工具，确保结构化内容可稳定降级为 prompt 文本

## 2. Tiptap 扩展与组件 API

- [x] 2.1 实现 `input/select/media` 的 Tiptap 扩展与 NodeView，支持内联编辑与选择交互
- [x] 2.2 实现 SDK Vue 组件并暴露命令式 API：`focus`、`blur`、`setParts`、`getParts`、`insertText`、`insertPart`、`clear`
- [x] 2.3 实现统一 `submit` 事件，输出结构化 `parts` 与文本兼容 `promptText`

## 3. 业务接入与 mock 验证

- [x] 3.1 将 `apps/web/src/components/AiChatBox.vue` 切换为消费 SDK 组件，保持现有聊天列表和按钮交互
- [x] 3.2 在 `apps/web` 接入 `apps/web/src/services/mock.ts` 的结构化输入回填，验证截图所需的输入效果（输入占位、下拉选择、参考图片段）
- [x] 3.3 调整 `useAiCanvasGeneration` 提交入口，使其消费 SDK 输出并继续调用现有 `streamAiChat({ prompt })`

## 4. 兼容性与验收

- [x] 4.1 增加关键单测/组件测试：`Part` 序列化、`setParts/getParts` 一致性、`submit` 输出一致性
- [x] 4.2 进行端到端手工验收：聚焦能力、程序化插入、结构化回填、发送链路与画布联动均可用
- [x] 4.3 记录已知差距与下一步（如后端结构化协议、上传链路增强、更多 inline 组件）并更新变更说明
