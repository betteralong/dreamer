import { ImageElement } from "./ImageElement";
import { TextElement } from "./TextElement";
import type {
  EditorElementSnapshot,
  ImageElementSnapshot,
  TextElementSnapshot,
} from "../types";

export type EditorElement = TextElement | ImageElement;

function defaultBase() {
  return {
    transform: {
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    size: {
      width: 120,
      height: 40,
    },
    style: {
      opacity: 1,
      zIndex: 0,
      visible: true,
    },
    interaction: {
      movable: true,
      selectable: true,
      hoverable: true,
      locked: false,
    },
    state: {
      status: "ready" as const,
    },
  };
}

export function createTextElement(input: {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  zIndex?: number;
}): TextElement {
  const base = defaultBase();
  const snapshot: TextElementSnapshot = {
    id: input.id,
    type: "text",
    transform: {
      ...base.transform,
      x: input.x,
      y: input.y,
    },
    size: {
      ...base.size,
    },
    style: {
      ...base.style,
      zIndex: input.zIndex ?? 0,
    },
    interaction: base.interaction,
    state: base.state,
    data: {
      text: input.text,
      fontSize: input.fontSize,
      color: input.color,
    },
  };
  return new TextElement(snapshot);
}

export function createImageElement(input: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  opacity?: number;
  zIndex?: number;
}): ImageElement {
  const base = defaultBase();
  const snapshot: ImageElementSnapshot = {
    id: input.id,
    type: "image",
    transform: {
      ...base.transform,
      x: input.x,
      y: input.y,
    },
    size: {
      width: input.width,
      height: input.height,
    },
    style: {
      ...base.style,
      opacity: input.opacity ?? 1,
      zIndex: input.zIndex ?? 0,
    },
    interaction: base.interaction,
    state: base.state,
    data: {
      src: input.src,
      fit: "cover",
      radius: 10,
    },
  };
  return new ImageElement(snapshot);
}

export function createElementFromSnapshot(snapshot: EditorElementSnapshot): EditorElement {
  if (snapshot.type === "text") {
    return new TextElement(snapshot);
  }
  return new ImageElement(snapshot);
}
