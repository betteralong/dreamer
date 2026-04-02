<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { NodeViewWrapper } from "@tiptap/vue-3";

interface OptionLike {
  label: string;
  value: string;
}

const props = defineProps<{
  node: {
    attrs: {
      id?: string;
      value?: string;
      options?: OptionLike[];
    };
  };
  editor?: {
    isEditable?: boolean;
    view?: {
      dom?: HTMLElement;
    };
  };
  selected?: boolean;
  updateAttributes: (attributes: Record<string, unknown>) => void;
}>();

function normalizeOptions(options: unknown): OptionLike[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((item) => {
      const value = String((item as OptionLike)?.value ?? "");
      const label = String((item as OptionLike)?.label ?? value);
      return { label, value };
    })
    .filter((item) => item.value.length > 0);
}

const value = computed(() => String(props.node.attrs.value ?? ""));
const options = computed(() => {
  const normalized = normalizeOptions(props.node.attrs.options);
  if (!normalized.some((item) => item.value === value.value) && value.value) {
    return [...normalized, { label: value.value, value: value.value }];
  }
  return normalized;
});

const panelOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const panelPlacement = ref<"left" | "right">("left");
const highlightedIndex = ref(0);
const triggerFocused = ref(false);
const editable = computed(() => props.editor?.isEditable !== false);

const currentLabel = computed(() => {
  const hit = options.value.find((item) => item.value === value.value);
  return hit?.label ?? value.value;
});

const handleSelect = (nextValue: string) => {
  if (!editable.value) return;
  props.updateAttributes({ value: nextValue });
  panelOpen.value = false;
};

const togglePanel = () => {
  if (!editable.value) return;
  panelOpen.value = !panelOpen.value;
};

const openPanelWithHighlight = () => {
  if (!editable.value) return;
  const selectedIndex = options.value.findIndex((item) => item.value === value.value);
  highlightedIndex.value = selectedIndex >= 0 ? selectedIndex : 0;
  panelOpen.value = true;
};

const moveHighlight = (offset: number) => {
  if (!editable.value) return;
  if (!options.value.length) return;
  const total = options.value.length;
  highlightedIndex.value = (highlightedIndex.value + offset + total) % total;
};

const emitTokenEvent = (eventName: "dreamer-token-focus" | "dreamer-token-select") => {
  const root = props.editor?.view?.dom;
  if (!root) return;
  root.dispatchEvent(
    new CustomEvent(eventName, {
      detail: {
        id: String(props.node.attrs.id ?? ""),
        tokenType: "select",
        value: String(props.node.attrs.value ?? ""),
      },
      bubbles: true,
    }),
  );
};

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!panelOpen.value) return;
  const target = event.target as Node | null;
  if (!target) return;
  if (rootRef.value?.contains(target)) return;
  panelOpen.value = false;
};

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown);
});

watch(panelOpen, async (open) => {
  if (!open) return;
  await nextTick();
  const rootRect = rootRef.value?.getBoundingClientRect();
  if (!rootRect) return;
  const panelWidth = 168;
  const rightOverflow = rootRect.left + panelWidth > window.innerWidth - 12;
  panelPlacement.value = rightOverflow ? "right" : "left";
});

watch(
  () => value.value,
  (next) => {
    const selectedIndex = options.value.findIndex((item) => item.value === next);
    if (selectedIndex >= 0) {
      highlightedIndex.value = selectedIndex;
    }
  },
  { immediate: true },
);

const handleTriggerKeydown = (event: KeyboardEvent) => {
  if (!editable.value) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!panelOpen.value) {
      openPanelWithHighlight();
      return;
    }
    moveHighlight(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!panelOpen.value) {
      openPanelWithHighlight();
      return;
    }
    moveHighlight(-1);
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!panelOpen.value) {
      openPanelWithHighlight();
      return;
    }
    const item = options.value[highlightedIndex.value];
    if (item) {
      handleSelect(item.value);
    }
    return;
  }

  if (event.key === "Escape" && panelOpen.value) {
    event.preventDefault();
    panelOpen.value = false;
  }
};

const handlePanelKeydown = (event: KeyboardEvent) => {
  if (!editable.value) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveHighlight(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveHighlight(-1);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const item = options.value[highlightedIndex.value];
    if (item) {
      handleSelect(item.value);
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    panelOpen.value = false;
  }
};
</script>

<template>
  <NodeViewWrapper
    as="span"
    ref="rootRef"
    class="dreamer-token-wrapper dreamer-token-select-wrap"
    :class="{ 'is-selected': !!selected }"
  >
    <button
      type="button"
      class="dreamer-token-select-trigger"
      :class="{ 'is-open': panelOpen }"
      :disabled="!editable"
      @click.stop="togglePanel"
      @keydown.stop="handleTriggerKeydown"
      @focus="
        triggerFocused = true;
        emitTokenEvent('dreamer-token-focus');
      "
      @blur="triggerFocused = false"
      @mousedown.stop="emitTokenEvent('dreamer-token-select')"
    >
      <span class="dreamer-token-select-value">{{ currentLabel }}</span>
      <span class="dreamer-token-select-chevron" />
    </button>
    <div
      v-if="panelOpen"
      class="dreamer-token-select-panel"
      :class="{ 'is-right': panelPlacement === 'right', 'is-focused': triggerFocused }"
      tabindex="0"
      @click.stop
      @keydown.stop="handlePanelKeydown"
    >
      <button
        v-for="(item, index) in options"
        :key="item.value"
        type="button"
        class="dreamer-token-select-option"
        :class="{
          'is-active': item.value === value,
          'is-highlighted': index === highlightedIndex,
        }"
        @mouseenter="highlightedIndex = index"
        @mousedown.stop="emitTokenEvent('dreamer-token-select')"
        @click.stop="handleSelect(item.value)"
      >
        {{ item.label }}
      </button>
    </div>
  </NodeViewWrapper>
</template>
