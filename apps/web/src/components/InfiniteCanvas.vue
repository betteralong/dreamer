<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Application, Container, Rectangle } from "pixi.js";
import type { EditorElementSnapshot } from "../editor/types";
import { createPixiRenderer } from "../editor/canvas/pixiRenderer";
import { createInteractionController } from "../editor/canvas/interactionController";

const props = defineProps<{
  elements: EditorElementSnapshot[];
  safeRightPadding?: number;
  requestEditTextId?: string | null;
  requestSelectElementId?: string | null;
}>();

const emit = defineEmits<{
  (event: "element-move", payload: { id: string; x: number; y: number }): void;
  (event: "elements-move-start", payload: { ids: string[] }): void;
  (event: "elements-move-end", payload: { items: Array<{ id: string; x: number; y: number }> }): void;
  (
    event: "elements-resize",
    payload: { items: Array<{ id: string; x: number; y: number; width: number; height: number }> },
  ): void;
  (event: "elements-resize-start", payload: { ids: string[] }): void;
  (
    event: "elements-resize-end",
    payload: { items: Array<{ id: string; x: number; y: number; width: number; height: number }> },
  ): void;
  (event: "element-select", payload: { ids: string[] }): void;
  (event: "text-edit-start", payload: { id: string }): void;
  (
    event: "text-edit-commit",
    payload: { id: string; text: string; width?: number; height?: number },
  ): void;
  (event: "request-edit-text-consumed", payload: { id: string }): void;
  (event: "request-select-element-consumed", payload: { id: string }): void;
}>();

const hostRef = ref<HTMLDivElement | null>(null);
let app: Application | null = null;
let world: Container | null = null;
let viewportWidth = 0;
let viewportHeight = 0;
let focusRafId: number | null = null;
let themeObserver: MutationObserver | null = null;
const isSpacePressed = ref(false);
const editingTextId = ref<string | null>(null);
const editingTextValue = ref("");
const textEditorRef = ref<HTMLTextAreaElement | null>(null);
const pendingEditRequestId = ref<string | null>(null);
const pendingSelectRequestId = ref<string | null>(null);
let suppressBackdropMouseDownUntil = 0;
const textEditorStyle = ref<Record<string, string>>({
  left: "0px",
  top: "0px",
  width: "120px",
  height: "40px",
  fontSize: "24px",
  color: "var(--app-text)",
});

const interaction = createInteractionController();
const renderer = createPixiRenderer(() => {
  renderNodes();
});

function getTextSnapshotById(id: string) {
  const target = props.elements.find((item) => item.id === id);
  if (!target || target.type !== "text") return null;
  return target;
}

function updateTextEditorLayout() {
  if (!world || !editingTextId.value) return;
  const target = getTextSnapshotById(editingTextId.value);
  if (!target) return;
  const scale = world.scale.x || 1;
  const left = target.transform.x * scale + world.x;
  const top = target.transform.y * scale + world.y - 1;
  const width = Math.max(100, target.size.width * scale);
  const height = Math.max(36, target.size.height * scale);
  textEditorStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    fontSize: `${Math.max(12, target.data.fontSize * scale)}px`,
    color: target.data.color || "var(--app-text)",
  };
  updateTextEditorHeight();
}

function updateTextEditorHeight() {
  const editor = textEditorRef.value;
  if (!editor) return;
  const minHeight = Number.parseFloat(textEditorStyle.value.height ?? "36") || 36;
  const minWidth = Number.parseFloat(textEditorStyle.value.width ?? "100") || 100;
  const hostWidth = hostRef.value?.clientWidth ?? 1200;
  const maxWidth = Math.max(minWidth, Math.min(640, hostWidth - 24));
  editor.style.width = `${minWidth}px`;
  editor.style.height = `${minHeight}px`;
  const contentWidth = Math.max(minWidth, Math.min(maxWidth, editor.scrollWidth + 14));
  editor.style.width = `${contentWidth}px`;
  const contentHeight = Math.max(minHeight, editor.scrollHeight);
  editor.style.height = `${contentHeight}px`;
}

async function beginTextEditing(id: string) {
  const target = getTextSnapshotById(id);
  if (!target) return;
  const changed = interaction.setSelection([id]);
  if (changed) {
    emit("element-select", { ids: interaction.getSelectedIds() });
  }
  emit("text-edit-start", { id });
  editingTextId.value = id;
  editingTextValue.value = target.data.text ?? "";
  suppressBackdropMouseDownUntil = performance.now() + 280;
  updateTextEditorLayout();
  await nextTick();
  requestAnimationFrame(() => {
    textEditorRef.value?.focus();
    textEditorRef.value?.select();
  });
  updateTextEditorHeight();
}

