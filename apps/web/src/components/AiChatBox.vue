<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { Bubble } from "ant-design-x-vue";
import {
  ChatSenderSdk,
  type ChatSenderChangePayload,
  type ChatSenderInstance,
  type RawPart,
  type ChatSenderSubmitPayload,
} from "@dreamer/chat-sender-sdk";
import { getMockPrompt } from "../services/mock";
import type { ChatMessage } from "../types/chat";

const props = withDefaults(
  defineProps<{
    messages: ChatMessage[];
    submitting: boolean;
  }>(),
  {},
);
const emit = defineEmits<{
  submit: [payload: ChatSenderSubmitPayload];
  addToCanvas: [messageId: string];
}>();

const listRef = ref<HTMLDivElement | null>(null);
const senderRef = ref<ChatSenderInstance | null>(null);
const promptCharCount = ref(0);
const senderReadOnly = ref(false);

function handleSenderChange(payload: ChatSenderChangePayload) {
  promptCharCount.value = payload.promptText.length;
}

function handleSenderSubmit(payload: ChatSenderSubmitPayload) {
  emit("submit", payload);
}

function focusSender() {
  senderRef.value?.focus();
}

function clearSender() {
  senderRef.value?.clear();
}

function resetSenderWithMock() {
  senderRef.value?.setParts(getMockPrompt() as RawPart[]);
}

function insertSellingPoint() {
  senderRef.value?.insertPart({
    type: "text",
    content: "",
    value: "云感绒面，包裹感强",
    extra: {
      placeholder: {
        type: "input",
        label: "补充卖点",
        removable: true,
      },
    },
  });
}

function toggleReadOnly() {
  senderReadOnly.value = !senderReadOnly.value;
}

function setReadOnly(readonly: boolean) {
  senderReadOnly.value = readonly;
}

onMounted(() => {
  resetSenderWithMock();
});

watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (!listRef.value) return;
    listRef.value.scrollTop = listRef.value.scrollHeight;
  },
);

defineExpose({
  focusSender,
  clearSender,
  resetSenderWithMock,
  insertSellingPoint,
  toggleReadOnly,
  setReadOnly,
});
</script>

<template>
  <section class="flex h-full min-h-0 flex-col gap-3">
    <h2 class="m-0 font-display text-sm font-medium tracking-wide text-app-text">聊天记录</h2>

    <div
      ref="listRef"
      class="chat-list flex min-h-0 flex-1 flex-col gap-2 overflow-auto rounded-xl border border-app-border/70 bg-app-bg/62 p-2"
    >
      <div
        v-if="props.messages.length === 0"
        class="rounded-lg border border-dashed border-app-border/70 bg-app-panel-soft/35 px-3 py-4 text-center"
      >
        <div class="font-display text-xs tracking-wide text-app-text-subtle">READY TO CREATE</div>
        <div class="mt-1 text-xs text-app-text-muted">输入描述后发送，AI 将生成并可一键加入画布。</div>
      </div>
      <Bubble
        v-for="message in props.messages"
        :key="message.id"
        :class="message.role === 'user' ? 'bubble-user' : 'bubble-assistant'"
        :content="message"
        :loading="false"
        :placement="message.role === 'user' ? 'end' : 'start'"
        :variant="message.role === 'user' ? 'filled' : 'outlined'"
      >
        <template #message="{ content }">
          <div class="max-w-[248px]">
            <div
              v-if="content.loading && (!(content.imageVisible ?? true) || !content.imageUrl)"
              class="relative w-[248px] overflow-hidden rounded-xl border border-app-border-strong/80 bg-gradient-to-b from-app-panel-soft via-app-panel to-app-bg-soft p-4 text-app-text"
            >
              <div class="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(57,197,255,0.28)_1px,transparent_0)] bg-[length:8px_8px] opacity-55" />
              <p class="relative m-0 text-center text-2xl font-bold">
                {{ content.progress ?? 0 }}%
              </p>
              <div class="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-app-border/70">
                <div
                  class="h-full rounded-full bg-app-accent transition-all duration-300"
                  :style="{ width: `${content.progress ?? 0}%` }"
                />
              </div>
              <p class="relative mt-2 text-center text-xs text-app-text-muted">正在生成中...</p>
            </div>
            <img
              v-if="content.imageUrl && (content.imageVisible ?? true)"
              :src="content.imageUrl"
              alt="ai image"
              class="block max-w-[248px] rounded-md border border-app-border object-cover animate-[fade-in_260ms_ease-out]"
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
            class="ui-btn-ghost mt-1 disabled:opacity-50"
            :disabled="content.addedToCanvas"
            @click="emit('addToCanvas', content.id)"
          >
            {{ content.addedToCanvas ? "已添加到画布" : "添加到画布" }}
          </button>
        </template>
      </Bubble>
    </div>

    <h3 class="m-0 font-display text-xs font-medium tracking-wide text-app-text-subtle">AI 对话框</h3>
    <div class="ui-card editor-shell flex flex-col gap-2 p-2">
      <ChatSenderSdk
        ref="senderRef"
        :submitting="props.submitting"
        :read-only="senderReadOnly"
        :initial-parts="[]"
        @change="handleSenderChange"
        @submit="handleSenderSubmit"
      />
      <div class="flex items-center justify-end px-1 text-[11px] text-app-text-subtle">
        <span>{{ promptCharCount }} chars</span>
      </div>
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

.chat-list::-webkit-scrollbar {
  width: 8px;
}

.chat-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--app-border-strong) 85%, transparent),
    color-mix(in srgb, var(--app-accent) 72%, transparent)
  );
}

.chat-list::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--app-bg-soft) 55%, transparent);
}

:deep(.ant-bubble) {
  color: var(--app-text);
}

:deep(.ant-bubble-content) {
  border: 1px solid color-mix(in srgb, var(--app-border) 85%, transparent);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--app-panel-soft) 78%, transparent),
    color-mix(in srgb, var(--app-bg-soft) 78%, transparent)
  );
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--app-text-muted) 12%, transparent);
}

.bubble-user :deep(.ant-bubble-content) {
  border-color: color-mix(in srgb, var(--app-accent) 72%, transparent);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--app-accent-soft) 88%, transparent),
    color-mix(in srgb, var(--app-panel) 88%, transparent)
  );
}

.bubble-assistant :deep(.ant-bubble-content) {
  border-color: color-mix(in srgb, var(--app-border) 85%, transparent);
}

.editor-shell {
  transition: border-color 220ms ease, background-color 220ms ease;
}

.editor-shell:hover {
  border-color: color-mix(in srgb, var(--app-border-strong) 96%, transparent);
}

</style>
