import type { CommandContext, HistoryCommand } from "../types";
import type { EditorElementSnapshot } from "../../types";

export class RemoveElementsCommand implements HistoryCommand {
  readonly id: string;
  readonly type = "elements.remove";
  private removedSnapshots: EditorElementSnapshot[] = [];

  constructor(private readonly elementIds: string[]) {
    this.id = `remove-elements-${Date.now()}-${Math.random()}`;
  }

  execute(ctx: CommandContext) {
    this.removedSnapshots = [];
    for (const id of this.elementIds) {
      const removed = ctx.store.removeElementById(id);
      if (removed) {
        this.removedSnapshots.push(removed);
      }
    }
    if (this.removedSnapshots.length > 0) {
      ctx.refresh();
    }
  }

  undo(ctx: CommandContext) {
    if (this.removedSnapshots.length === 0) return;
    for (const snapshot of this.removedSnapshots) {
      ctx.store.addElementSnapshot(snapshot);
    }
    ctx.refresh();
  }
}
