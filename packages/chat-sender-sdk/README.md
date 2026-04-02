# @dreamer/chat-sender-sdk

轻量可复用的 Tiptap Chat Sender SDK，支持结构化 `Part[]` 输入（text/media/input/select）、可编程控制能力、以及 prompt 兼容输出。

## 安装（workspace）

在 `apps/web/package.json` 中声明：

```json
{
  "dependencies": {
    "@dreamer/chat-sender-sdk": "workspace:*"
  }
}
```

## 快速使用

```ts
import { ref } from "vue";
import {
  ChatSenderSdk,
  type ChatSenderInstance,
  type ChatSenderSubmitPayload,
} from "@dreamer/chat-sender-sdk";

const senderRef = ref<ChatSenderInstance | null>(null);

function handleSubmit(payload: ChatSenderSubmitPayload) {
  // payload.parts: 结构化内容
  // payload.promptText: 兼容旧接口的文本
}
```

```vue
<ChatSenderSdk
  ref="senderRef"
  :initial-parts="[]"
  :submitting="false"
  :read-only="false"
  @submit="handleSubmit"
/>
```

## Props

- `initialParts: RawPart[]`  
  初始结构化内容，可通过外部更新触发重绘。
- `submitting: boolean`  
  控制提交按钮 loading 文案与可用性。
- `readOnly: boolean`  
  只读模式；只展示，不允许编辑与提交。
- `placeholder: string`  
  空内容时提示文案。
- `submitText: string`  
  提交按钮文案。
- `submittingText: string`  
  提交中按钮文案。

## Events

- `change(payload: ChatSenderChangePayload)`  
  每次编辑变更触发，包含 `parts` 与 `promptText`。
- `submit(payload: ChatSenderSubmitPayload)`  
  用户点击提交触发，包含 `parts` 与 `promptText`。
- `tokenFocus(payload: ChatSenderTokenEventPayload)`  
  token 获得焦点时触发（input/select）。
- `tokenSelect(payload: ChatSenderTokenEventPayload)`  
  token 被点击/选中时触发（input/select/media）。

## Exposed Methods

通过组件 `ref` 调用：

- `focus()`
- `blur()`
- `setParts(parts: RawPart[])`
- `getParts()`
- `insertText(text: string)`
- `insertPart(part: RawPart)`
- `clear()`
- `submit()`

## 数据与序列化

核心工具导出：

- `normalizeParts(parts)`
- `partsToPromptText(parts)`
- `partsToDoc(parts)`
- `docToParts(doc)`
- `toRuntimePart(part)`

用于在结构化输入与旧的 `prompt` 接口之间做平滑兼容。

## 当前支持范围（MVP）

- 支持 token：`input`、`select`、`media`
- 支持键盘交互：
  - input：Enter/Tab/左右边界出框
  - select：上下/回车/Esc 导航
- 支持下拉面板智能避让（右侧空间不足时右对齐展开）

## 已知限制

- `media` 当前仅支持 URL 展示，未内置上传链路。
- 复杂 token 导航（跨多 token 的高级光标行为）仍有优化空间。
- 提交主链路仍以 `promptText` 兼容后端；`parts` 为前端扩展透传。
