import { ref, type Ref } from "vue";
import type { AiImageStreamEvent } from "@dreamer/shared";
import { streamAiChat } from "../services/ai";
import type { ChatMessage } from "../types/chat";
import type { EditorDocumentStore } from "../editor/store/EditorDocumentStore";
import type { HistoryCommand } from "../editor/history/types";
import { useCanvasLoadingNode } from "./useCanvasLoadingNode";
import { useWelcomeElements } from "./useWelcomeElements";

interface Point {
  x: number;
  y: number;
}

interface CanvasEditorAdapter {
  documentStore: EditorDocumentStore;
  selectedElementIds: Ref<string[]>;
  applySystemUpdate: (action: () => void) => void;
  forceSync: () => void;
  executeCommand: (command: HistoryCommand, options?: { recordHistory?: boolean }) => void;
}

interface CanvasViewportAdapter {
  getCanvasCenter: () => Point;
  focusOn: (point: Point, animate?: boolean) => void;
}

export function useAiCanvasGeneration(
  editor: CanvasEditorAdapter,
  viewport: CanvasViewportAdapter,
) {
  const submitting = ref(false);
  const messages = ref<ChatMessage[]>([]);
  const autoFocusEnabled = ref(true);
  const messageRevealTimers = new Map<string, number>();
  const welcome = useWelcomeElements(
    {
      documentStore: editor.documentStore,
      applySystemUpdate: editor.applySystemUpdate,
    },
    {
      getCanvasCenter: viewport.getCanvasCenter,
    },
  );

  const loadingNode = useCanvasLoadingNode(
    editor,
    viewport,
    {
      syncWelcome: welcome.syncWelcomeNodes,
      autoFocusEnabled,
    },
  );

  function setMessageLoadingProgress(messageId: string, progress: number) {
    const message = messages.value.find((item) => item.id === messageId);
    if (!message) return;
    message.loading = true;
    message.progress = progress;
    message.text = "正在生成图片...";
  }

  function clearMessageLoadingProgress(messageId: string) {
    const message = messages.value.find((item) => item.id === messageId);
    if (!message) return;
    message.loading = false;
    message.progress = undefined;
  }

  function clearMessageRevealTimer(messageId: string) {
    const timer = messageRevealTimers.get(messageId);
    if (!timer) return;
    window.clearTimeout(timer);
    messageRevealTimers.delete(messageId);
  }

  function appendImageNode(id: string, imageUrl: string) {
    loadingNode.appendImageNode(id, imageUrl);
  }

  function markMessageAdded(messageId: string) {
    const message = messages.value.find((item) => item.id === messageId);
    if (!message) return;
    message.addedToCanvas = true;
  }

  function addImageToCanvas(messageId: string) {
    const message = messages.value.find((item) => item.id === messageId);
    if (!message?.imageUrl || message.addedToCanvas) return;
    appendImageNode(message.id, message.imageUrl);
    markMessageAdded(messageId);
  }

  function applyImageResult(
    messageId: string,
    event: AiImageStreamEvent,
    autoAddToCanvas = true,
  ) {
    const message = messages.value.find((item) => item.id === messageId);
    if (!message) return;
    clearMessageRevealTimer(messageId);
    message.text = event.content ?? "图片已生成。";
    message.imageUrl = event.imageUrl;
    message.imageVisible = false;
    message.loading = true;
    message.progress = 100;
    message.addedToCanvas = false;

    if (autoAddToCanvas) {
      appendImageNode(event.id, event.imageUrl);
      message.addedToCanvas = true;
    }

    const timer = window.setTimeout(() => {
      const current = messages.value.find((item) => item.id === messageId);
      if (!current) return;
      current.loading = false;
      current.progress = undefined;
      current.imageVisible = true;
      messageRevealTimers.delete(messageId);
    }, 260);
    messageRevealTimers.set(messageId, timer);
  }

  async function handlePromptSubmit(prompt: string) {
    if (submitting.value) return;
    submitting.value = true;

    messages.value.push({
      id: crypto.randomUUID(),
      role: "user",
      text: prompt,
    });

    const pendingAiMessageId = crypto.randomUUID();
    messages.value.push({
      id: pendingAiMessageId,
      role: "ai",
      text: "正在生成图片...",
      loading: true,
      progress: 12,
    });
    loadingNode.startLoading((progress) => {
      setMessageLoadingProgress(pendingAiMessageId, progress);
    });

    try {
      await streamAiChat({ prompt }, (event) => {
        if (event.type === "thinking") {
          const message = messages.value.find((item) => item.id === pendingAiMessageId);
          if (!message) return;
          message.text = event.content;
          setMessageLoadingProgress(pendingAiMessageId, message.progress ?? 12);
        }

        if (event.type === "image") {
          applyImageResult(pendingAiMessageId, event, true);
        }

        if (event.type === "error") {
          clearMessageRevealTimer(pendingAiMessageId);
          loadingNode.stopLoading();
          const message = messages.value.find((item) => item.id === pendingAiMessageId);
          if (!message) return;
          clearMessageLoadingProgress(pendingAiMessageId);
          message.text = event.content;
        }

        if (event.type === "done") {
          const pending = messages.value.find((item) => item.id === pendingAiMessageId);
          if (pending?.imageUrl) {
            return;
          }
          loadingNode.stopLoading();
          if (!pending?.imageUrl) {
            clearMessageLoadingProgress(pendingAiMessageId);
          }
        }
      });
    } catch (error) {
      clearMessageRevealTimer(pendingAiMessageId);
      loadingNode.stopLoading();
      const message = messages.value.find((item) => item.id === pendingAiMessageId);
      if (message) {
        clearMessageLoadingProgress(pendingAiMessageId);
        message.text = error instanceof Error ? error.message : "请求失败，请稍后重试。";
      }
    } finally {
      submitting.value = false;
    }
  }

  function cleanup() {
    loadingNode.cleanup();
    for (const timer of messageRevealTimers.values()) {
      window.clearTimeout(timer);
    }
    messageRevealTimers.clear();
  }

  return {
    submitting,
    messages,
    autoFocusEnabled,
    handlePromptSubmit,
    addImageToCanvas,
    initWelcome: welcome.initWelcome,
    cleanup,
  };
}
