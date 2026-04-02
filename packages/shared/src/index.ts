export type CanvasNode = CanvasImageNode | CanvasTextNode | CanvasLoadingNode;

export interface CanvasNodeBase {
  id: string;
  kind: "image" | "text" | "loading";
  x: number;
  y: number;
}

export interface CanvasImageNode extends CanvasNodeBase {
  kind: "image";
  src: string;
  width: number;
  height: number;
  opacity?: number;
}

export interface CanvasTextNode extends CanvasNodeBase {
  kind: "text";
  text: string;
  fontSize: number;
  color: string;
}

export interface CanvasLoadingNode extends CanvasNodeBase {
  kind: "loading";
  width: number;
  height: number;
  progress: number;
  message: string;
  opacity?: number;
}

export interface AiGenerationRequest {
  prompt: string;
  sessionId?: string;
  parts?: Array<{
    $id?: string;
    type: "text" | "media";
    content?: string;
    value?: string;
    mime?: string;
    url?: string;
    name?: string;
    extra?: {
      placeholder?: {
        type: "text" | "input" | "select" | "image";
        label?: string;
        removable?: boolean;
        emphasize?: boolean;
        options?: Array<{ label: string; value: string }>;
      };
    };
  }>;
}

export type AiGenerationStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "not_implemented";

export interface AiGenerationResponse {
  id: string;
  status: AiGenerationStatus;
  imageUrl?: string;
  message?: string;
}

export interface AiThinkingStreamEvent {
  type: "thinking";
  content: string;
}

export interface AiImageStreamEvent {
  type: "image";
  id: string;
  imageUrl: string;
  content?: string;
}

export interface AiDoneStreamEvent {
  type: "done";
}

export interface AiErrorStreamEvent {
  type: "error";
  content: string;
}

export type AiChatStreamEvent =
  | AiThinkingStreamEvent
  | AiImageStreamEvent
  | AiDoneStreamEvent
  | AiErrorStreamEvent;