function closeTextEditing() {
  editingTextId.value = null;
  editingTextValue.value = "";
}

function commitTextEditing() {
  if (!editingTextId.value) return;
  const scale = world?.scale.x || 1;
  const editorWidth = textEditorRef.value?.offsetWidth ?? Number.parseFloat(textEditorStyle.value.width ?? "120");
  const editorHeight =
    textEditorRef.value?.offsetHeight ?? Number.parseFloat(textEditorStyle.value.height ?? "40");
  emit("text-edit-commit", {
    id: editingTextId.value,
    text: editingTextValue.value,
    width: Math.max(80, editorWidth / scale),
    height: Math.max(24, editorHeight / scale),
  });
  closeTextEditing();
}

function cancelTextEditing() {
  closeTextEditing();
}

function handleTextEditorBlur() {
  commitTextEditing();
}

function handleTextEditorInput() {
  updateTextEditorHeight();
}

function handleEditingBackdropMouseDown(event: MouseEvent) {
  if (performance.now() < suppressBackdropMouseDownUntil) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  commitTextEditing();
}

function handleTextEditorKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    cancelTextEditing();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    commitTextEditing();
  }
}

function consumePendingCanvasRequests() {
  if (pendingSelectRequestId.value) {
    const id = pendingSelectRequestId.value;
    const exists = props.elements.some((item) => item.id === id);
    if (exists) {
      const changed = interaction.setSelection([id]);
      if (changed) {
        emit("element-select", { ids: interaction.getSelectedIds() });
        renderNodes();
      }
      emit("request-select-element-consumed", { id });
      pendingSelectRequestId.value = null;
    }
  }
  if (pendingEditRequestId.value) {
    const id = pendingEditRequestId.value;
    const exists = getTextSnapshotById(id);
    if (exists) {
      void beginTextEditing(id);
      emit("request-edit-text-consumed", { id });
      pendingEditRequestId.value = null;
    }
  }
}

function parseHexColor(input: string, fallback: number) {
  const value = input.trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1];
    if (raw.length === 3) {
      const expanded = raw
        .split("")
        .map((item) => item + item)
        .join("");
      return Number.parseInt(expanded, 16);
    }
    return Number.parseInt(raw, 16);
  }
  const rgb = value.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    const [r, g, b] = rgb.slice(1, 4).map((num) => Number.parseInt(num, 10));
    return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
  }
  return fallback;
}

function getThemeBackgroundColor() {
  const color = getComputedStyle(document.documentElement).getPropertyValue("--app-bg");
  return parseHexColor(color, 0x060a16);
}

function renderNodes() {
  if (!world) return;
  updateTextEditorLayout();
  renderer.render({
    world,
    elements: props.elements,
    hoveredId: interaction.getHoveredId(),
    selectedIds: new Set(interaction.getSelectedIds()),
    dragPreview: interaction.getDragPreviewMap(),
    marqueeRect: interaction.getMarqueeRect(),
    panEnabled: !editingTextId.value && isSpacePressed.value,
    onElementOver: (id, hoverable) => {
      const changed = interaction.onElementHover(id, hoverable);
      if (changed) {
        renderNodes();
      }
    },
    onElementOut: (id) => {
      const changed = interaction.onElementOut(id);
      if (changed) {
        renderNodes();
      }
    },
    onElementPointerDown: (payload) => {
      const result = interaction.onElementPointerDown(payload);
      if (result.selectionChanged) {
        emit("element-select", { ids: interaction.getSelectedIds() });
      }
      if (result.doubleClicked && payload.type === "text") {
        void beginTextEditing(payload.id);
      }
      if (result.startedDragging) {
        emit("elements-move-start", { ids: interaction.getSelectedIds() });
      }
      renderNodes();
    },
    onResizeHandlePointerDown: (payload) => {
      const changed = interaction.onResizeHandlePointerDown(payload);
      if (!changed) return;
      emit("elements-resize-start", { ids: interaction.getSelectedIds() });
      renderNodes();
    },
  });
}

function updateCursor() {
  if (!hostRef.value) return;
  if (interaction.getIsPanning()) {
    hostRef.value.style.cursor = "grabbing";
    return;
  }
  if (isSpacePressed.value) {
    hostRef.value.style.cursor = "grab";
    return;
  }
  hostRef.value.style.cursor = "";
}

function isTextInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

function getSafeRightPadding() {
  return props.safeRightPadding ?? 0;
}

