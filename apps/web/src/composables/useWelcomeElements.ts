import { createTextElement, type EditorElement } from "../editor/elements/factory";
import type { EditorDocumentStore } from "../editor/store/EditorDocumentStore";

interface Point {
  x: number;
  y: number;
}

interface WelcomeEditorAdapter {
  documentStore: EditorDocumentStore;
  applySystemUpdate: (action: () => void) => void;
}

interface WelcomeViewportAdapter {
  getCanvasCenter: () => Point;
}

export function useWelcomeElements(
  editor: WelcomeEditorAdapter,
  viewport: WelcomeViewportAdapter,
) {
  function createWelcomeElements(center: Point, compact: boolean): EditorElement[] {
    const titleFontSize = compact ? 22 : 38;
    const hintFontSize = compact ? 14 : 18;
    const titleY = compact ? center.y - 220 : center.y - 110;
    const hintY = compact ? center.y - 178 : center.y - 58;
    return [
      createTextElement({
        id: "welcome-text",
        x: center.x - 200,
        y: titleY,
        text: "欢迎来到《梦想家》",
        fontSize: titleFontSize,
        color: "#f8fafc",
        zIndex: 10,
      }),
      createTextElement({
        id: "hint-text",
        x: center.x - 210,
        y: hintY,
        text: "输入提示词后会在视野中心生成图片",
        fontSize: hintFontSize,
        color: "#93c5fd",
        zIndex: 11,
      }),
    ];
  }

  function syncWelcomeNodes(compact: boolean) {
    const dynamicElements = editor.documentStore.getElements().filter(
      (element) => element.id !== "welcome-text" && element.id !== "hint-text",
    );
    const hasImageNode = dynamicElements.some((element) => {
      if (element.type !== "image") return false;
      return Boolean(element.toJSON().data.src);
    });
    if (hasImageNode) {
      editor.applySystemUpdate(() => {
        editor.documentStore.setElements(dynamicElements);
      });
      return;
    }
    editor.applySystemUpdate(() => {
      editor.documentStore.setElements([
        ...createWelcomeElements(viewport.getCanvasCenter(), compact),
        ...dynamicElements,
      ]);
    });
  }

  function initWelcome() {
    syncWelcomeNodes(false);
  }

  return {
    syncWelcomeNodes,
    initWelcome,
  };
}
