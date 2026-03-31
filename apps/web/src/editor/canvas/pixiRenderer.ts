import { Assets, Graphics, Sprite, Text, Texture, type Container } from "pixi.js";
import type { EditorElementSnapshot } from "../types";

const DEFAULT_CANVAS_COLORS = {
  axis: 0x263b66,
  hoverBorder: 0x74d9ff,
  selectionBorder: 0x39c5ff,
  handleFill: 0xeaf1ff,
  marqueeFill: 0x39c5ff,
  overlayCard: 0x101c36,
  overlayHalo: 0x162448,
  overlayGridDot: 0x39c5ff,
  overlayTrack: 0x263b66,
  loadingFrameFill: 0x162448,
  loadingFrameBorder: 0x3a5d98,
  failedFill: 0xff6e8e,
  failedBorder: 0xff6e8e,
  failedText: "#ff9ab0",
  overlayText: "#eaf1ff",
  overlayMutedText: "#9cb0d8",
} as const;

type CanvasColors = typeof DEFAULT_CANVAS_COLORS;

const CANVAS_CSS_VARS: Record<keyof CanvasColors, string> = {
  axis: "--canvas-axis",
  hoverBorder: "--canvas-hover-border",
  selectionBorder: "--canvas-selection-border",
  handleFill: "--canvas-handle-fill",
  marqueeFill: "--canvas-marquee-fill",
  overlayCard: "--canvas-overlay-card",
  overlayHalo: "--canvas-overlay-halo",
  overlayGridDot: "--canvas-overlay-grid-dot",
  overlayTrack: "--canvas-overlay-track",
  loadingFrameFill: "--canvas-loading-frame-fill",
  loadingFrameBorder: "--canvas-loading-frame-border",
  failedFill: "--canvas-failed-fill",
  failedBorder: "--canvas-failed-border",
  failedText: "--canvas-failed-text",
  overlayText: "--canvas-overlay-text",
  overlayMutedText: "--canvas-overlay-muted-text",
};

let cachedThemeName: string | null = null;
let cachedCanvasColors: CanvasColors = DEFAULT_CANVAS_COLORS;

function parseHexColor(input: string) {
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
  return null;
}

function resolveThemeColors(): CanvasColors {
  if (typeof window === "undefined") return DEFAULT_CANVAS_COLORS;
  const themeName = document.documentElement.getAttribute("data-theme") ?? "dark-tech";
  if (themeName === cachedThemeName) {
    return cachedCanvasColors;
  }
  const styles = getComputedStyle(document.documentElement);
  const nextColors: CanvasColors = { ...DEFAULT_CANVAS_COLORS };
  for (const [key, cssVar] of Object.entries(CANVAS_CSS_VARS) as Array<[keyof CanvasColors, string]>) {
    const raw = styles.getPropertyValue(cssVar);
    if (!raw) continue;
    if (typeof nextColors[key] === "number") {
      const parsed = parseHexColor(raw);
      if (typeof parsed === "number") {
        (nextColors[key] as number) = parsed;
      }
      continue;
    }
    (nextColors[key] as string) = raw.trim();
  }
  cachedThemeName = themeName;
  cachedCanvasColors = nextColors;
  return cachedCanvasColors;
}

interface RenderOptions {
  world: Container;
  elements: EditorElementSnapshot[];
  hoveredId: string | null;
  selectedIds: Set<string>;
  dragPreview: Map<string, { x: number; y: number }>;
  marqueeRect: { x: number; y: number; width: number; height: number } | null;
  panEnabled: boolean;
  onElementOver: (id: string, hoverable: boolean) => void;
  onElementOut: (id: string) => void;
  onElementPointerDown: (payload: {
    id: string;
    type: "text" | "image";
    clickCount: number;
    movable: boolean;
    locked: boolean;
    shiftKey: boolean;
    globalX: number;
    globalY: number;
    startX: number;
    startY: number;
    selectedElements: Array<{
      id: string;
      startX: number;
      startY: number;
      movable: boolean;
      locked: boolean;
    }>;
  }) => void;
  onResizeHandlePointerDown: (payload: {
    handle: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    globalX: number;
    globalY: number;
    worldX: number;
    worldY: number;
    selectionBounds: { x: number; y: number; width: number; height: number };
    selectedElements: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      movable: boolean;
      locked: boolean;
    }>;
  }) => void;
}

function getElementPosition(
  element: EditorElementSnapshot,
  dragPreview: Map<string, { x: number; y: number }>,
) {
  const preview = dragPreview.get(element.id);
  if (preview) return preview;
  return {
    x: element.transform.x,
    y: element.transform.y,
  };
}

