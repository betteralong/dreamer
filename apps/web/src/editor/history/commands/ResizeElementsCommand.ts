import type { HistoryCommand, CommandContext } from "../types";

export class ResizeElementsCommand implements HistoryCommand {
  readonly id: string;
  readonly type = "elements.resize";

  constructor(
    private readonly payload: Array<{
      elementId: string;
      from: { x: number; y: number; width: number; height: number };
      to: { x: number; y: number; width: number; height: number };
    }>,
  ) {
    this.id = `resize-elements-${Date.now()}-${Math.random()}`;
  }

  execute(ctx: CommandContext) {
    let changed = false;
    for (const item of this.payload) {
      const ok = ctx.store.updateElementBounds(
        item.elementId,
        item.to.x,
        item.to.y,
        item.to.width,
        item.to.height,
      );
      changed = changed || ok;
    }
    if (changed) {
      ctx.refresh();
    }
  }

  undo(ctx: CommandContext) {
    let changed = false;
    for (const item of this.payload) {
      const ok = ctx.store.updateElementBounds(
        item.elementId,
        item.from.x,
        item.from.y,
        item.from.width,
        item.from.height,
      );
      changed = changed || ok;
    }
    if (changed) {
      ctx.refresh();
    }
  }
}
