import { Assets, Graphics, Sprite, Text, Texture, type Container } from "pixi.js";
import type { EditorElementSnapshot } from "../types";

interface RenderOptions {
  world: Container;
  elements: EditorElementSnapshot[];
  hoveredId: string | null;
  selectedId: string | null;
  dragPreview: Map<string, { x: number; y: number }>;
  onElementOver: (id: string, hoverable: boolean) => void;
  onElementOut: (id: string) => void;
  onElementPointerDown: (payload: {
    id: string;
    movable: boolean;
    locked: boolean;
    globalX: number;
    globalY: number;
    startX: number;
    startY: number;
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
) {
  if (!selected && !hovered) return;
  const border = new Graphics()
    .roundRect(x - 2, y - 2, element.size.width + 4, element.size.height + 4, 10)
    .stroke({
      color: selected ? 0x38bdf8 : 0x93c5fd,
      width: selected ? 2 : 1,
      alpha: selected ? 0.95 : 0.8,
    });
  world.addChild(border);
}

function drawLoadingOverlay(world: Container, node: EditorElementSnapshot, x: number, y: number) {
  if (node.type !== "image") return;
  const opacity = node.style.opacity;
  const width = node.size.width;
  const height = node.size.height;
  const progress = node.state.loading?.progress ?? 12;
  const message = node.state.loading?.message ?? "正在生成中...";

  const card = new Graphics()
    .roundRect(x, y, width, height, 16)
    .fill({ color: 0xeef2ff, alpha: 0.98 * opacity })
    .stroke({ color: 0xffffff, width: 2, alpha: 0.85 * opacity });
  world.addChild(card);

  const halo = new Graphics()
    .roundRect(x + 8, y + 8, width - 16, height - 16, 14)
    .fill({ color: 0xdbeafe, alpha: 0.55 * opacity });
  world.addChild(halo);

  const dotLayer = new Graphics();
  const dotSize = 1.3;
  const spacing = 10;
  for (let px = x + 14; px < x + width - 14; px += spacing) {
    for (let py = y + 14; py < y + height - 46; py += spacing) {
      dotLayer.circle(px, py, dotSize).fill({ color: 0x94a3b8, alpha: 0.28 * opacity });
    }
  }
  world.addChild(dotLayer);

  const percentText = new Text({
    text: `${progress}%`,
    style: {
      fill: "#0f172a",
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
    .fill({ color: 0x94a3b8, alpha: 0.35 * opacity });
  world.addChild(progressTrack);

  const progressFillWidth = ((width - 44) * Math.max(0, Math.min(100, progress))) / 100;
  const progressFill = new Graphics()
    .roundRect(x + 22, y + height - 52, progressFillWidth, 7, 4)
    .fill({ color: 0x0ea5e9, alpha: 0.95 * opacity });
  world.addChild(progressFill);

  const statusText = new Text({
    text: message,
    style: {
      fill: "#334155",
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
    hit.cursor = element.interaction.movable && !element.interaction.locked ? "move" : "pointer";

    hit.on("pointerover", () => {
      options.onElementOver(element.id, element.interaction.hoverable);
    });
    hit.on("pointerout", () => {
      options.onElementOut(element.id);
    });
    hit.on("pointerdown", (event) => {
      event.stopPropagation();
      options.onElementPointerDown({
        id: element.id,
        movable: element.interaction.movable,
        locked: element.interaction.locked,
        globalX: event.global.x,
        globalY: event.global.y,
        startX,
        startY,
      });
    });
  }

  function render(options: RenderOptions) {
    const { world } = options;
    world.removeChildren();

    const axis = new Graphics()
      .moveTo(-5000, 0)
      .lineTo(5000, 0)
      .moveTo(0, -5000)
      .lineTo(0, 5000)
      .stroke({ color: 0x334155, width: 1 });
    world.addChild(axis);

    const sorted = [...options.elements]
      .filter((item) => item.style.visible)
      .sort((a, b) => a.style.zIndex - b.style.zIndex);

    for (const element of sorted) {
      const { x, y } = getElementPosition(element, options.dragPreview);
      const isSelected = options.selectedId === element.id;
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
          isSelected,
          isHovered,
        );
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
          .fill({ color: 0xe2e8f0, alpha: 0.2 })
          .stroke({ color: 0x94a3b8, width: 1, alpha: 0.55 });
        loadingFrame.alpha = element.style.opacity;
        world.addChild(loadingFrame);
      } else if (src && failedTextures.has(src)) {
        const failedFrame = new Graphics()
          .roundRect(x, y, element.size.width, element.size.height, 10)
          .fill({ color: 0xef4444, alpha: 0.08 })
          .stroke({ color: 0xef4444, width: 1, alpha: 0.6 });
        failedFrame.alpha = element.style.opacity;
        world.addChild(failedFrame);

        const failedText = new Text({
          text: "图片加载失败",
          style: {
            fill: "#f87171",
            fontSize: 12,
          },
        });
        failedText.x = x + element.size.width / 2 - failedText.width / 2;
        failedText.y = y + element.size.height / 2 - failedText.height / 2;
        failedText.alpha = element.style.opacity;
        world.addChild(failedText);
      }

      if (element.state.status === "loading") {
        drawLoadingOverlay(world, element, x, y);
      }

      const hit = new Graphics()
        .rect(x, y, element.size.width, element.size.height)
        .fill({ color: 0x000000, alpha: 0.001 });
      bindElementInteractions(hit, element, options, x, y);
      world.addChild(hit);

      drawElementBorder(world, element, x, y, isSelected, isHovered);
    }
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