function getScreenFocusPoint() {
  return {
    x: (viewportWidth - getSafeRightPadding()) / 2,
    y: viewportHeight / 2,
  };
}

function getViewportCenter() {
  if (!world) {
    return {
      x: 0,
      y: 0,
    };
  }
  const focus = getScreenFocusPoint();
  const scale = world.scale.x || 1;
  return {
    x: (focus.x - world.x) / scale,
    y: (focus.y - world.y) / scale,
  };
}

function stopFocusAnimation() {
  if (focusRafId === null) return;
  cancelAnimationFrame(focusRafId);
  focusRafId = null;
}

function focusOn(point: { x: number; y: number }, animate = true) {
  if (!world) return;

  const focus = getScreenFocusPoint();
  const scale = world.scale.x || 1;
  const targetX = focus.x - point.x * scale;
  const targetY = focus.y - point.y * scale;

  stopFocusAnimation();

  if (!animate) {
    world.x = targetX;
    world.y = targetY;
    return;
  }

  const startX = world.x;
  const startY = world.y;
  const duration = 320;
  const startedAt = performance.now();

  const tick = (now: number) => {
    if (!world) {
      stopFocusAnimation();
      return;
    }

    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    world.x = startX + (targetX - startX) * eased;
    world.y = startY + (targetY - startY) * eased;
    updateTextEditorLayout();

    if (progress < 1) {
      focusRafId = requestAnimationFrame(tick);
      return;
    }
    focusRafId = null;
  };

  focusRafId = requestAnimationFrame(tick);
}

