import type { CommandContext, HistoryCommand } from "../types";
import type { EditorElementSnapshot } from "../../types";

export class RemoveElementCommand implements HistoryCommand {
  readonly id: string;
  readonly type = "element.remove";
  private removedSnapshot: EditorElementSnapshot | null = null;

  constructor(private readonly elementId: string) {
    this.id = `remove-${elementId}-${Date.now()}-${Math.random()}`;
  }

  execute(ctx: CommandContext) {
    this.removedSnapshot = ctx.store.removeElementById(this.elementId);
    if (this.removedSnapshot) {
      ctx.refresh();
    }
  }

  undo(ctx: CommandContext) {
    if (!this.removedSnapshot) return;
    ctx.store.addElementSnapshot(this.removedSnapshot);
    ctx.refresh();
  }
}