function drawElementBorder(
  world: Container,
  element: EditorElementSnapshot,
  x: number,
  y: number,
  selected: boolean,
  hovered: boolean,
  colors: CanvasColors,
) {
  if (!selected && !hovered) return;
  const outlineColor = selected ? colors.selectionBorder : colors.hoverBorder;
  const outlineWidth = selected ? 2 : 1;
  const outlineAlpha = selected ? 0.95 : 0.8;
  const border = new Graphics()
    .roundRect(x - 2, y - 2, element.size.width + 4, element.size.height + 4, 10)
    .stroke({
      color: outlineColor,
      width: outlineWidth,
      alpha: outlineAlpha,
    });
  world.addChild(border);

  if (selected) {
    const glow = new Graphics()
      .roundRect(x - 4, y - 4, element.size.width + 8, element.size.height + 8, 12)
      .stroke({
        color: colors.selectionBorder,
        width: 3,
        alpha: 0.22,
      });
    world.addChild(glow);
  }
}

function drawGroupBorder(
  world: Container,
  selectedBounds: Array<{ x: number; y: number; width: number; height: number }>,
  colors: CanvasColors,
) {
  if (selectedBounds.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const rect of selectedBounds) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  const padding = 0;
  const border = new Graphics()
    .roundRect(
      minX - padding,
      minY - padding,
      maxX - minX + padding * 2,
      maxY - minY + padding * 2,
      10,
    )
    .stroke({
      color: colors.selectionBorder,
      width: 2,
      alpha: 0.95,
    });
  world.addChild(border);
  const glow = new Graphics()
    .roundRect(
      minX - padding - 3,
      minY - padding - 3,
      maxX - minX + padding * 2 + 6,
      maxY - minY + padding * 2 + 6,
      12,
    )
    .stroke({
      color: colors.selectionBorder,
      width: 3,
      alpha: 0.18,
    });
  world.addChild(glow);
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

function drawResizeHandles(
  world: Container,
  options: RenderOptions,
  colors: CanvasColors,
  selectionBounds: { x: number; y: number; width: number; height: number } | null,
  selectedElements: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    movable: boolean;
    locked: boolean;
  }>,
) {
  if (!selectionBounds) return;
  if (options.panEnabled) return;
  if (selectedElements.length === 0) return;
  const { x, y, width, height } = selectionBounds;
  const midX = x + width / 2;
  const midY = y + height / 2;
  const radius = 5;
  const handles: Array<{
    key: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    x: number;
    y: number;
    cursor: string;
  }> = [
    { key: "nw", x, y, cursor: "nwse-resize" },
    { key: "n", x: midX, y, cursor: "ns-resize" },
    { key: "ne", x: x + width, y, cursor: "nesw-resize" },
    { key: "e", x: x + width, y: midY, cursor: "ew-resize" },
    { key: "se", x: x + width, y: y + height, cursor: "nwse-resize" },
    { key: "s", x: midX, y: y + height, cursor: "ns-resize" },
    { key: "sw", x, y: y + height, cursor: "nesw-resize" },
    { key: "w", x, y: midY, cursor: "ew-resize" },
  ];

  for (const handle of handles) {
    const point = new Graphics().circle(handle.x, handle.y, radius).fill(colors.handleFill).stroke({
      color: colors.selectionBorder,
      width: 2,
      alpha: 1,
    });
    point.eventMode = "static";
    point.cursor = handle.cursor;
    point.on("pointerdown", (event) => {
      event.stopPropagation();
      const worldPoint = world.toLocal(event.global);
      options.onResizeHandlePointerDown({
        handle: handle.key,
        globalX: event.global.x,
        globalY: event.global.y,
        worldX: worldPoint.x,
        worldY: worldPoint.y,
        selectionBounds,
        selectedElements,
      });
    });
    world.addChild(point);
  }
}

function drawMarqueeRect(
  world: Container,
  marqueeRect: { x: number; y: number; width: number; height: number } | null,
  colors: CanvasColors,
) {
  if (!marqueeRect) return;
  if (marqueeRect.width <= 0 || marqueeRect.height <= 0) return;
  const box = new Graphics()
    .rect(marqueeRect.x, marqueeRect.y, marqueeRect.width, marqueeRect.height)
    .fill({ color: colors.marqueeFill, alpha: 0.12 })
    .stroke({ color: colors.marqueeFill, width: 1, alpha: 0.9 });
  world.addChild(box);
}

