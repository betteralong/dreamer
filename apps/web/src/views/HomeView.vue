<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import AiChatBox from "../components/AiChatBox.vue";
import CanvasToolbar from "../components/CanvasToolbar.vue";
import InfiniteCanvas from "../components/InfiniteCanvas.vue";
import { useDreamerCanvas } from "../composables/useDreamerCanvas";

const RIGHT_PANEL_WIDTH = 380;
const THEME_STORAGE_KEY = "dreamer-theme";
const TEXT_DEFAULTS_STORAGE_KEY = "dreamer-text-defaults";

type AppTheme = "dark-tech" | "deep-purple" | "matrix-green";

const themeOptions: Array<{ id: AppTheme; label: string }> = [
  { id: "dark-tech", label: "Tech Blue" },
  { id: "deep-purple", label: "Nebula Purple" },
  { id: "matrix-green", label: "Matrix Green" },
];
const currentTheme = ref<AppTheme>("dark-tech");
const pendingEditTextId = ref<string | null>(null);
const pendingSelectElementId = ref<string | null>(null);
const defaultTextFontSize = ref(28);
const defaultTextWidth = ref(260);
const defaultTextHeight = ref(56);

interface Point {
  x: number;
  y: number;
}

interface InfiniteCanvasExposed {
  getViewportCenter: () => Point;
  focusOn: (point: Point, animate?: boolean) => void;
}

const canvasRef = ref<InfiniteCanvasExposed | null>(null);

function getCanvasCenter() {
  return canvasRef.value?.getViewportCenter() ?? { x: 0, y: 0 };
}

function focusCanvas(point: Point, animate = true) {
  canvasRef.value?.focusOn(point, animate);
}

function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function loadTextDefaults() {
  const raw = localStorage.getItem(TEXT_DEFAULTS_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as {
      fontSize?: number;
      width?: number;
      height?: number;
    };
    if (typeof parsed.fontSize === "number") {
      defaultTextFontSize.value = clamp(parsed.fontSize, 12, 96);
    }
    if (typeof parsed.width === "number") {
      defaultTextWidth.value = clamp(parsed.width, 120, 900);
    }
    if (typeof parsed.height === "number") {
      defaultTextHeight.value = clamp(parsed.height, 36, 600);
    }
  } catch {
    // ignore invalid localStorage payloads
  }
}

function persistTextDefaults() {
  localStorage.setItem(
    TEXT_DEFAULTS_STORAGE_KEY,
    JSON.stringify({
      fontSize: defaultTextFontSize.value,
      width: defaultTextWidth.value,
      height: defaultTextHeight.value,
    }),
  );
}

const {
  elementSnapshots,
  selectedElementIds,
  canUndo,
  canRedo,
  historyCounts,
  recentCommands,
  handleElementMove,
  handleElementsMoveStart,
  handleElementsMoveEnd,
  handleElementsResizeStart,
  handleElementsResize,
  handleElementsResizeEnd,
  handleElementSelect,
  handleUndo,
  handleRedo,
  handleRemoveSelected,
  handleKeydown,
  submitting,
  messages,
  autoFocusEnabled,
  handlePromptSubmit,
  addImageToCanvas,
  addUploadedImage,
  addTextElement,
  beginTextEditSession,
  commitTextEdit,
  init,
  cleanup,
} = useDreamerCanvas({
  getCanvasCenter,
  focusOn: focusCanvas,
});

onMounted(async () => {
  await nextTick();
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
  if (storedTheme && themeOptions.some((item) => item.id === storedTheme)) {
    currentTheme.value = storedTheme;
  }
  applyTheme(currentTheme.value);
  loadTextDefaults();
  window.addEventListener("keydown", handleKeydown);
  init();
});

watch(currentTheme, (theme) => {
  applyTheme(theme);
});

watch(
  [defaultTextFontSize, defaultTextWidth, defaultTextHeight],
  () => {
    defaultTextFontSize.value = clamp(defaultTextFontSize.value || 28, 12, 96);
    defaultTextWidth.value = clamp(defaultTextWidth.value || 260, 120, 900);
    defaultTextHeight.value = clamp(defaultTextHeight.value || 56, 36, 600);
    persistTextDefaults();
  },
  { deep: false },
);

async function handleToolbarUploadImage(file: File) {
  try {
    pendingSelectElementId.value = await addUploadedImage(file);
  } catch (error) {
    console.error(error);
  }
}

