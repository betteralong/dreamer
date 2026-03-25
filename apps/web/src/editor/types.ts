export type ElementType = "text" | "image";
export type ElementStatus = "ready" | "loading" | "error" | "disabled";

export interface ElementTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface ElementSize {
  width: number;
  height: number;
}

export interface ElementStyle {
  opacity: number;
  zIndex: number;
  visible: boolean;
}

export interface ElementInteraction {
  movable: boolean;
  selectable: boolean;
  hoverable: boolean;
  locked: boolean;
}

export interface ElementLoadingState {
  progress: number;
  message: string;
  indeterminate?: boolean;
}

export interface ElementErrorState {
  code?: string;
  message: string;
}

export interface ElementState {
  status: ElementStatus;
  loading?: ElementLoadingState;
  error?: ElementErrorState;
}

export interface BaseElementSnapshot<TType extends ElementType, TData> {
  id: string;
  type: TType;
  transform: ElementTransform;
  size: ElementSize;
  style: ElementStyle;
  interaction: ElementInteraction;
  state: ElementState;
  data: TData;
}

export interface TextElementData {
  text: string;
  fontSize: number;
  color: string;
  fontWeight?: string | number;
}

export interface ImageElementData {
  src: string;
  fit?: "cover" | "contain" | "fill";
  radius?: number;
}

export type TextElementSnapshot = BaseElementSnapshot<"text", TextElementData>;
export type ImageElementSnapshot = BaseElementSnapshot<"image", ImageElementData>;
export type EditorElementSnapshot = TextElementSnapshot | ImageElementSnapshot;

export interface CanvasLayout {
  id: string;
  name: string;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  elements: EditorElementSnapshot[];
}

export interface CanvasDocument {
  version: "1.0.0";
  id: string;
  title: string;
  activeLayoutId: string;
  layouts: CanvasLayout[];
}
