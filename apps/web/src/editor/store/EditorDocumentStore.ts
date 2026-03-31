import type { CanvasDocument, EditorElementSnapshot } from "../types";
import {
  createElementFromSnapshot,
  type EditorElement,
} from "../elements/factory";

export class EditorDocumentStore {
  private document: CanvasDocument;
  private elements: EditorElement[] = [];

  constructor(initialDocument: CanvasDocument) {
    this.document = structuredClone(initialDocument);
    const activeLayout = this.getActiveLayout();
    if (activeLayout) {
      this.elements = activeLayout.elements.map((item) => createElementFromSnapshot(item));
    }
    this.syncActiveLayoutElements();
  }

  getDocument() {
    return structuredClone(this.document);
  }

  getElements() {
    return this.elements;
  }

  getElementSnapshots(): EditorElementSnapshot[] {
    return this.elements.map((item) => item.toJSON());
  }

  setElements(nextElements: EditorElement[]) {
    this.elements = nextElements;
    this.syncActiveLayoutElements();
  }

  addElement(element: EditorElement) {
    this.elements.push(element);
    this.syncActiveLayoutElements();
  }

  addElementSnapshot(snapshot: EditorElementSnapshot) {
    this.elements.push(createElementFromSnapshot(snapshot));
    this.syncActiveLayoutElements();
  }

  removeElementById(id: string) {
    const index = this.elements.findIndex((item) => item.id === id);
    if (index < 0) {
      return null;
    }
    const [removed] = this.elements.splice(index, 1);
    this.syncActiveLayoutElements();
    return removed.toJSON();
  }

  updateElementPosition(id: string, x: number, y: number) {
    const target = this.elements.find((item) => item.id === id);
    if (!target) return false;
    target.setPosition(x, y);
    this.syncActiveLayoutElements();
    return true;
  }

  updateElementBounds(id: string, x: number, y: number, width: number, height: number) {
    const target = this.elements.find((item) => item.id === id);
    if (!target) return false;
    target.setPosition(x, y);
    target.setSize(width, height);
    this.syncActiveLayoutElements();
    return true;
  }

  getElementPosition(id: string) {
    const target = this.elements.find((item) => item.id === id);
    if (!target) return null;
    const snapshot = target.toJSON();
    return {
      x: snapshot.transform.x,
      y: snapshot.transform.y,
    };
  }

  getElementBounds(id: string) {
    const target = this.elements.find((item) => item.id === id);
    if (!target) return null;
    const snapshot = target.toJSON();
    return {
      x: snapshot.transform.x,
      y: snapshot.transform.y,
      width: snapshot.size.width,
      height: snapshot.size.height,
    };
  }

  getElementSnapshot(id: string) {
    const target = this.elements.find((item) => item.id === id);
    if (!target) return null;
    return target.toJSON();
  }

  replaceElementSnapshot(snapshot: EditorElementSnapshot) {
    const index = this.elements.findIndex((item) => item.id === snapshot.id);
    if (index < 0) return false;
    this.elements[index] = createElementFromSnapshot(snapshot);
    this.syncActiveLayoutElements();
    return true;
  }

  syncActiveLayoutElements() {
    const activeLayout = this.getActiveLayout();
    if (!activeLayout) return;
    activeLayout.elements = this.getElementSnapshots();
  }

  private getActiveLayout() {
    return this.document.layouts.find((item) => item.id === this.document.activeLayoutId);
  }
}
