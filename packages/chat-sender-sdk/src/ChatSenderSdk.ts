import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import "./styles.css";
import { InputToken } from "./extensions/input-token";
import { SelectToken } from "./extensions/select-token";
import { MediaToken } from "./extensions/media-token";
import {
  docToParts,
  normalizeParts,
  partsToDoc,
  partsToPromptText,
  toRuntimePart,
} from "./parts";
import type {
  ChatSenderChangePayload,
  ChatSenderInstance,
  ChatSenderSubmitPayload,
  ChatSenderTokenEventPayload,
  Part,
  RawPart,
} from "./types";

export const ChatSenderSdk = defineComponent({
  name: "ChatSenderSdk",
  props: {
    initialParts: {
      type: Array as PropType<RawPart[]>,
      default: () => [],
    },
    submitting: {
      type: Boolean,
      default: false,
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      default: "描述你想生成的内容...",
    },
    submitText: {
      type: String,
      default: "发送并生图",
    },
    submittingText: {
      type: String,
      default: "生成中...",
    },
  },
  emits: {
    submit: (_payload: ChatSenderSubmitPayload) => true,
    change: (_payload: ChatSenderChangePayload) => true,
    tokenFocus: (_payload: ChatSenderTokenEventPayload) => true,
    tokenSelect: (_payload: ChatSenderTokenEventPayload) => true,
  },
  setup(props, { emit, expose }) {
    const booted = ref(false);
    const suppressWatch = ref(false);
    const partsState = ref<Part[]>(normalizeParts(props.initialParts));

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          bulletList: false,
          orderedList: false,
        }),
        InputToken,
        SelectToken,
        MediaToken,
      ],
      content: partsToDoc(partsState.value),
      editable: !props.readOnly,
      editorProps: {
        attributes: {
          class: "dreamer-chat-sender-editor",
        },
      },
      onUpdate({ editor }) {
        partsState.value = docToParts(editor.getJSON());
        if (!suppressWatch.value) {
          emit("change", {
            parts: partsState.value,
            promptText: partsToPromptText(partsState.value),
          });
        }
      },
    });

    const promptText = computed(() => partsToPromptText(partsState.value));
    const canSubmit = computed(
      () => !props.submitting && !props.readOnly && promptText.value.length > 0,
    );

    const tokenFocusHandlerRef = ref<((event: Event) => void) | null>(null);
    const tokenSelectHandlerRef = ref<((event: Event) => void) | null>(null);
    const eventBoundRootRef = ref<HTMLElement | null>(null);

    function setEditorParts(parts: RawPart[]) {
      const normalized = normalizeParts(parts);
      partsState.value = normalized;
      if (!editor.value) return;
      suppressWatch.value = true;
      editor.value.commands.setContent(partsToDoc(normalized));
      suppressWatch.value = false;
      emit("change", {
        parts: partsState.value,
        promptText: partsToPromptText(partsState.value),
      });
    }

    function submit() {
      if (!canSubmit.value) return;
      emit("submit", {
        parts: partsState.value,
        promptText: promptText.value,
      });
    }

    function focus() {
      editor.value?.commands.focus("end");
    }

    function blur() {
      editor.value?.commands.blur();
    }

    function insertText(text: string) {
      if (props.readOnly) return;
      if (!text) return;
      editor.value?.commands.focus("end");
      editor.value?.commands.insertContent(text);
    }

    function insertPart(rawPart: RawPart) {
      if (props.readOnly) return;
      const part = toRuntimePart(rawPart);
      editor.value?.commands.focus("end");
      editor.value?.commands.insertContent(partsToDoc([part]).content ?? []);
    }

    function getParts() {
      return partsState.value;
    }

    function clear() {
      setEditorParts([]);
    }

    watch(
      () => props.initialParts,
      (parts) => {
        if (!booted.value) return;
        setEditorParts(parts ?? []);
      },
      { deep: true },
    );

    watch(
      () => props.readOnly,
      (readOnly) => {
        editor.value?.setEditable(!readOnly);
      },
      { immediate: true },
    );

    watch(editor, (instance) => {
      const previousRoot = eventBoundRootRef.value;
      if (previousRoot && tokenFocusHandlerRef.value) {
        previousRoot.removeEventListener("dreamer-token-focus", tokenFocusHandlerRef.value);
      }
      if (previousRoot && tokenSelectHandlerRef.value) {
        previousRoot.removeEventListener("dreamer-token-select", tokenSelectHandlerRef.value);
      }

      const root = instance?.view.dom as HTMLElement | undefined;
      if (!root) {
        eventBoundRootRef.value = null;
        return;
      }

      const onTokenFocus = (event: Event) => {
        const detail = (event as CustomEvent<ChatSenderTokenEventPayload>).detail;
        if (!detail) return;
        emit("tokenFocus", detail);
      };
      const onTokenSelect = (event: Event) => {
        const detail = (event as CustomEvent<ChatSenderTokenEventPayload>).detail;
        if (!detail) return;
        emit("tokenSelect", detail);
      };

      root.addEventListener("dreamer-token-focus", onTokenFocus);
      root.addEventListener("dreamer-token-select", onTokenSelect);
      tokenFocusHandlerRef.value = onTokenFocus;
      tokenSelectHandlerRef.value = onTokenSelect;
      eventBoundRootRef.value = root;
    }, { immediate: true });

    onMounted(() => {
      booted.value = true;
      if (!partsState.value.length && props.placeholder) {
        editor.value?.commands.setContent(`<p>${props.placeholder}</p>`);
        editor.value?.commands.selectAll();
        editor.value?.commands.deleteSelection();
      }
    });

    onBeforeUnmount(() => {
      const root = eventBoundRootRef.value;
      if (root && tokenFocusHandlerRef.value) {
        root.removeEventListener("dreamer-token-focus", tokenFocusHandlerRef.value);
      }
      if (root && tokenSelectHandlerRef.value) {
        root.removeEventListener("dreamer-token-select", tokenSelectHandlerRef.value);
      }
    });

    expose<ChatSenderInstance>({
      focus,
      blur,
      setParts: setEditorParts,
      getParts,
      insertText,
      insertPart,
      clear,
      submit,
    });

    return () =>
      h("div", { class: ["dreamer-chat-sender-sdk", props.readOnly ? "is-readonly" : ""] }, [
        h(EditorContent, {
          editor: editor.value,
        }),
        h("div", { class: "dreamer-chat-sender-meta" }, [
          h("span", "支持文本、参考图、输入占位和下拉占位"),
          h("span", `${promptText.value.length} chars`),
        ]),
        h(
          "button",
          {
            class: "dreamer-chat-sender-submit",
            type: "button",
            disabled: !canSubmit.value,
            onClick: submit,
          },
          props.submitting ? props.submittingText : props.submitText,
        ),
      ]);
  },
});
