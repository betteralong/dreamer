export interface ElementPointerDownPayload {
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
}

export interface StagePointerDownPayload {
  globalX: number;
  globalY: number;
  worldX: number;
  worldY: number;
  isStageTarget: boolean;
  shiftKey: boolean;
  panEnabled: boolean;
}

export interface StagePointerMovePayload {
  globalX: number;
  globalY: number;
  worldX: number;
  worldY: number;
  worldScale: number;
  shiftKey: boolean;
  panEnabled: boolean;
  getElementBounds: () => Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    selectable: boolean;
  }>;
  onElementMove: (payload: { id: string; x: number; y: number }) => void;
  onElementsResize: (payload: {
    items: Array<{ id: string; x: number; y: number; width: number; height: number }>;
  }) => void;
  onCanvasPan: (payload: { dx: number; dy: number }) => void;
}

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface ResizeHandlePointerDownPayload {
  handle: ResizeHandle;
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
}

export function createInteractionController() {
  const LONG_PRESS_MS = 0;
  const DRAG_THRESHOLD_PX = 8;

  let hoveredId: string | null = null;
  const selectedIds = new Set<string>();

  let draggingCanvas = false;
  const draggingElementIds = new Set<string>();
  let dragStartX = 0;
  let dragStartY = 0;
  let panLastX = 0;
  let panLastY = 0;
  const dragStartPositions = new Map<string, { x: number; y: number }>();
  const dragPreview = new Map<string, { x: number; y: number }>();

  let pendingStagePress = false;
  let pressStartedAt = 0;
  let pressStartGlobalX = 0;
  let pressStartGlobalY = 0;
  let pressStartWorldX = 0;
  let pressStartWorldY = 0;
  let pressShiftKey = false;

  let marqueeSelecting = false;
  let marqueeAnchorX = 0;
  let marqueeAnchorY = 0;
  let marqueeCurrentX = 0;
  let marqueeCurrentY = 0;
  let marqueeBaseSelection = new Set<string>();
  let resizeState:
    | {
        handle: ResizeHandle;
        startWorldX: number;
        startWorldY: number;
        startBounds: { x: number; y: number; width: number; height: number };
        items: Array<{ id: string; x: number; y: number; width: number; height: number }>;
      }
    | null = null;
  const resizePreview = new Map<string, { x: number; y: number; width: number; height: number }>();
  const DOUBLE_CLICK_MS = 520;
  const DOUBLE_CLICK_DIST = 18;
  let lastPointerDown:
    | {
        id: string;
        at: number;
        x: number;
        y: number;
      }
    | null = null;

  function cloneSelection() {
    return [...selectedIds];
  }

  function setSelectedIds(nextIds: Iterable<string>) {
    const next = new Set(nextIds);
    if (next.size === selectedIds.size) {
      let same = true;
      for (const id of next) {
        if (!selectedIds.has(id)) {
          same = false;
          break;
        }
      }
      if (same) return false;
    }
    selectedIds.clear();
    for (const id of next) selectedIds.add(id);
    return true;
  }

  function beginDragging(ids: Iterable<string>, globalX: number, globalY: number) {
    draggingElementIds.clear();
    dragStartPositions.clear();
    dragPreview.clear();
    for (const id of ids) {
      draggingElementIds.add(id);
    }
    dragStartX = globalX;
    dragStartY = globalY;
  }

  function clearPendingStagePress() {
    pendingStagePress = false;
    pressStartedAt = 0;
    pressStartGlobalX = 0;
    pressStartGlobalY = 0;
    pressStartWorldX = 0;
    pressStartWorldY = 0;
    pressShiftKey = false;
  }

  function endMarqueeSelection() {
    marqueeSelecting = false;
    marqueeAnchorX = 0;
    marqueeAnchorY = 0;
    marqueeCurrentX = 0;
    marqueeCurrentY = 0;
    marqueeBaseSelection = new Set<string>();
  }

  function getNormalizedMarqueeRect() {
    if (!marqueeSelecting) return null;
    const x = Math.min(marqueeAnchorX, marqueeCurrentX);
    const y = Math.min(marqueeAnchorY, marqueeCurrentY);
    const width = Math.abs(marqueeCurrentX - marqueeAnchorX);
    const height = Math.abs(marqueeCurrentY - marqueeAnchorY);
    return { x, y, width, height };
  }

  function intersects(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

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
    clearPendingStagePress();
    draggingCanvas = false;
    endMarqueeSelection();

    const shouldKeepGroup = !payload.shiftKey && selectedIds.size > 1 && selectedIds.has(payload.id);
    const selectionChanged = shouldKeepGroup
      ? false
      : payload.shiftKey
        ? setSelectedIds(new Set([...selectedIds, payload.id]))
        : setSelectedIds([payload.id]);

    const now = Date.now();
    const isDoubleClick =
      payload.type === "text" &&
      !payload.shiftKey &&
      (payload.clickCount >= 2 ||
        (!!lastPointerDown &&
          lastPointerDown.id === payload.id &&
          now - lastPointerDown.at <= DOUBLE_CLICK_MS &&
          Math.hypot(payload.globalX - lastPointerDown.x, payload.globalY - lastPointerDown.y) <=
            DOUBLE_CLICK_DIST));
    lastPointerDown = {
      id: payload.id,
      at: now,
      x: payload.globalX,
      y: payload.globalY,
    };

    if (isDoubleClick) {
      draggingElementIds.clear();
      dragStartPositions.clear();
      dragPreview.clear();
      return { selectionChanged, startedDragging: false, doubleClicked: true };
    }

    if (!payload.movable || payload.locked) {
      draggingElementIds.clear();
      dragStartPositions.clear();
      dragPreview.clear();
      return { selectionChanged, startedDragging: false, doubleClicked: false };
    }

    const selectedOnPointer = payload.selectedElements.filter(
      (item) => selectedIds.has(item.id) && item.movable && !item.locked,
    );
    const idsToDrag =
      selectedOnPointer.length > 1 && selectedIds.has(payload.id)
        ? selectedOnPointer.map((item) => item.id)
        : [payload.id];
    beginDragging(idsToDrag, payload.globalX, payload.globalY);
    for (const item of payload.selectedElements) {
      if (draggingElementIds.has(item.id)) {
        dragStartPositions.set(item.id, { x: item.startX, y: item.startY });
      }
    }
    if (!dragStartPositions.has(payload.id)) {
      dragStartPositions.set(payload.id, { x: payload.startX, y: payload.startY });
    }

    return { selectionChanged, startedDragging: true, doubleClicked: false };
  }

  function onResizeHandlePointerDown(payload: ResizeHandlePointerDownPayload) {
    clearPendingStagePress();
    draggingCanvas = false;
    endMarqueeSelection();
    draggingElementIds.clear();
    dragStartPositions.clear();
    dragPreview.clear();

    const enabledItems = payload.selectedElements
      .filter((item) => selectedIds.has(item.id) && item.movable && !item.locked)
      .map((item) => ({
        id: item.id,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      }));
    if (enabledItems.length === 0) return false;
    resizeState = {
      handle: payload.handle,
      startWorldX: payload.worldX,
      startWorldY: payload.worldY,
      startBounds: payload.selectionBounds,
      items: enabledItems,
    };
    resizePreview.clear();
    return true;
  }

  function onStagePointerDown(payload: StagePointerDownPayload) {
    if (draggingElementIds.size > 0) return { selectionChanged: false };

    if (payload.panEnabled) {
      clearPendingStagePress();
      endMarqueeSelection();
      draggingCanvas = true;
      panLastX = payload.globalX;
      panLastY = payload.globalY;
      return { selectionChanged: false };
    }
    if (!payload.isStageTarget) return false;

    dragPreview.clear();
    draggingCanvas = false;
    pendingStagePress = true;
    pressStartedAt = Date.now();
    pressStartGlobalX = payload.globalX;
    pressStartGlobalY = payload.globalY;
    pressStartWorldX = payload.worldX;
    pressStartWorldY = payload.worldY;
    pressShiftKey = payload.shiftKey;
    marqueeBaseSelection = new Set(selectedIds);
    return { selectionChanged: false };
  }

  function onStagePointerMove(payload: StagePointerMovePayload) {
    if (resizeState) {
      const dx = payload.worldX - resizeState.startWorldX;
      const dy = payload.worldY - resizeState.startWorldY;
      const MIN_SIZE = 24;

      const startLeft = resizeState.startBounds.x;
      const startTop = resizeState.startBounds.y;
      const startRight = startLeft + resizeState.startBounds.width;
      const startBottom = startTop + resizeState.startBounds.height;

      let nextLeft = startLeft;
      let nextTop = startTop;
      let nextRight = startRight;
      let nextBottom = startBottom;

      if (resizeState.handle.includes("w")) {
        nextLeft = Math.min(startRight - MIN_SIZE, startLeft + dx);
      }
      if (resizeState.handle.includes("e")) {
        nextRight = Math.max(startLeft + MIN_SIZE, startRight + dx);
      }
      if (resizeState.handle.includes("n")) {
        nextTop = Math.min(startBottom - MIN_SIZE, startTop + dy);
      }
      if (resizeState.handle.includes("s")) {
        nextBottom = Math.max(startTop + MIN_SIZE, startBottom + dy);
      }

      const startWidth = Math.max(1, startRight - startLeft);
      const startHeight = Math.max(1, startBottom - startTop);
      const nextWidth = Math.max(MIN_SIZE, nextRight - nextLeft);
      const nextHeight = Math.max(MIN_SIZE, nextBottom - nextTop);
      const scaleX = nextWidth / startWidth;
      const scaleY = nextHeight / startHeight;

      const items: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
      resizePreview.clear();
      for (const item of resizeState.items) {
        const localX = item.x - startLeft;
        const localY = item.y - startTop;
        const nextItem = {
          id: item.id,
          x: nextLeft + localX * scaleX,
          y: nextTop + localY * scaleY,
          width: Math.max(16, item.width * scaleX),
          height: Math.max(16, item.height * scaleY),
        };
        resizePreview.set(item.id, nextItem);
        items.push(nextItem);
      }
      payload.onElementsResize({ items });
      return true;
    }

    if (draggingElementIds.size > 0) {
      const scale = payload.worldScale || 1;
      const worldDx = (payload.globalX - dragStartX) / scale;
      const worldDy = (payload.globalY - dragStartY) / scale;
      for (const id of draggingElementIds) {
        const start = dragStartPositions.get(id);
        if (!start) continue;
        const nextX = start.x + worldDx;
        const nextY = start.y + worldDy;
        dragPreview.set(id, { x: nextX, y: nextY });
        payload.onElementMove({ id, x: nextX, y: nextY });
      }
      return true;
    }

    if (pendingStagePress) {
      const elapsed = Date.now() - pressStartedAt;
      const moved = Math.hypot(
        payload.globalX - pressStartGlobalX,
        payload.globalY - pressStartGlobalY,
      );

      if (!marqueeSelecting && elapsed >= LONG_PRESS_MS) {
        marqueeSelecting = true;
        marqueeAnchorX = pressStartWorldX;
        marqueeAnchorY = pressStartWorldY;
        marqueeCurrentX = payload.worldX;
        marqueeCurrentY = payload.worldY;
      }

      if (marqueeSelecting) {
        marqueeCurrentX = payload.worldX;
        marqueeCurrentY = payload.worldY;
        const marqueeRect = getNormalizedMarqueeRect();
        const hits = new Set<string>();
        if (marqueeRect) {
          for (const item of payload.getElementBounds()) {
            if (!item.selectable) continue;
            if (intersects(marqueeRect, item)) {
              hits.add(item.id);
            }
          }
        }

        const useShift = payload.shiftKey || pressShiftKey;
        const nextSelection = useShift
          ? new Set([...marqueeBaseSelection, ...hits])
          : hits;
        setSelectedIds(nextSelection);
        return true;
      }

      if (moved > DRAG_THRESHOLD_PX) {
        pendingStagePress = false;
        return false;
      }
    }

    if (payload.panEnabled && draggingCanvas) {
      const dx = payload.globalX - panLastX;
      const dy = payload.globalY - panLastY;
      payload.onCanvasPan({ dx, dy });
      panLastX = payload.globalX;
      panLastY = payload.globalY;
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
    const endedPositions = [...draggingElementIds]
      .map((id) => {
        const ended = dragPreview.get(id);
        if (!ended) return null;
        return { id, x: ended.x, y: ended.y };
      })
      .filter((item): item is { id: string; x: number; y: number } => item !== null);
    const wasDraggingElement = draggingElementIds.size > 0;
    const endedResizeItems = [...resizePreview.entries()].map(([id, bounds]) => ({
      id,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    }));
    const wasResizing = resizeState !== null;

    if (pendingStagePress && !marqueeSelecting && !pressShiftKey) {
      setSelectedIds([]);
    }

    clearPendingStagePress();
    endMarqueeSelection();
    draggingElementIds.clear();
    dragStartPositions.clear();
    draggingCanvas = false;
    dragPreview.clear();
    resizeState = null;
    resizePreview.clear();
    return {
      wasDraggingElement,
      endedPositions,
      wasResizing,
      endedResizeItems,
    };
  }

  function getHoveredId() {
    return hoveredId;
  }

  function getSelectedIds() {
    return cloneSelection();
  }

  function setSelection(ids: string[]) {
    return setSelectedIds(ids);
  }

  function getDragPreviewMap() {
    return dragPreview;
  }

  function getMarqueeRect() {
    return getNormalizedMarqueeRect();
  }

  function getIsPanning() {
    return draggingCanvas;
  }

  function clear() {
    hoveredId = null;
    selectedIds.clear();
    clearPendingStagePress();
    endMarqueeSelection();
    draggingCanvas = false;
    draggingElementIds.clear();
    dragStartPositions.clear();
    dragPreview.clear();
    resizeState = null;
    resizePreview.clear();
    lastPointerDown = null;
  }

  return {
    onElementHover,
    onElementOut,
    onElementPointerDown,
    onResizeHandlePointerDown,
    onStagePointerDown,
    onStagePointerMove,
    onStagePointerUp,
    getHoveredId,
    getSelectedIds,
    setSelection,
    getDragPreviewMap,
    getMarqueeRect,
    getIsPanning,
    clear,
  };
}
