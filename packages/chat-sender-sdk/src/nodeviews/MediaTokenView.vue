<script setup lang="ts">
import { computed } from "vue";
import { NodeViewWrapper } from "@tiptap/vue-3";

const props = defineProps<{
  node: {
    attrs: {
      id?: string;
      url?: string;
      name?: string;
    };
  };
  editor?: {
    view?: {
      dom?: HTMLElement;
    };
  };
  selected?: boolean;
}>();

const url = computed(() => String(props.node.attrs.url ?? ""));
const name = computed(() => String(props.node.attrs.name ?? "参考图"));

const emitTokenSelect = () => {
  const root = props.editor?.view?.dom;
  if (!root) return;
  root.dispatchEvent(
    new CustomEvent("dreamer-token-select", {
      detail: {
        id: String(props.node.attrs.id ?? ""),
        tokenType: "media",
        value: String(props.node.attrs.url ?? ""),
        label: String(props.node.attrs.name ?? ""),
      },
      bubbles: true,
    }),
  );
};
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="dreamer-token-wrapper dreamer-token-media"
    :class="{ 'is-selected': !!selected }"
    @mousedown.stop="emitTokenSelect"
  >
    <img
      class="dreamer-token-media-thumb"
      :src="url"
      :alt="name"
    />
    <span class="dreamer-token-media-label">
      {{ name }}
    </span>
  </NodeViewWrapper>
</template>
