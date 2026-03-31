import type { CanvasDocument } from "../editor/types";
import { useCanvasEditor } from "../editor/useCanvasEditor";
import { useAiCanvasGeneration } from "./useAiCanvasGeneration";
import { AddElementCommand } from "../editor/history/commands/AddElementCommand";
import { createImageElement, createTextElement } from "../editor/elements/factory";
import { UpdateElementCommand } from "../editor/history/commands/UpdateElementCommand";

interface Point {
  x: number;
  y: number;
}

interface DreamerCanvasViewportAdapter {
  getCanvasCenter: () => Point;
  focusOn: (point: Point, animate?: boolean) => void;
}

export function useDreamerCanvas(viewport: DreamerCanvasViewportAdapter) {
  const initialDocument: CanvasDocument = {
    version: "1.0.0",
    id: "main-doc",
    title: "Dreamer Canvas",
    activeLayoutId: "layout-main",
    layouts: [
      {
        id: "layout-main",
        name: "主画布",
        viewport: { x: 0, y: 0, zoom: 1 },
        elements: [],
      },
    ],
  };

  const editor = useCanvasEditor(initialDocument);
  const generation = useAiCanvasGeneration(
    {
      documentStore: editor.documentStore,
      selectedElementIds: editor.selectedElementIds,
      applySystemUpdate: editor.applySystemUpdate,
      forceSync: editor.forceSync,
      executeCommand: editor.executeCommand,
    },
    viewport,
  );

  function init() {
    editor.refreshHistoryState();
    generation.initWelcome();
  }

  function cleanup() {
    generation.cleanup();
  }

  function getNextZIndex() {
    const snapshots = editor.documentStore.getElementSnapshots();
    if (snapshots.length === 0) return 1;
    return Math.max(...snapshots.map((item) => item.style.zIndex)) + 1;
  }

  function getInsertOrigin(width: number, height: number) {
    const center = viewport.getCanvasCenter();
    return {
      x: center.x - width / 2,
      y: center.y - height / 2,
    };
  }

  function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("无法读取图片数据"));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
  }

  function getImageSize(src: string) {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => reject(new Error("无法解析图片尺寸"));
      img.src = src;
    });
  }

  async function addUploadedImage(file: File) {
    if (!file.type.startsWith("image/")) {
      throw new Error("请选择图片文件");
    }
    const src = await fileToDataUrl(file);
    const size = await getImageSize(src);
    const maxDimension = 520;
    const scale = Math.min(1, maxDimension / Math.max(size.width, size.height));
    const width = Math.max(80, Math.round(size.width * scale));
    const height = Math.max(80, Math.round(size.height * scale));
    const origin = getInsertOrigin(width, height);
    const element = createImageElement({
      id: crypto.randomUUID(),
      x: origin.x,
      y: origin.y,
      width,
      height,
      src,
      zIndex: getNextZIndex(),
    });
    editor.executeCommand(new AddElementCommand(element.toJSON()));
    editor.selectedElementIds.value = [element.id];
    viewport.focusOn({ x: origin.x + width / 2, y: origin.y + height / 2 }, true);
    return element.id;
  }

  function addTextElement(options?: {
    text?: string;
    fontSize?: number;
    width?: number;
    height?: number;
  }) {
    const text = options?.text ?? "双击编辑文本";
    const rawFontSize = options?.fontSize ?? 28;
    const rawWidth = options?.width ?? 260;
    const rawHeight = options?.height ?? 56;
    const fontSize = Math.max(12, Number.isFinite(rawFontSize) ? rawFontSize : 28);
    const width = Math.max(120, Number.isFinite(rawWidth) ? rawWidth : 260);
    const height = Math.max(36, Number.isFinite(rawHeight) ? rawHeight : 56);
    const origin = getInsertOrigin(width, height);
    const appTextColor =
      getComputedStyle(document.documentElement).getPropertyValue("--app-text").trim() || "#eaf1ff";
    const element = createTextElement({
      id: crypto.randomUUID(),
      x: origin.x,
      y: origin.y,
      text,
      fontSize,
      color: appTextColor,
      zIndex: getNextZIndex(),
    });
    const snapshot = element.toJSON();
    snapshot.size.width = width;
    snapshot.size.height = height;
    editor.executeCommand(new AddElementCommand(snapshot));
    editor.selectedElementIds.value = [element.id];
    viewport.focusOn({ x: origin.x + width / 2, y: origin.y + height / 2 }, true);
    return element.id;
  }

  function commitTextEdit(payload: { id: string; text: string; width?: number; height?: number }) {
    const current = editor.documentStore.getElementSnapshot(payload.id);
    if (!current || current.type !== "text") return;
    const nextWidth =
      typeof payload.width === "number" && Number.isFinite(payload.width)
        ? Math.max(80, Math.round(payload.width))
        : current.size.width;
    const nextHeight =
      typeof payload.height === "number" && Number.isFinite(payload.height)
        ? Math.max(24, Math.round(payload.height))
        : current.size.height;
    const unchanged =
      current.data.text === payload.text &&
      current.size.width === nextWidth &&
      current.size.height === nextHeight;
    if (unchanged) return;
    const before = structuredClone(current);
    const after = structuredClone(current);
    after.data.text = payload.text;
    after.size.width = nextWidth;
    after.size.height = nextHeight;
    editor.executeCommand(
      new UpdateElementCommand({
        before,
        after,
      }),
    );
  }

  function beginTextEditSession(id: string) {
    const current = editor.documentStore.getElementSnapshot(id);
    if (!current || current.type !== "text") return;
    editor.selectedElementIds.value = [id];
    const snapshots = editor.documentStore.getElementSnapshots();
    const maxOtherZ = snapshots
      .filter((item) => item.id !== id)
      .reduce((max, item) => Math.max(max, item.style.zIndex), 0);
    const nextZ = maxOtherZ + 1;
    if (current.style.zIndex >= nextZ) return;
    const before = structuredClone(current);
    const after = structuredClone(current);
    after.style.zIndex = nextZ;
    editor.executeCommand(
      new UpdateElementCommand({
        before,
        after,
      }),
      { recordHistory: false },
    );
  }

  return {
    ...editor,
    ...generation,
    addUploadedImage,
    addTextElement,
    beginTextEditSession,
    commitTextEdit,
    init,
    cleanup,
  };
}
