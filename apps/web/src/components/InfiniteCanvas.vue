<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Application, Container, Rectangle } from "pixi.js";
import type { EditorElementSnapshot } from "../editor/types";
import { createPixiRenderer } from "../editor/canvas/pixiRenderer";
import { createInteractionController } from "../editor/canvas/interactionController";

const props = defineProps<{
  elements: EditorElementSnapshot[];
  safeRightPadding?: number;
}>();

const emit = defineEmits<{
  (event: "element-move", payload: { id: string; x: number; y: number }): void;
  (event: "element-move-start", payload: { id: string }): void;
  (event: "element-move-end", payload: { id: string; x: number; y: number }): void;
  (event: "element-select", payload: { id: string | null }): void;
}>();

const hostRef = ref<HTMLDivElement | null>(null);
let app: Application | null = null;
let world: Container | null = null;
let viewportWidth = 0;
let viewportHeight = 0;
let focusRafId: number | null = null;

const interaction = createInteractionController();
const renderer = createPixiRenderer(() => {
  renderNodes();
});

function renderNodes() {
  if (!world) return;
  renderer.render({
    world,
    elements: props.elements,
    hoveredId: interaction.getHoveredId(),
    selectedId: interaction.getSelectedId(),
    dragPreview: interaction.getDragPreviewMap(),
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
      interaction.onElementPointerDown(payload);
      emit("element-select", { id: interaction.getSelectedId() });
      if (payload.movable && !payload.locked) {
        emit("element-move-start", { id: payload.id });
      }
      renderNodes();
    },
  });
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

  const pixi = new Application();
  await pixi.init({
    resizeTo: hostRef.value,
    background: 0x0b1020,
    antialias: true,
  });
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

  pixi.stage.eventMode = "static";
  pixi.stage.hitArea = pixi.screen;
  pixi.stage.on("pointerdown", (event) => {
    const changed = interaction.onStagePointerDown({
      globalX: event.global.x,
      globalY: event.global.y,
      isStageTarget: event.target === pixi.stage,
    });
    if (changed) {
      emit("element-select", { id: null });
    }
  });
  pixi.stage.on("pointerup", () => {
    const result = interaction.onStagePointerUp();
    if (result.wasDraggingElement && result.endedElementId && result.endedPosition) {
      emit("element-move-end", {
        id: result.endedElementId,
        x: result.endedPosition.x,
        y: result.endedPosition.y,
      });
    }
    if (result.wasDraggingElement) {
      renderNodes();
    }
  });
  pixi.stage.on("pointerupoutside", () => {
    const result = interaction.onStagePointerUp();
    if (result.wasDraggingElement && result.endedElementId && result.endedPosition) {
      emit("element-move-end", {
        id: result.endedElementId,
        x: result.endedPosition.x,
        y: result.endedPosition.y,
      });
    }
    if (result.wasDraggingElement) {
      renderNodes();
    }
  });
  pixi.stage.on("pointermove", (event) => {
    const changed = interaction.onStagePointerMove({
      globalX: event.global.x,
      globalY: event.global.y,
      worldScale: worldLayer.scale.x || 1,
      onElementMove: (payload) => {
        emit("element-move", payload);
      },
      onCanvasPan: (payload) => {
        worldLayer.x += payload.dx;
        worldLayer.y += payload.dy;
      },
    });
    if (changed) {
      renderNodes();
    }
  });

  hostRef.value.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      const nextScale = Math.max(0.2, Math.min(4, worldLayer.scale.x * factor));
      worldLayer.scale.set(nextScale);
    },
    { passive: false },
  );

  app = pixi;
  world = worldLayer;
  renderNodes();
});

watch(
  () => props.elements,
  () => {
    renderNodes();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  stopFocusAnimation();
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
  <div ref="hostRef" class="canvas-host" />
</template>

<style scoped>
.canvas-host {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