onMounted(async () => {
  if (!hostRef.value) return;
  window.addEventListener("keydown", handleWindowKeyDown);
  window.addEventListener("keyup", handleWindowKeyUp);
  window.addEventListener("blur", handleWindowBlur);

  const pixi = new Application();
  await pixi.init({
    resizeTo: hostRef.value,
    backgroundAlpha: 0,
    antialias: true,
  });
  pixi.renderer.background.color = getThemeBackgroundColor();
  hostRef.value.appendChild(pixi.canvas);
  pixi.canvas.style.width = "100%";
  pixi.canvas.style.height = "100%";

  const worldLayer = new Container();
  worldLayer.eventMode = "static";
  worldLayer.hitArea = new Rectangle(-10000, -10000, 20000, 20000);
  pixi.stage.addChild(worldLayer);
  viewportWidth = pixi.screen.width;
  viewportHeight = pixi.screen.height;
  const focus = getScreenFocusPoint();
  worldLayer.x = focus.x;
  worldLayer.y = focus.y;

  pixi.renderer.on("resize", (screenWidth: number, screenHeight: number) => {
    viewportWidth = screenWidth;
    viewportHeight = screenHeight;
  });
  themeObserver = new MutationObserver(() => {
    pixi.renderer.background.color = getThemeBackgroundColor();
    renderNodes();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  pixi.stage.eventMode = "static";
  pixi.stage.hitArea = pixi.screen;
  pixi.stage.on("pointerdown", (event) => {
    if (editingTextId.value) return;
    const worldPoint = worldLayer.toLocal(event.global);
    interaction.onStagePointerDown({
      globalX: event.global.x,
      globalY: event.global.y,
      worldX: worldPoint.x,
      worldY: worldPoint.y,
      isStageTarget: event.target === pixi.stage || event.target === worldLayer,
      shiftKey: event.shiftKey,
      panEnabled: isSpacePressed.value,
    });
    updateCursor();
  });
  pixi.stage.on("pointerup", () => {
    if (editingTextId.value) return;
    const result = interaction.onStagePointerUp();
    if (result.wasDraggingElement && result.endedPositions.length > 0) {
      emit("elements-move-end", {
        items: result.endedPositions,
      });
    }
    if (result.wasResizing && result.endedResizeItems.length > 0) {
      emit("elements-resize-end", {
        items: result.endedResizeItems,
      });
    }
    emit("element-select", { ids: interaction.getSelectedIds() });
    renderNodes();
    updateCursor();
  });
  pixi.stage.on("pointerupoutside", () => {
    if (editingTextId.value) return;
    const result = interaction.onStagePointerUp();
    if (result.wasDraggingElement && result.endedPositions.length > 0) {
      emit("elements-move-end", {
        items: result.endedPositions,
      });
    }
    if (result.wasResizing && result.endedResizeItems.length > 0) {
      emit("elements-resize-end", {
        items: result.endedResizeItems,
      });
    }
    emit("element-select", { ids: interaction.getSelectedIds() });
    renderNodes();
    updateCursor();
  });
  pixi.stage.on("pointermove", (event) => {
    if (editingTextId.value) return;
    const worldPoint = worldLayer.toLocal(event.global);
    const changed = interaction.onStagePointerMove({
      globalX: event.global.x,
      globalY: event.global.y,
      worldX: worldPoint.x,
      worldY: worldPoint.y,
      worldScale: worldLayer.scale.x || 1,
      shiftKey: event.shiftKey,
      panEnabled: isSpacePressed.value,
      getElementBounds: () =>
        props.elements.map((item) => ({
          id: item.id,
          x: item.transform.x,
          y: item.transform.y,
          width: item.size.width,
          height: item.size.height,
          selectable: item.interaction.selectable,
        })),
      onElementMove: (payload) => {
        emit("element-move", payload);
      },
      onElementsResize: (payload) => {
        emit("elements-resize", payload);
      },
      onCanvasPan: (payload) => {
        worldLayer.x += payload.dx;
        worldLayer.y += payload.dy;
      },
    });
    if (changed) {
      renderNodes();
    }
    updateCursor();
  });

  hostRef.value.addEventListener(
    "wheel",
    (event) => {
      if (editingTextId.value) return;
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      const nextScale = Math.max(0.2, Math.min(4, worldLayer.scale.x * factor));
      worldLayer.scale.set(nextScale);
      updateTextEditorLayout();
    },
    { passive: false },
  );

  app = pixi;
  world = worldLayer;
  updateCursor();
  renderNodes();
});

function handleWindowKeyDown(event: KeyboardEvent) {
  if (editingTextId.value) return;
  if (event.code !== "Space") return;
  if (isTextInputTarget(event.target)) return;
  event.preventDefault();
  if (isSpacePressed.value) return;
  isSpacePressed.value = true;
  renderNodes();
  updateCursor();
}

function handleWindowKeyUp(event: KeyboardEvent) {
  if (editingTextId.value) return;
  if (event.code !== "Space") return;
  if (!isSpacePressed.value) return;
  isSpacePressed.value = false;
  renderNodes();
  updateCursor();
}

function handleWindowBlur() {
  if (editingTextId.value) return;
  if (!isSpacePressed.value) return;
  isSpacePressed.value = false;
  renderNodes();
  updateCursor();
}

watch(
  () => props.elements,
  () => {
    if (editingTextId.value && !getTextSnapshotById(editingTextId.value)) {
      closeTextEditing();
    }
    updateTextEditorLayout();
    renderNodes();
    consumePendingCanvasRequests();
  },
  { deep: true },
);

watch(editingTextId, (id) => {
  if (id) {
    isSpacePressed.value = false;
  }
  renderNodes();
  updateCursor();
});

watch(
  () => props.requestEditTextId,
  (id) => {
    if (!id) return;
    pendingEditRequestId.value = id;
    consumePendingCanvasRequests();
  },
);

watch(
  () => props.requestSelectElementId,
  (id) => {
    if (!id) return;
    pendingSelectRequestId.value = id;
    consumePendingCanvasRequests();
  },
);

onBeforeUnmount(() => {
  stopFocusAnimation();
  window.removeEventListener("keydown", handleWindowKeyDown);
  window.removeEventListener("keyup", handleWindowKeyUp);
  window.removeEventListener("blur", handleWindowBlur);
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
  if (!app) return;
  app.destroy(true, { children: true });
  app = null;
  world = null;
  interaction.clear();
  renderer.clear();
});

defineExpose({
  getViewportCenter,
  focusOn,
});
</script>

<template>
  <div ref="hostRef" class="canvas-host">
    <div
      v-if="editingTextId"
      class="text-editor-backdrop"
      @mousedown="handleEditingBackdropMouseDown"
    />
    <textarea
      v-if="editingTextId"
      ref="textEditorRef"
      v-model="editingTextValue"
      class="text-editor-overlay"
      :style="textEditorStyle"
      @blur="handleTextEditorBlur"
      @input="handleTextEditorInput"
      @keydown="handleTextEditorKeydown"
    />
  </div>
</template>

<style scoped>
.canvas-host {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--app-bg);
  transition: background-color 240ms ease;
}

.text-editor-overlay {
  position: absolute;
  z-index: 4;
  resize: none;
  border: 1px solid color-mix(in srgb, var(--app-accent) 72%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--app-panel-soft) 92%, transparent);
  color: var(--app-text);
  padding: 0 3px;
  overflow: hidden;
  line-height: 1.35;
  font-family: inherit;
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--app-accent) 20%, transparent);
}

.text-editor-backdrop {
  position: absolute;
  inset: 0;
  z-index: 3;
}
</style>
