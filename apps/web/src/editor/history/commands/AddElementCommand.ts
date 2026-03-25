import type { HistoryCommand, CommandContext } from "../types";
import type { EditorElementSnapshot } from "../../types";

export class AddElementCommand implements HistoryCommand {
  readonly id: string;
  readonly type = "element.add";

  constructor(private readonly snapshot: EditorElementSnapshot) {
    this.id = `add-${snapshot.id}-${Date.now()}-${Math.random()}`;
  }

  execute(ctx: CommandContext) {
    const exists = ctx.store.getElementSnapshot(this.snapshot.id);
    if (!exists) {
      ctx.store.addElementSnapshot(this.snapshot);
      ctx.refresh();
    }
  }

  undo(ctx: CommandContext) {
    ctx.store.removeElementById(this.snapshot.id);
    ctx.refresh();
  }
}
