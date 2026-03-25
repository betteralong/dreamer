export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text?: string;
  imageUrl?: string;
  imageVisible?: boolean;
  loading?: boolean;
  progress?: number;
  addedToCanvas?: boolean;
}
