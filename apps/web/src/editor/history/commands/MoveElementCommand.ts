import type { HistoryCommand, CommandContext } from "../types";

export class MoveElementCommand implements HistoryCommand {
  readonly id: string;
  readonly type = "element.move";

  constructor(
    private readonly payload: {
      elementId: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
    },
  ) {
    this.id = `move-${payload.elementId}-${Date.now()}-${Math.random()}`;
  }

  execute(ctx: CommandContext) {
    ctx.store.updateElementPosition(
      this.payload.elementId,
      this.payload.to.x,
      this.payload.to.y,
    );
    ctx.refresh();
  }

  undo(ctx: CommandContext) {
    ctx.store.updateElementPosition(
      this.payload.elementId,
      this.payload.from.x,
      this.payload.from.y,
    );
    ctx.refresh();
  }
}
