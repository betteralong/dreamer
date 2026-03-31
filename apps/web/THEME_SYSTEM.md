# Dreamer 主题系统规范

本项目当前采用「Token 驱动 + UnoCSS shortcut + 运行时主题切换」方案，目标是让无限画布与 AI 面板在视觉上保持一致，并支持快速换肤。

## 1) 主题切换总览

- 主题入口：`document.documentElement.dataset.theme`
- 当前可用主题：
  - `dark-tech`（默认科技蓝）
  - `deep-purple`（深紫）
  - `matrix-green`（矩阵绿）
- 持久化键：`dreamer-theme`
- 主题切换 UI：`apps/web/src/views/HomeView.vue` 的 `Theme` 区块

## 2) Token 分层

### App 层（面板/文字/按钮）

定义文件：`apps/web/src/style.css`

- 基础色：`--app-bg`, `--app-bg-soft`, `--app-panel`, `--app-panel-soft`
- 边框色：`--app-border`, `--app-border-strong`
- 字体色：`--app-text`, `--app-text-muted`, `--app-text-subtle`
- 语义色：`--app-accent`, `--app-accent-strong`, `--app-accent-soft`, `--app-success`, `--app-danger`
- 背景光晕：`--app-glow-1`, `--app-glow-2`
- 阴影语义：`--app-shadow-panel`, `--app-shadow-card-inset`, `--app-shadow-primary-btn`

### Canvas 层（Pixi 渲染）

定义文件：`apps/web/src/style.css`

- `--canvas-axis`, `--canvas-hover-border`, `--canvas-selection-border`
- `--canvas-handle-fill`, `--canvas-marquee-fill`
- `--canvas-overlay-card`, `--canvas-overlay-halo`, `--canvas-overlay-grid-dot`
- `--canvas-overlay-track`, `--canvas-loading-frame-fill`, `--canvas-loading-frame-border`
- `--canvas-failed-fill`, `--canvas-failed-border`, `--canvas-failed-text`
- `--canvas-overlay-text`, `--canvas-overlay-muted-text`

读取位置：`apps/web/src/editor/canvas/pixiRenderer.ts`

## 3) UnoCSS 映射规则

配置文件：`apps/web/uno.config.ts`

- `theme.colors.app.*` 统一映射到 `var(--app-*)`
- 统一使用 shortcuts，避免页面里重复拼装样式：
  - 面板：`ui-panel`, `ui-card`
  - 按钮：`ui-btn-ghost`, `ui-btn-danger`, `ui-btn-primary`
  - 文案：`ui-section-title`, `ui-chip`, `ui-command-item`

原则：新增组件时优先复用 shortcut，不直接写硬编码颜色。

## 4) 组件接入约定

### Vue 组件（DOM）

1. 优先使用 `bg-app-*`, `text-app-*`, `border-app-*`
2. 局部 `scoped style` 使用 `var(--app-*)`，必要时用 `color-mix(...)`
3. 禁止新增固定主题色（如 `#39c5ff`、`rgb(57 197 255 / ...)`）

### Pixi 渲染

1. 颜色统一从 CSS 变量解析，不在渲染文件写死常量
2. 主题切换后，需保证画布能重新渲染并应用新配色
3. 新增画布视觉元素时，先补 `--canvas-*` token，再使用

## 5) 新增主题流程

1. 在 `style.css` 新增 `:root[data-theme="your-theme"]`
2. 补全全部 `--app-*` 与 `--canvas-*` 变量（不要只补一部分）
3. 在 `HomeView.vue` 的 `themeOptions` 加入新选项
4. 手动验证：
   - 右侧面板/按钮/输入框
   - 聊天气泡与滚动条
   - 画布轴线/选中框/加载态/失败态

## 6) 验收清单

- [ ] `rg` 搜索组件目录无新增硬编码主色（hex/rgb）
- [ ] 主题切换后 DOM 与 Canvas 同步变色
- [ ] `pnpm typecheck` 通过
- [ ] `prefers-reduced-motion` 下动画可降级

## 7) 常见反模式

- 只改 Uno 颜色，不改 Pixi token
- 在组件内直接写固定蓝紫发光阴影
- 新组件绕过 shortcut 导致视觉风格分裂

