import { cloneDeep } from "lodash-es";
import type {
  BaseElementSnapshot,
  ElementErrorState,
  ElementLoadingState,
  ElementType,
} from "../types";

export abstract class BaseElement<TType extends ElementType, TData> {
  protected snapshot: BaseElementSnapshot<TType, TData>;

  constructor(snapshot: BaseElementSnapshot<TType, TData>) {
    this.snapshot = cloneDeep(snapshot);
  }

  get id() {
    return this.snapshot.id;
  }

  get type() {
    return this.snapshot.type;
  }

  toJSON(): BaseElementSnapshot<TType, TData> {
    return cloneDeep(this.snapshot);
  }

  setPosition(x: number, y: number) {
    this.snapshot.transform.x = x;
    this.snapshot.transform.y = y;
  }

  setSize(width: number, height: number) {
    this.snapshot.size.width = Math.max(1, width);
    this.snapshot.size.height = Math.max(1, height);
  }

  moveBy(dx: number, dy: number) {
    if (!this.canMove()) return;
    this.snapshot.transform.x += dx;
    this.snapshot.transform.y += dy;
  }

  canMove() {
    return this.snapshot.interaction.movable && !this.snapshot.interaction.locked;
  }

  setLoading(payload: ElementLoadingState) {
    this.snapshot.state.status = "loading";
    this.snapshot.state.loading = payload;
    delete this.snapshot.state.error;
  }

  setReady() {
    this.snapshot.state.status = "ready";
    delete this.snapshot.state.loading;
    delete this.snapshot.state.error;
  }

  setError(payload: ElementErrorState) {
    this.snapshot.state.status = "error";
    this.snapshot.state.error = payload;
    delete this.snapshot.state.loading;
  }

  setOpacity(opacity: number) {
    this.snapshot.style.opacity = Math.min(1, Math.max(0, opacity));
  }

  setVisible(visible: boolean) {
    this.snapshot.style.visible = visible;
  }
}
