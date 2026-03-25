import type { CommandContext, HistoryCommand } from "../types";
import type { EditorElementSnapshot } from "../../types";

export class UpdateElementCommand implements HistoryCommand {
  readonly id: string;
  readonly type = "element.update";

  constructor(
    private readonly payload: {
      before: EditorElementSnapshot;
      after: EditorElementSnapshot;
    },
  ) {
    this.id = `update-${payload.after.id}-${Date.now()}-${Math.random()}`;
  }

  execute(ctx: CommandContext) {
    const ok = ctx.store.replaceElementSnapshot(this.payload.after);
    if (ok) {
      ctx.refresh();
    }
  }

  undo(ctx: CommandContext) {
    const ok = ctx.store.replaceElementSnapshot(this.payload.before);
    if (ok) {
      ctx.refresh();
    }
  }
}
