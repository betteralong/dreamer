<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { Bubble } from "ant-design-x-vue";
import type { ChatMessage } from "../types/chat";

const props = defineProps<{
  messages: ChatMessage[];
  submitting: boolean;
}>();
const emit = defineEmits<{
  submit: [prompt: string];
  addToCanvas: [messageId: string];
}>();

const listRef = ref<HTMLDivElement | null>(null);

const editor = useEditor({
  extensions: [StarterKit],
  content: "<p>描述你想生成的图片...</p>",
});

const plainText = computed(() => editor.value?.getText().trim() ?? "");
const canSubmit = computed(() => !!plainText.value && !props.submitting);

function submitPrompt() {
  if (!canSubmit.value) return;
  const prompt = plainText.value;
  if (!prompt) return;
  emit("submit", prompt);
  editor.value?.commands.setContent("<p></p>");
}

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (!listRef.value) return;
    listRef.value.scrollTop = listRef.value.scrollHeight;
  },
);
</script>

<template>
  <section class="flex h-full min-h-0 flex-col gap-3">
    <h2 class="m-0 text-sm font-medium text-slate-200">聊天记录</h2>

    <div
      ref="listRef"
      class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto rounded-xl border border-slate-700/60 bg-slate-950/60 p-2"
    >
      <Bubble
        v-for="message in props.messages"
        :key="message.id"
        :content="message"
        :loading="false"
        :placement="message.role === 'user' ? 'end' : 'start'"
        :variant="message.role === 'user' ? 'filled' : 'outlined'"
      >
        <template #message="{ content }">
          <div class="max-w-[248px]">
            <div
              v-if="content.loading && (!(content.imageVisible ?? true) || !content.imageUrl)"
              class="relative w-[248px] overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-b from-fuchsia-50 via-sky-50 to-cyan-100 p-4 text-slate-900"
            >
              <div class="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.4)_1px,transparent_0)] bg-[length:8px_8px] opacity-45" />
              <p class="relative m-0 text-center text-2xl font-bold">
                {{ content.progress ?? 0 }}%
              </p>
              <div class="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-300/70">
                <div
                  class="h-full rounded-full bg-sky-500 transition-all duration-300"
                  :style="{ width: `${content.progress ?? 0}%` }"
                />
              </div>
              <p class="relative mt-2 text-center text-xs text-slate-600">正在生成中...</p>
            </div>
            <img
              v-if="content.imageUrl && (content.imageVisible ?? true)"
              :src="content.imageUrl"
              alt="ai image"
              class="block max-w-[248px] rounded-md border border-slate-700 object-cover animate-[fade-in_260ms_ease-out]"
            />
            <p
              v-if="
                content.text &&
                !(content.loading && !(content.imageVisible ?? true) && content.imageUrl)
              "
              class="m-0 whitespace-pre-wrap text-sm leading-6"
            >
              {{ content.text }}
            </p>
          </div>
        </template>
        <template #footer="{ content }">
          <button
            v-if="content.imageUrl"
            type="button"
            class="mt-1 rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="content.addedToCanvas"
            @click="emit('addToCanvas', content.id)"
          >
            {{ content.addedToCanvas ? "已添加到画布" : "添加到画布" }}
          </button>
        </template>
      </Bubble>
    </div>

    <h3 class="m-0 text-xs font-medium tracking-wide text-slate-400">AI 对话框</h3>
    <div class="flex flex-col gap-2">
      <EditorContent :editor="editor" class="editor" />
      <button
        type="button"
        class="cursor-pointer rounded-lg border-none bg-blue-600 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:bg-slate-700"
        :disabled="!canSubmit"
        @click="submitPrompt"
      >
        {{ props.submitting ? "生成中..." : "发送并生图" }}
      </button>
    </div>
  </section>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

:deep(.ProseMirror) {
  min-height: 120px;
  padding: 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  background: #0f172a;
  outline: none;
}
</style>