function drawLoadingOverlay(
  world: Container,
  node: EditorElementSnapshot,
  x: number,
  y: number,
  colors: CanvasColors,
) {
  if (node.type !== "image") return;
  const opacity = node.style.opacity;
  const width = node.size.width;
  const height = node.size.height;
  const progress = node.state.loading?.progress ?? 12;
  const message = node.state.loading?.message ?? "正在生成中...";

  const card = new Graphics()
    .roundRect(x, y, width, height, 16)
    .fill({ color: colors.overlayCard, alpha: 0.95 * opacity })
    .stroke({ color: colors.selectionBorder, width: 2, alpha: 0.8 * opacity });
  world.addChild(card);

  const halo = new Graphics()
    .roundRect(x + 8, y + 8, width - 16, height - 16, 14)
    .fill({ color: colors.overlayHalo, alpha: 0.55 * opacity });
  world.addChild(halo);

  const dotLayer = new Graphics();
  const dotSize = 1.3;
  const spacing = 10;
  for (let px = x + 14; px < x + width - 14; px += spacing) {
    for (let py = y + 14; py < y + height - 46; py += spacing) {
      dotLayer
        .circle(px, py, dotSize)
        .fill({ color: colors.overlayGridDot, alpha: 0.22 * opacity });
    }
  }
  world.addChild(dotLayer);

  const percentText = new Text({
    text: `${progress}%`,
    style: {
      fill: colors.overlayText,
      fontSize: 28,
      fontWeight: "700",
    },
  });
  percentText.x = x + width / 2 - percentText.width / 2;
  percentText.y = y + height / 2 - percentText.height / 2 - 8;
  percentText.alpha = opacity;
  world.addChild(percentText);

  const progressTrack = new Graphics()
    .roundRect(x + 22, y + height - 52, width - 44, 7, 4)
    .fill({ color: colors.overlayTrack, alpha: 0.8 * opacity });
  world.addChild(progressTrack);

  const progressFillWidth = ((width - 44) * Math.max(0, Math.min(100, progress))) / 100;
  const progressFill = new Graphics()
    .roundRect(x + 22, y + height - 52, progressFillWidth, 7, 4)
    .fill({ color: colors.selectionBorder, alpha: 0.95 * opacity });
  world.addChild(progressFill);

  const statusText = new Text({
    text: message,
    style: {
      fill: colors.overlayMutedText,
      fontSize: 14,
    },
  });
  statusText.x = x + width / 2 - statusText.width / 2;
  statusText.y = y + height - 34;
  statusText.alpha = opacity;
  world.addChild(statusText);
}

