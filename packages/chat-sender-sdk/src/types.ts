export interface SelectOption {
  label: string;
  value: string;
}

export interface TextPlaceholder {
  type: "text";
  label?: string;
  removable?: boolean;
}

export interface InputPlaceholder {
  type: "input";
  label: string;
  removable?: boolean;
}

export interface SelectPlaceholder {
  type: "select";
  label: string;
  removable?: boolean;
  options: SelectOption[];
}

export interface ImagePlaceholder {
  type: "image";
  label?: string;
  removable?: boolean;
  emphasize?: boolean;
}

export type Placeholder = TextPlaceholder | InputPlaceholder | SelectPlaceholder | ImagePlaceholder;

export interface PartBase {
  $id: string;
  type: "text" | "media";
  extra?: {
    placeholder?: Placeholder;
  };
}

export interface TextPart extends PartBase {
  type: "text";
  content: string;
  value?: string;
}

export interface MediaPart extends PartBase {
  type: "media";
  mime?: string;
  url: string;
  name?: string;
  value?: string;
}

export type Part = TextPart | MediaPart;

export type RawTextPart = Omit<TextPart, "$id"> & Partial<Pick<TextPart, "$id">>;
export type RawMediaPart = Omit<MediaPart, "$id"> & Partial<Pick<MediaPart, "$id">>;
export type RawPart = RawTextPart | RawMediaPart;

export interface ChatSenderSubmitPayload {
  parts: Part[];
  promptText: string;
}

export interface ChatSenderChangePayload {
  parts: Part[];
  promptText: string;
}

export interface ChatSenderTokenEventPayload {
  id: string;
  tokenType: "input" | "select" | "media";
  value?: string;
  label?: string;
}

export interface ChatSenderInstance {
  focus: () => void;
  blur: () => void;
  setParts: (parts: RawPart[]) => void;
  getParts: () => Part[];
  insertText: (text: string) => void;
  insertPart: (part: RawPart) => void;
  clear: () => void;
  submit: () => void;
}
