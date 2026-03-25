import { BaseElement } from "./BaseElement";
import type { ImageElementSnapshot } from "../types";

export class ImageElement extends BaseElement<"image", ImageElementSnapshot["data"]> {
  constructor(snapshot: ImageElementSnapshot) {
    super(snapshot);
  }

  setSource(src: string) {
    this.snapshot.data.src = src;
  }
}
