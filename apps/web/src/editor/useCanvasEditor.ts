import { computed, ref } from "vue";
import type { CanvasDocument } from "./types";
import { EditorDocumentStore } from "./store/EditorDocumentStore";
import { HistoryManager } from "./history/HistoryManager";
import { MoveElementsCommand } from "./history/commands/MoveElementsCommand";
import { RemoveElementsCommand } from "./history/commands/RemoveElementsCommand";
import { ResizeElementsCommand } from "./history/commands/ResizeElementsCommand";
import type { HistoryCommand } from "./history/types";

export function useCanvasEditor(initialDocument: CanvasDocument) {
  const documentStore = new EditorDocumentStore(initialDocument);
  const historyManager = new HistoryManager();

  const editorDocument = ref<CanvasDocument>(documentStore.getDocument());
  const elements = ref([...documentStore.getElements()]);
  const elementSnapshots = computed(() => elements.value.map((item) => item.toJSON()));

  const dragStartPositions = new Map<string, { x: number; y: number }>();
  const resizeStartBounds = new Map<string, { x: number; y: number; width: number; height: number }>();
  const selectedElementIds = ref<string[]>([]);
  const selectedElementId = computed(() => selectedElementIds.value[0] ?? null);
  const canUndo = ref(false);
  const canRedo = ref(false);
  const historyCounts = ref({ past: 0, future: 0 });
  const recentCommands = ref<Array<{ id: string; type: string }>>([]);

  function notifyElementsChanged() {
    documentStore.syncActiveLayoutElements();
    elements.value = [...documentStore.getElements()];
    editorDocument.value = documentStore.getDocument();
  }

  function forceSync() {
    notifyElementsChanged();
  }

  function applySystemUpdate(action: () => void) {
    action();
    notifyElementsChanged();
  }

  function refreshHistoryState() {
    canUndo.value = historyManager.canUndo();
    canRedo.value = historyManager.canRedo();
    historyCounts.value = {
      past: historyManager.getPastCount(),
      future: historyManager.getFutureCount(),
    };
    recentCommands.value = historyManager.getRecentCommands(6);
  }

  function executeCommand(command: HistoryCommand, options?: { recordHistory?: boolean }) {
    const context = {
      store: documentStore,
      refresh: notifyElementsChanged,
    };
    if (options?.recordHistory === false) {
      command.execute(context);
    } else {
      historyManager.execute(command, context);
    }
    refreshHistoryState();
  }

  function handleElementMove(payload: { id: string; x: number; y: number }) {
    documentStore.updateElementPosition(payload.id, payload.x, payload.y);
    notifyElementsChanged();
  }

  function handleElementsMoveStart(payload: { ids: string[] }) {
    dragStartPositions.clear();
    for (const id of payload.ids) {
      const start = documentStore.getElementPosition(id);
      if (!start) continue;
      dragStartPositions.set(id, start);
    }
  }

  function handleElementsMoveEnd(payload: { items: Array<{ id: string; x: number; y: number }> }) {
    const moves = payload.items
      .map((item) => {
        const start = dragStartPositions.get(item.id);
        if (!start) return null;
        if (start.x === item.x && start.y === item.y) return null;
        return {
          elementId: item.id,
          from: start,
          to: { x: item.x, y: item.y },
        };
      })
      .filter(
        (item): item is { elementId: string; from: { x: number; y: number }; to: { x: number; y: number } } =>
          item !== null,
      );
    dragStartPositions.clear();
    if (moves.length === 0) return;
    historyManager.pushExecuted(new MoveElementsCommand(moves));
    refreshHistoryState();
  }

  function handleElementsResizeStart(payload: { ids: string[] }) {
    resizeStartBounds.clear();
    for (const id of payload.ids) {
      const start = documentStore.getElementBounds(id);
      if (!start) continue;
      resizeStartBounds.set(id, start);
    }
  }

  function handleElementsResize(payload: {
    items: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  }) {
    for (const item of payload.items) {
      documentStore.updateElementBounds(item.id, item.x, item.y, item.width, item.height);
    }
    notifyElementsChanged();
  }

  function handleElementsResizeEnd(payload: {
    items: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  }) {
    const changes = payload.items
      .map((item) => {
        const from = resizeStartBounds.get(item.id);
        if (!from) return null;
        const unchanged =
          from.x === item.x &&
          from.y === item.y &&
          from.width === item.width &&
          from.height === item.height;
        if (unchanged) return null;
        return {
          elementId: item.id,
          from,
          to: { x: item.x, y: item.y, width: item.width, height: item.height },
        };
      })
      .filter(
        (
          item,
        ): item is {
          elementId: string;
          from: { x: number; y: number; width: number; height: number };
          to: { x: number; y: number; width: number; height: number };
        } => item !== null,
      );
    resizeStartBounds.clear();
    if (changes.length === 0) return;
    historyManager.pushExecuted(new ResizeElementsCommand(changes));
    refreshHistoryState();
  }

  function handleElementSelect(payload: { ids: string[] }) {
    selectedElementIds.value = [...payload.ids];
  }

  function handleUndo() {
    const context = {
      store: documentStore,
      refresh: notifyElementsChanged,
    };
    historyManager.undo(context);
    refreshHistoryState();
  }

  function handleRedo() {
    const context = {
      store: documentStore,
      refresh: notifyElementsChanged,
    };
    historyManager.redo(context);
    refreshHistoryState();
  }

  function handleRemoveSelected() {
    if (selectedElementIds.value.length === 0) return;
    executeCommand(new RemoveElementsCommand(selectedElementIds.value));
    selectedElementIds.value = [];
  }

  function isTextInputTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || target.isContentEditable;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (isTextInputTarget(event.target)) return;
    if (event.key === "Backspace" || event.key === "Delete") {
      if (selectedElementIds.value.length > 0) {
        event.preventDefault();
        handleRemoveSelected();
      }
      return;
    }

    const meta = event.metaKey || event.ctrlKey;
    if (!meta) return;
    if (event.key.toLowerCase() !== "z") return;
    event.preventDefault();

    const context = {
      store: documentStore,
      refresh: notifyElementsChanged,
    };
    if (event.shiftKey) {
      historyManager.redo(context);
      refreshHistoryState();
      return;
    }
    historyManager.undo(context);
    refreshHistoryState();
  }

  function clearSelection() {
    selectedElementIds.value = [];
  }

  return {
    documentStore,
    editorDocument,
    elements,
    elementSnapshots,
    selectedElementIds,
    selectedElementId,
    canUndo,
    canRedo,
    historyCounts,
    recentCommands,
    notifyElementsChanged,
    forceSync,
    applySystemUpdate,
    refreshHistoryState,
    executeCommand,
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
    clearSelection,
  };
}
