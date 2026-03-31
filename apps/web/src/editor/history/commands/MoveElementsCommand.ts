import type { HistoryCommand, CommandContext } from "../types";

export class MoveElementsCommand implements HistoryCommand {
  readonly id: string;
  readonly type = "elements.move";

  constructor(
    private readonly payload: Array<{
      elementId: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
    }>,
  ) {
    this.id = `move-elements-${Date.now()}-${Math.random()}`;
  }

  execute(ctx: CommandContext) {
    let changed = false;
    for (const item of this.payload) {
      const ok = ctx.store.updateElementPosition(item.elementId, item.to.x, item.to.y);
      changed = changed || ok;
    }
    if (changed) {
      ctx.refresh();
    }
  }

  undo(ctx: CommandContext) {
    let changed = false;
    for (const item of this.payload) {
      const ok = ctx.store.updateElementPosition(item.elementId, item.from.x, item.from.y);
      changed = changed || ok;
    }
    if (changed) {
      ctx.refresh();
    }
  }
}
