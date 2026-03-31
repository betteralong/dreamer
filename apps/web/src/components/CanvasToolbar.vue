<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  uploadImage: [file: File];
  addText: [];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);

function triggerUpload() {
  fileInputRef.value?.click();
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;
  emit("uploadImage", file);
  input.value = "";
}
</script>

<template>
  <aside class="ui-panel left-toolbar fixed left-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2 p-2">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onFileChange"
    />
    <div class="tool-action group">
      <button
        type="button"
        class="ui-btn-ghost toolbar-icon-btn"
        aria-label="上传图片"
        @click="triggerUpload"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M12 16V5" stroke-linecap="round" />
          <path d="M8 9l4-4 4 4" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M5 19h14" stroke-linecap="round" />
        </svg>
      </button>
      <span class="tool-label">上传图片</span>
    </div>
    <div class="tool-action group">
      <button
        type="button"
        class="ui-btn-ghost toolbar-icon-btn"
        aria-label="添加文字"
        @click="emit('addText')"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M5 6h14" stroke-linecap="round" />
          <path d="M12 6v12" stroke-linecap="round" />
          <path d="M8 18h8" stroke-linecap="round" />
        </svg>
      </button>
      <span class="tool-label">添加文字</span>
    </div>
  </aside>
</template>

<style scoped>
.left-toolbar {
  width: 58px;
}

.tool-action {
  position: relative;
}

.toolbar-icon-btn {
  display: inline-flex;
  height: 38px;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.tool-label {
  pointer-events: none;
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
  white-space: nowrap;
  border: 1px solid var(--app-tooltip-border);
  border-radius: 999px;
  background: var(--app-tooltip-bg);
  color: var(--app-text);
  box-shadow: var(--app-tooltip-shadow);
  padding: 4px 10px;
  font-size: 11px;
  line-height: 1;
  opacity: 0;
  visibility: hidden;
  transition: opacity 180ms ease, transform 180ms ease, visibility 0s linear 180ms;
}

.tool-label::before {
  content: "";
  position: absolute;
  left: -5px;
  top: 50%;
  width: 8px;
  height: 8px;
  transform: translateY(-50%) rotate(45deg);
  border-left: 1px solid var(--app-tooltip-border);
  border-bottom: 1px solid var(--app-tooltip-border);
  background: var(--app-tooltip-bg);
}

.group:hover .tool-label,
.group:focus-within .tool-label {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) translateX(0);
  transition-delay: 90ms;
}

@media (prefers-reduced-motion: reduce) {
  .tool-label {
    transition: none;
  }

  .group:hover .tool-label,
  .group:focus-within .tool-label {
    transition-delay: 0ms;
  }
}
</style>