function handleToolbarAddText() {
  const id = addTextElement({
    fontSize: defaultTextFontSize.value,
    width: defaultTextWidth.value,
    height: defaultTextHeight.value,
  });
  pendingEditTextId.value = id;
  pendingSelectElementId.value = id;
}

function handleTextEditCommit(payload: { id: string; text: string; width?: number; height?: number }) {
  commitTextEdit(payload);
}

function handleTextEditStart(payload: { id: string }) {
  beginTextEditSession(payload.id);
}

function handleEditRequestConsumed(payload: { id: string }) {
  if (pendingEditTextId.value !== payload.id) return;
  pendingEditTextId.value = null;
}

function handleSelectRequestConsumed(payload: { id: string }) {
  if (pendingSelectElementId.value !== payload.id) return;
  pendingSelectElementId.value = null;
}

onBeforeUnmount(() => {
  cleanup();
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <main class="relative h-screen w-screen overflow-hidden bg-app-bg text-app-text">
    <div class="pointer-events-none absolute inset-0 tech-grid-overlay" />
    <section class="absolute inset-0">
      <InfiniteCanvas
        ref="canvasRef"
        :elements="elementSnapshots"
        :request-edit-text-id="pendingEditTextId"
        :request-select-element-id="pendingSelectElementId"
        :safe-right-padding="RIGHT_PANEL_WIDTH"
        @element-move="handleElementMove"
        @elements-move-start="handleElementsMoveStart"
        @elements-move-end="handleElementsMoveEnd"
        @elements-resize-start="handleElementsResizeStart"
        @elements-resize="handleElementsResize"
        @elements-resize-end="handleElementsResizeEnd"
        @element-select="handleElementSelect"
        @text-edit-start="handleTextEditStart"
        @text-edit-commit="handleTextEditCommit"
        @request-edit-text-consumed="handleEditRequestConsumed"
        @request-select-element-consumed="handleSelectRequestConsumed"
      />
    </section>
    <CanvasToolbar
      @upload-image="handleToolbarUploadImage"
      @add-text="handleToolbarAddText"
    />

    <aside
      class="ui-panel tech-sidebar fixed right-3 top-3 z-30 flex h-[calc(100vh-24px)] min-h-0 w-[372px] flex-col p-3"
    >
      <div class="panel-block mb-2 flex items-center justify-between rounded-lg border border-app-border/70 bg-app-bg/40 px-3 py-2">
        <div class="flex items-center gap-2">
          <span
            class="status-dot inline-block h-2 w-2 rounded-full bg-app-accent"
            :class="{ 'run-indicator': submitting }"
          />
          <span class="font-display text-sm tracking-wide text-app-text">Dreamer AI Studio</span>
        </div>
        <span
          class="ui-chip"
          :class="
            submitting
              ? 'border-app-accent/80 bg-app-accent/12 text-app-accent'
              : ''
          "
        >
          {{ submitting ? "RUNNING" : "BETA" }}
        </span>
      </div>
      <div class="ui-card panel-block mb-2 px-3 py-2">
        <div class="ui-section-title mb-1">Session</div>
        <div class="grid grid-cols-3 gap-2">
          <div class="rounded-md border border-app-border/70 bg-app-bg/45 px-2 py-1.5">
            <div class="text-[10px] text-app-text-subtle">消息</div>
            <div class="font-display text-sm text-app-text">{{ messages.length }}</div>
          </div>
          <div class="rounded-md border border-app-border/70 bg-app-bg/45 px-2 py-1.5">
            <div class="text-[10px] text-app-text-subtle">选中</div>
            <div class="font-display text-sm text-app-text">{{ selectedElementIds.length }}</div>
          </div>
          <div class="rounded-md border border-app-border/70 bg-app-bg/45 px-2 py-1.5">
            <div class="text-[10px] text-app-text-subtle">状态</div>
            <div class="font-display text-sm" :class="submitting ? 'text-app-accent' : 'text-app-text-muted'">
              {{ submitting ? "生成中" : "待命" }}
            </div>
          </div>
        </div>
      </div>
      <div class="ui-card panel-block mb-2 px-3 py-2">
        <div class="ui-section-title mb-1">Theme</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="theme in themeOptions"
            :key="theme.id"
            type="button"
            class="ui-chip cursor-pointer transition-colors duration-200"
            :class="
              currentTheme === theme.id
                ? 'border-app-accent/80 bg-app-accent/12 text-app-accent'
                : 'hover:border-app-border-strong'
            "
            @click="currentTheme = theme.id"
          >
            {{ theme.label }}
          </button>
        </div>
      </div>
      <div class="ui-card panel-block mb-2 px-3 py-2">
        <div class="ui-section-title mb-1">文字默认</div>
        <div class="grid grid-cols-3 gap-2">
          <label class="space-y-1">
            <div class="text-[10px] text-app-text-subtle">字号</div>
            <input
              v-model.number="defaultTextFontSize"
              type="number"
              min="12"
              max="96"
              class="w-full rounded border border-app-border/80 bg-app-bg/60 px-1.5 py-1 text-xs text-app-text outline-none focus:border-app-accent"
            />
          </label>
          <label class="space-y-1">
            <div class="text-[10px] text-app-text-subtle">宽度</div>
            <input
              v-model.number="defaultTextWidth"
              type="number"
              min="120"
              max="900"
              class="w-full rounded border border-app-border/80 bg-app-bg/60 px-1.5 py-1 text-xs text-app-text outline-none focus:border-app-accent"
            />
          </label>
          <label class="space-y-1">
            <div class="text-[10px] text-app-text-subtle">高度</div>
            <input
              v-model.number="defaultTextHeight"
              type="number"
              min="36"
              max="600"
              class="w-full rounded border border-app-border/80 bg-app-bg/60 px-1.5 py-1 text-xs text-app-text outline-none focus:border-app-accent"
            />
          </label>
        </div>
      </div>
      <div class="ui-card panel-block mb-2 flex items-center justify-between px-3 py-2">
        <span class="text-xs text-app-text-muted">生成后自动聚焦</span>
        <button
          type="button"
          class="ui-btn-ghost"
          @click="autoFocusEnabled = !autoFocusEnabled"
        >
          {{ autoFocusEnabled ? "已开启" : "已关闭" }}
        </button>
      </div>
      <div class="ui-card panel-block mb-2 flex items-center justify-between px-3 py-2">
        <span class="text-xs text-app-text-muted">
          历史 {{ historyCounts.past }}/{{ historyCounts.future }}
        </span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="ui-btn-ghost"
            :disabled="!canUndo"
            @click="handleUndo"
          >
            撤销
          </button>
          <button
            type="button"
            class="ui-btn-ghost"
            :disabled="!canRedo"
            @click="handleRedo"
          >
            重做
          </button>
          <button
            type="button"
            class="ui-btn-danger"
            :disabled="selectedElementIds.length === 0"
            @click="handleRemoveSelected"
          >
            删除选中{{ selectedElementIds.length > 1 ? `(${selectedElementIds.length})` : "" }}
          </button>
        </div>
      </div>
      <div class="ui-card panel-block mb-2 px-3 py-2 text-[11px] text-app-text-muted">
        <div class="ui-section-title mb-1">最近命令</div>
        <div v-if="recentCommands.length === 0" class="text-app-text-subtle/80">暂无命令</div>
        <div v-else class="space-y-1">
          <div
            v-for="command in recentCommands"
            :key="command.id"
            class="ui-command-item"
          >
            {{ command.type }}
          </div>
        </div>
      </div>
      <AiChatBox
        :messages="messages"
        :submitting="submitting"
        @submit="handlePromptSubmit"
        @add-to-canvas="addImageToCanvas"
      />
    </aside>
  </main>
</template>

<style scoped>
.tech-grid-overlay {
  background-image:
    linear-gradient(color-mix(in srgb, var(--app-border-strong) 16%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--app-border-strong) 16%, transparent) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at 50% 45%, black 0%, transparent 78%);
}

.tech-sidebar {
  animation: sidebar-enter 320ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.panel-block {
  transition: border-color 200ms ease, background-color 200ms ease;
}

.panel-block:hover {
  border-color: color-mix(in srgb, var(--app-border-strong) 96%, transparent);
}

.status-dot {
  box-shadow: 0 0 10px color-mix(in srgb, var(--app-accent) 95%, transparent);
}

.run-indicator {
  animation: run-pulse 1.35s ease-in-out infinite;
}

@keyframes run-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 10px color-mix(in srgb, var(--app-accent) 65%, transparent);
  }
  50% {
    transform: scale(1.18);
    box-shadow: 0 0 18px color-mix(in srgb, var(--app-accent) 100%, transparent);
  }
}

@keyframes sidebar-enter {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
