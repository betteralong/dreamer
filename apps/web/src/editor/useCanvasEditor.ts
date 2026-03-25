import { computed, ref } from "vue";
import type { CanvasDocument } from "./types";
import { EditorDocumentStore } from "./store/EditorDocumentStore";
import { HistoryManager } from "./history/HistoryManager";
import { MoveElementCommand } from "./history/commands/MoveElementCommand";
import { RemoveElementCommand } from "./history/commands/RemoveElementCommand";
import type { HistoryCommand } from "./history/types";

export function useCanvasEditor(initialDocument: CanvasDocument) {
  const documentStore = new EditorDocumentStore(initialDocument);
  const historyManager = new HistoryManager();

  const editorDocument = ref<CanvasDocument>(documentStore.getDocument());
  const elements = ref([...documentStore.getElements()]);
  const elementSnapshots = computed(() => elements.value.map((item) => item.toJSON()));

  const dragStartPositions = new Map<string, { x: number; y: number }>();
  const selectedElementId = ref<string | null>(null);
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

  function handleElementMoveStart(payload: { id: string }) {
    const start = documentStore.getElementPosition(payload.id);
    if (!start) return;
    dragStartPositions.set(payload.id, start);
  }

  function handleElementMoveEnd(payload: { id: string; x: number; y: number }) {
    const start = dragStartPositions.get(payload.id);
    dragStartPositions.delete(payload.id);
    if (!start) return;
    if (start.x === payload.x && start.y === payload.y) return;
    historyManager.pushExecuted(
      new MoveElementCommand({
        elementId: payload.id,
        from: start,
        to: { x: payload.x, y: payload.y },
      }),
    );
    refreshHistoryState();
  }

  function handleElementSelect(payload: { id: string | null }) {
    selectedElementId.value = payload.id;
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
    if (!selectedElementId.value) return;
    executeCommand(new RemoveElementCommand(selectedElementId.value));
    selectedElementId.value = null;
  }

  function isTextInputTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || target.isContentEditable;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (isTextInputTarget(event.target)) return;
    if (event.key === "Backspace" || event.key === "Delete") {
      if (selectedElementId.value) {
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
    selectedElementId.value = null;
  }

  return {
    documentStore,
    editorDocument,
    elements,
    elementSnapshots,
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
    handleElementMoveStart,
    handleElementMoveEnd,
    handleElementSelect,
    handleUndo,
    handleRedo,
    handleRemoveSelected,
    handleKeydown,
    clearSelection,
  };
}