export function createPixiRenderer(invalidate: () => void) {
  const textureCache = new Map<string, Texture>();
  const loadingTextures = new Set<string>();
  const failedTextures = new Set<string>();

  async function ensureTexture(src: string) {
    if (!src || textureCache.has(src) || loadingTextures.has(src) || failedTextures.has(src)) {
      return;
    }
    loadingTextures.add(src);
    try {
      const texture = await Assets.load(src);
      textureCache.set(src, texture);
      invalidate();
    } catch {
      failedTextures.add(src);
      invalidate();
    } finally {
      loadingTextures.delete(src);
    }
  }

  function bindElementInteractions(
    hit: Graphics,
    element: EditorElementSnapshot,
    options: RenderOptions,
    startX: number,
    startY: number,
  ) {
    hit.eventMode = "static";
    hit.cursor = options.panEnabled
      ? "grab"
      : element.interaction.movable && !element.interaction.locked
        ? "move"
        : "pointer";

    hit.on("pointerover", () => {
      if (options.panEnabled) return;
      options.onElementOver(element.id, element.interaction.hoverable);
    });
    hit.on("pointerout", () => {
      if (options.panEnabled) return;
      options.onElementOut(element.id);
    });
    hit.on("pointerdown", (event) => {
      if (options.panEnabled) return;
      event.stopPropagation();
      options.onElementPointerDown({
        id: element.id,
        type: element.type,
        clickCount: event.detail || 1,
        movable: element.interaction.movable,
        locked: element.interaction.locked,
        shiftKey: event.shiftKey,
        globalX: event.global.x,
        globalY: event.global.y,
        startX,
        startY,
        selectedElements: options.elements.map((item) => ({
          id: item.id,
          startX: item.transform.x,
          startY: item.transform.y,
          movable: item.interaction.movable,
          locked: item.interaction.locked,
        })),
      });
    });
  }

  function render(options: RenderOptions) {
    const { world } = options;
    const colors = resolveThemeColors();
    world.removeChildren();

    const axis = new Graphics()
      .moveTo(-5000, 0)
      .lineTo(5000, 0)
      .moveTo(0, -5000)
      .lineTo(0, 5000)
      .stroke({ color: colors.axis, width: 1 });
    world.addChild(axis);

    const sorted = [...options.elements]
      .filter((item) => item.style.visible)
      .sort((a, b) => a.style.zIndex - b.style.zIndex);
    const selectedBounds: Array<{ x: number; y: number; width: number; height: number }> = [];
    const selectedElements: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      movable: boolean;
      locked: boolean;
    }> = [];

    for (const element of sorted) {
      const { x, y } = getElementPosition(element, options.dragPreview);
      const isSelected = options.selectedIds.has(element.id);
      const isHovered = options.hoveredId === element.id;

      if (element.type === "text") {
        const text = new Text({
          text: element.data.text,
          style: {
            fill: element.data.color,
            fontSize: element.data.fontSize,
          },
        });
        text.x = x;
        text.y = y;
        text.alpha = element.style.opacity;
        world.addChild(text);

        const width = Math.max(element.size.width, text.width);
        const height = Math.max(element.size.height, text.height);

        const hit = new Graphics()
          .rect(x, y, width, height)
          .fill({ color: 0x000000, alpha: 0.001 });
        bindElementInteractions(hit, element, options, x, y);
        world.addChild(hit);

        drawElementBorder(
          world,
          {
            ...element,
            size: { width, height },
          },
          x,
          y,
          false,
          isHovered && !isSelected,
          colors,
        );
        if (isSelected) {
          selectedBounds.push({ x, y, width, height });
          selectedElements.push({
            id: element.id,
            x,
            y,
            width,
            height,
            movable: element.interaction.movable,
            locked: element.interaction.locked,
          });
        }
        continue;
      }

      const src = element.data.src;
      const texture = src ? textureCache.get(src) : undefined;

      if (texture) {
        const sprite = new Sprite(texture);
        sprite.x = x;
        sprite.y = y;
        sprite.width = element.size.width;
        sprite.height = element.size.height;
        sprite.alpha = element.style.opacity;
        world.addChild(sprite);
      } else if (src && !failedTextures.has(src)) {
        void ensureTexture(src);
        const loadingFrame = new Graphics()
          .roundRect(x, y, element.size.width, element.size.height, 10)
          .fill({ color: colors.loadingFrameFill, alpha: 0.35 })
          .stroke({ color: colors.loadingFrameBorder, width: 1, alpha: 0.75 });
        loadingFrame.alpha = element.style.opacity;
        world.addChild(loadingFrame);
      } else if (src && failedTextures.has(src)) {
        const failedFrame = new Graphics()
          .roundRect(x, y, element.size.width, element.size.height, 10)
          .fill({ color: colors.failedFill, alpha: 0.12 })
          .stroke({ color: colors.failedBorder, width: 1, alpha: 0.75 });
        failedFrame.alpha = element.style.opacity;
        world.addChild(failedFrame);

        const failedText = new Text({
          text: "图片加载失败",
          style: {
            fill: colors.failedText,
            fontSize: 12,
          },
        });
        failedText.x = x + element.size.width / 2 - failedText.width / 2;
        failedText.y = y + element.size.height / 2 - failedText.height / 2;
        failedText.alpha = element.style.opacity;
        world.addChild(failedText);
      }

      if (element.state.status === "loading") {
        drawLoadingOverlay(world, element, x, y, colors);
      }

      const hit = new Graphics()
        .rect(x, y, element.size.width, element.size.height)
        .fill({ color: 0x000000, alpha: 0.001 });
      bindElementInteractions(hit, element, options, x, y);
      world.addChild(hit);

      drawElementBorder(world, element, x, y, false, isHovered && !isSelected, colors);
      if (isSelected) {
        selectedBounds.push({
          x,
          y,
          width: element.size.width,
          height: element.size.height,
        });
        selectedElements.push({
          id: element.id,
          x,
          y,
          width: element.size.width,
          height: element.size.height,
          movable: element.interaction.movable,
          locked: element.interaction.locked,
        });
      }
    }

    const selectionBounds = drawGroupBorder(world, selectedBounds, colors);
    drawResizeHandles(world, options, colors, selectionBounds, selectedElements);
    drawMarqueeRect(world, options.marqueeRect, colors);
  }

  function clear() {
    textureCache.clear();
    loadingTextures.clear();
    failedTextures.clear();
  }

  return {
    render,
    clear,
  };
}
