import type { CommandContext, HistoryCommand } from "./types";

export class HistoryManager {
  private readonly past: HistoryCommand[] = [];
  private readonly future: HistoryCommand[] = [];

  execute(command: HistoryCommand, ctx: CommandContext) {
    command.execute(ctx);
    this.past.push(command);
    this.future.length = 0;
  }

  pushExecuted(command: HistoryCommand) {
    this.past.push(command);
    this.future.length = 0;
  }

  undo(ctx: CommandContext) {
    const command = this.past.pop();
    if (!command) return false;
    command.undo(ctx);
    this.future.push(command);
    return true;
  }

  redo(ctx: CommandContext) {
    const command = this.future.pop();
    if (!command) return false;
    command.execute(ctx);
    this.past.push(command);
    return true;
  }

  canUndo() {
    return this.past.length > 0;
  }

  canRedo() {
    return this.future.length > 0;
  }

  getPastCount() {
    return this.past.length;
  }

  getFutureCount() {
    return this.future.length;
  }

  getRecentCommands(limit = 10) {
    return this.past
      .slice(-limit)
      .reverse()
      .map((item) => ({
        id: item.id,
        type: item.type,
      }));
  }
}
