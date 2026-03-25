export interface ElementPointerDownPayload {
  id: string;
  movable: boolean;
  locked: boolean;
  globalX: number;
  globalY: number;
  startX: number;
  startY: number;
}

export interface StagePointerDownPayload {
  globalX: number;
  globalY: number;
  isStageTarget: boolean;
}

export interface StagePointerMovePayload {
  globalX: number;
  globalY: number;
  worldScale: number;
  onElementMove: (payload: { id: string; x: number; y: number }) => void;
  onCanvasPan: (payload: { dx: number; dy: number }) => void;
}

export function createInteractionController() {
  let hoveredId: string | null = null;
  let selectedId: string | null = null;

  let draggingCanvas = false;
  let draggingElementId: string | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let panLastX = 0;
  let panLastY = 0;
  let elementStartX = 0;
  let elementStartY = 0;
  const dragPreview = new Map<string, { x: number; y: number }>();

  function onElementHover(id: string, hoverable: boolean) {
    if (!hoverable) return false;
    if (hoveredId === id) return false;
    hoveredId = id;
    return true;
  }

  function onElementOut(id: string) {
    if (hoveredId !== id) return false;
    hoveredId = null;
    return true;
  }

  function onElementPointerDown(payload: ElementPointerDownPayload) {
    selectedId = payload.id;
    if (!payload.movable || payload.locked) {
      draggingElementId = null;
      return;
    }
    draggingElementId = payload.id;
    dragStartX = payload.globalX;
    dragStartY = payload.globalY;
    elementStartX = payload.startX;
    elementStartY = payload.startY;
  }

  function onStagePointerDown(payload: StagePointerDownPayload) {
    if (draggingElementId) return false;
    if (!payload.isStageTarget) return false;
    selectedId = null;
    draggingCanvas = true;
    panLastX = payload.globalX;
    panLastY = payload.globalY;
    return true;
  }

  function onStagePointerMove(payload: StagePointerMovePayload) {
    if (draggingElementId) {
      const scale = payload.worldScale || 1;
      const worldDx = (payload.globalX - dragStartX) / scale;
      const worldDy = (payload.globalY - dragStartY) / scale;
      const nextX = elementStartX + worldDx;
      const nextY = elementStartY + worldDy;
      dragPreview.set(draggingElementId, { x: nextX, y: nextY });
      payload.onElementMove({ id: draggingElementId, x: nextX, y: nextY });
      return true;
    }

    if (!draggingCanvas) return false;
    const dx = payload.globalX - panLastX;
    const dy = payload.globalY - panLastY;
    payload.onCanvasPan({ dx, dy });
    panLastX = payload.globalX;
    panLastY = payload.globalY;
    return true;
  }

  function onStagePointerUp() {
    const endedElementId = draggingElementId;
    const endedPosition =
      endedElementId === null ? null : (dragPreview.get(endedElementId) ?? null);
    const wasDraggingElement = Boolean(endedElementId);
    draggingElementId = null;
    draggingCanvas = false;
    dragPreview.clear();
    return {
      wasDraggingElement,
      endedElementId,
      endedPosition,
    };
  }

  function getHoveredId() {
    return hoveredId;
  }

  function getSelectedId() {
    return selectedId;
  }

  function getDragPreviewMap() {
    return dragPreview;
  }

  function clear() {
    hoveredId = null;
    selectedId = null;
    draggingCanvas = false;
    draggingElementId = null;
    dragPreview.clear();
  }

  return {
    onElementHover,
    onElementOut,
    onElementPointerDown,
    onStagePointerDown,
    onStagePointerMove,
    onStagePointerUp,
    getHoveredId,
    getSelectedId,
    getDragPreviewMap,
    clear,
  };
}
