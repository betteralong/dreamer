## 1. Monorepo Foundation

- [x] 1.1 初始化 Monorepo 根结构与包管理配置，创建 `apps`、`packages` 目录并配置 workspace。
- [x] 1.2 配置根级开发脚本，支持独立启动 `web`、`api` 与一键启动全项目基线流程。
- [x] 1.3 创建 `packages/shared` 包基础工程并配置构建/类型导出入口。

## 2. Frontend Web Skeleton (Vue3 + Pixi.js + Tiptap3)

- [x] 2.1 初始化 `apps/web`（Vue 3）并接入基础路由/页面壳层。
- [x] 2.2 搭建 Pixi.js 无限画布容器，提供平移和缩放基础交互。
- [x] 2.3 定义并实现首期画布节点模型，仅支持 `image` 与 `text` 两类节点渲染占位。
- [x] 2.4 集成 Tiptap 3 作为 AI 对话输入区，支持提交提示词事件。
- [x] 2.5 打通“生成结果插入画布”最小流程，支持将图片结果映射为 `image` 节点。

## 3. Backend API Skeleton (NestJS)

- [x] 3.1 初始化 `apps/api` 空 NestJS 项目并保证本地可启动。
- [x] 3.2 增加健康检查接口并提供基础服务可用性响应。
- [x] 3.3 创建 AI 边界模块（controller/service/dto 占位），返回契约一致的占位响应。

## 4. Shared Contracts

- [x] 4.1 在 `packages/shared` 定义 `CanvasNode` 联合类型，覆盖 `image` 与 `text`。
- [x] 4.2 定义 AI 生成请求/响应/状态 DTO，并导出给前后端使用。
- [x] 4.3 在 `apps/web` 与 `apps/api` 中替换重复本地类型，统一引用 shared 契约。

## 5. Validation and Developer Experience

- [x] 5.1 验证前后端与 shared 的类型检查流程，确保契约变更可被双端感知。
- [x] 5.2 验证根级脚本可分别启动 web、api 以及全项目流程。
- [x] 5.3 更新项目 README 的开发指引（启动方式、目录说明、MVP 范围说明）。
