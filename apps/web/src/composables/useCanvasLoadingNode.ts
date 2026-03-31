import { ref, type Ref } from "vue";
import { createImageElement } from "../editor/elements/factory";
import { AddElementCommand } from "../editor/history/commands/AddElementCommand";
import { RemoveElementCommand } from "../editor/history/commands/RemoveElementCommand";
import type { EditorDocumentStore } from "../editor/store/EditorDocumentStore";
import type { HistoryCommand } from "../editor/history/types";

interface Point {
  x: number;
  y: number;
}

interface CanvasEditorAdapter {
  documentStore: EditorDocumentStore;
  selectedElementIds: Ref<string[]>;
  forceSync: () => void;
  executeCommand: (command: HistoryCommand, options?: { recordHistory?: boolean }) => void;
}

interface CanvasViewportAdapter {
  getCanvasCenter: () => Point;
  focusOn: (point: Point, animate?: boolean) => void;
}

interface UseCanvasLoadingNodeOptions {
  syncWelcome: (compact: boolean) => void;
  autoFocusEnabled: Ref<boolean>;
}

export function useCanvasLoadingNode(
  editor: CanvasEditorAdapter,
  viewport: CanvasViewportAdapter,
  options: UseCanvasLoadingNodeOptions,
) {
  const loadingNodeId = ref<string | null>(null);
  let loadingTimer: number | null = null;
  let revealRafId: number | null = null;

  function stopRevealAnimation() {
    if (revealRafId === null) return;
    cancelAnimationFrame(revealRafId);
    revealRafId = null;
  }

  function stopLoading() {
    stopRevealAnimation();
    if (loadingTimer !== null) {
      window.clearInterval(loadingTimer);
      loadingTimer = null;
    }
    if (!loadingNodeId.value) return;
    editor.executeCommand(new RemoveElementCommand(loadingNodeId.value), {
      recordHistory: false,
    });
    if (loadingNodeId.value) {
      editor.selectedElementIds.value = editor.selectedElementIds.value.filter(
        (item) => item !== loadingNodeId.value,
      );
    }
    loadingNodeId.value = null;
  }

  function startLoading(onProgress: (progress: number) => void) {
    stopLoading();
    const center = viewport.getCanvasCenter();
    const width = 260;
    const height = 260;
    const id = `loading-${crypto.randomUUID()}`;
    loadingNodeId.value = id;

    const loadingElement = createImageElement({
      id,
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      src: "",
      opacity: 1,
      zIndex: 100,
    });
    loadingElement.setLoading({
      progress: 12,
      message: "正在生成中...",
    });
    editor.executeCommand(new AddElementCommand(loadingElement.toJSON()), {
      recordHistory: false,
    });
    options.syncWelcome(true);
    onProgress(12);

    loadingTimer = window.setInterval(() => {
      if (!loadingNodeId.value) return;
      const target = editor.documentStore
        .getElements()
        .find((item) => item.id === loadingNodeId.value);
      if (!target || target.type !== "image") return;
      const progress = target.toJSON().state.loading?.progress ?? 12;
      const step = progress < 60 ? 5 : progress < 85 ? 3 : 1;
      const jitter = Math.floor(Math.random() * 2);
      const next = Math.min(95, progress + step + jitter);
      target.setLoading({
        progress: next,
        message: "正在生成中...",
      });
      editor.forceSync();
      onProgress(next);
    }, 280);
  }

  function appendImageNode(id: string, imageUrl: string) {
    const loadingNode =
      loadingNodeId.value === null
        ? null
        : editor.documentStore
            .getElements()
            .find((item) => item.id === loadingNodeId.value && item.type === "image");
    const index = editor.documentStore.getElements().filter((item) => item.type === "image")
      .length;
    const center = viewport.getCanvasCenter();
    const offset = (index % 4) * 18;
    const loadingSnapshot = loadingNode?.toJSON();
    const width = loadingSnapshot?.size.width ?? 260;
    const height = loadingSnapshot?.size.height ?? 260;
    const nodeX = loadingSnapshot ? loadingSnapshot.transform.x : center.x - width / 2 + offset;
    const nodeY = loadingSnapshot ? loadingSnapshot.transform.y : center.y - height / 2 + offset;

    stopRevealAnimation();
    if (loadingTimer !== null) {
      window.clearInterval(loadingTimer);
      loadingTimer = null;
    }

    const imageElement = createImageElement({
      id,
      x: nodeX,
      y: nodeY,
      width,
      height,
      src: imageUrl,
      opacity: loadingNode ? 0 : 1,
      zIndex: 120,
    });
    imageElement.setReady();
    editor.executeCommand(new AddElementCommand(imageElement.toJSON()));

    if (loadingNode) {
      const duration = 320;
      const startAt = performance.now();
      const tick = (now: number) => {
        const loadingCurrent = editor.documentStore
          .getElements()
          .find((item) => item.id === loadingNode.id);
        const imageCurrent = editor.documentStore.getElements().find((item) => item.id === id);
        if (!imageCurrent) {
          revealRafId = null;
          return;
        }
        const progress = Math.min(1, (now - startAt) / duration);
        imageCurrent.setOpacity(progress);
        if (loadingCurrent) {
          loadingCurrent.setOpacity(1 - progress);
        }
        editor.forceSync();

        if (progress < 1) {
          revealRafId = requestAnimationFrame(tick);
          return;
        }

        imageCurrent.setOpacity(1);
        editor.executeCommand(new RemoveElementCommand(loadingNode.id), {
          recordHistory: false,
        });
        if (loadingNodeId.value === loadingNode.id) {
          loadingNodeId.value = null;
        }
        revealRafId = null;
      };
      revealRafId = requestAnimationFrame(tick);
    }

    options.syncWelcome(true);
    if (options.autoFocusEnabled.value) {
      viewport.focusOn(
        {
          x: nodeX + width / 2,
          y: nodeY + height / 2,
        },
        true,
      );
    }
  }

  function cleanup() {
    stopLoading();
    stopRevealAnimation();
  }

  return {
    loadingNodeId,
    startLoading,
    stopLoading,
    appendImageNode,
    cleanup,
  };
}
