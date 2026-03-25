import { BaseElement } from "./BaseElement";
import type { TextElementSnapshot } from "../types";

export class TextElement extends BaseElement<"text", TextElementSnapshot["data"]> {
  constructor(snapshot: TextElementSnapshot) {
    super(snapshot);
  }

  setText(text: string) {
    this.snapshot.data.text = text;
  }

  setFontSize(fontSize: number) {
    this.snapshot.data.fontSize = fontSize;
  }
}
