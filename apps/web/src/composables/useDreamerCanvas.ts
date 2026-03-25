import type { CanvasDocument } from "../editor/types";
import { useCanvasEditor } from "../editor/useCanvasEditor";
import { useAiCanvasGeneration } from "./useAiCanvasGeneration";

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
      selectedElementId: editor.selectedElementId,
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

  return {
    ...editor,
    ...generation,
    init,
    cleanup,
  };
}
