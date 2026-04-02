<script setup lang="ts">
import { computed, ref } from "vue";
import { NodeViewWrapper } from "@tiptap/vue-3";

const props = defineProps<{
  node: {
    nodeSize?: number;
    attrs: {
      id?: string;
      value?: string;
      label?: string;
    };
  };
  getPos?: () => number;
  editor?: {
    isEditable?: boolean;
    view?: {
      dom?: HTMLElement;
    };
    commands?: {
      focus?: (position?: number) => void;
    };
  };
  selected?: boolean;
  updateAttributes: (attributes: Record<string, unknown>) => void;
}>();

const value = computed(() => String(props.node.attrs.value ?? ""));
const label = computed(() => String(props.node.attrs.label ?? ""));
const inputWidthCh = computed(() => {
  const source = value.value || label.value || "";
  const estimate = Math.max(6, Math.min(26, source.length + 1));
  return `${estimate}ch`;
});
const focused = ref(false);
const editable = computed(() => props.editor?.isEditable !== false);

const emitTokenEvent = (eventName: "dreamer-token-focus" | "dreamer-token-select") => {
  const root = props.editor?.view?.dom;
  if (!root) return;
  root.dispatchEvent(
    new CustomEvent(eventName, {
      detail: {
        id: String(props.node.attrs.id ?? ""),
        tokenType: "input",
        value: String(props.node.attrs.value ?? ""),
        label: String(props.node.attrs.label ?? ""),
      },
      bubbles: true,
    }),
  );
};

const handleInput = (event: Event) => {
  if (!editable.value) return;
  const target = event.target as HTMLInputElement;
  props.updateAttributes({ value: target.value });
};

const moveCaretOutside = (direction: "before" | "after") => {
  const getPos = props.getPos;
  if (!getPos || !props.editor?.commands?.focus) return;
  const currentPos = getPos();
  const nodeSize = Number(props.node.nodeSize ?? 1);
  const targetPos = direction === "after" ? currentPos + nodeSize : Math.max(0, currentPos);
  props.editor.commands.focus(targetPos);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!editable.value) return;
  const target = event.target as HTMLInputElement;
  const caretAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
  const caretAtEnd =
    target.selectionStart === target.value.length && target.selectionEnd === target.value.length;

  if (event.key === "Enter") {
    event.preventDefault();
    moveCaretOutside("after");
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    moveCaretOutside(event.shiftKey ? "before" : "after");
    return;
  }

  if (event.key === "ArrowLeft" && caretAtStart) {
    event.preventDefault();
    moveCaretOutside("before");
    return;
  }

  if (event.key === "ArrowRight" && caretAtEnd) {
    event.preventDefault();
    moveCaretOutside("after");
  }
};
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="dreamer-token-wrapper dreamer-token-input-wrap"
    :class="{ 'is-selected': !!selected, 'is-focused': focused }"
  >
    <input
      class="dreamer-token-input"
      type="text"
      :value="value"
      :placeholder="label"
      :style="{ width: inputWidthCh }"
      :readonly="!editable"
      @input="handleInput"
      @keydown="handleKeydown"
      @focus="
        focused = true;
        emitTokenEvent('dreamer-token-focus');
      "
      @blur="focused = false"
      @click.stop="emitTokenEvent('dreamer-token-select')"
    />
  </NodeViewWrapper>
</template>
