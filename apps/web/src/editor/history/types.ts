import type { EditorDocumentStore } from "../store/EditorDocumentStore";

export interface CommandContext {
  store: EditorDocumentStore;
  refresh: () => void;
}

export interface HistoryCommand {
  id: string;
  type: string;
  execute(ctx: CommandContext): void;
  undo(ctx: CommandContext): void;
}
