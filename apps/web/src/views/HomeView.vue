<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import AiChatBox from "../components/AiChatBox.vue";
import InfiniteCanvas from "../components/InfiniteCanvas.vue";
import { useDreamerCanvas } from "../composables/useDreamerCanvas";

const RIGHT_PANEL_WIDTH = 380;

interface Point {
  x: number;
  y: number;
}

interface InfiniteCanvasExposed {
  getViewportCenter: () => Point;
  focusOn: (point: Point, animate?: boolean) => void;
}

const canvasRef = ref<InfiniteCanvasExposed | null>(null);

function getCanvasCenter() {
  return canvasRef.value?.getViewportCenter() ?? { x: 0, y: 0 };
}

function focusCanvas(point: Point, animate = true) {
  canvasRef.value?.focusOn(point, animate);
}

const {
  elementSnapshots,
  selectedElementId,
  canUndo,
  canRedo,
  historyCounts,
  recentCommands,
  handleElementMove,
  handleElementMoveStart,
  handleElementMoveEnd,
  handleElementSelect,
  handleUndo,
  handleRedo,
  handleRemoveSelected,
  handleKeydown,
  submitting,
  messages,
  autoFocusEnabled,
  handlePromptSubmit,
  addImageToCanvas,
  init,
  cleanup,
} = useDreamerCanvas({
  getCanvasCenter,
  focusOn: focusCanvas,
});

onMounted(async () => {
  await nextTick();
  window.addEventListener("keydown", handleKeydown);
  init();
});

onBeforeUnmount(() => {
  cleanup();
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <main class="relative h-screen w-screen overflow-hidden bg-slate-950">
    <section class="absolute inset-0">
      <InfiniteCanvas
        ref="canvasRef"
        :elements="elementSnapshots"
        :safe-right-padding="RIGHT_PANEL_WIDTH"
        @element-move="handleElementMove"
        @element-move-start="handleElementMoveStart"
        @element-move-end="handleElementMoveEnd"
        @element-select="handleElementSelect"
      />
    </section>

    <aside
      class="fixed right-0 top-0 z-30 flex h-screen min-h-0 w-[380px] flex-col border-l border-slate-700/70 bg-slate-900/88 p-3 backdrop-blur-sm"
    >
      <div class="mb-2 flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-800/70 px-3 py-2">
        <span class="text-xs text-slate-300">生成后自动聚焦</span>
        <button
          type="button"
          class="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-100 transition hover:border-slate-400"
          @click="autoFocusEnabled = !autoFocusEnabled"
        >
          {{ autoFocusEnabled ? "已开启" : "已关闭" }}
        </button>
      </div>
      <div class="mb-2 flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-800/70 px-3 py-2">
        <span class="text-xs text-slate-300">
          历史 {{ historyCounts.past }}/{{ historyCounts.future }}
        </span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!canUndo"
            @click="handleUndo"
          >
            撤销
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!canRedo"
            @click="handleRedo"
          >
            重做
          </button>
          <button
            type="button"
            class="rounded-md border border-rose-500/60 px-2 py-1 text-xs text-rose-100 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!selectedElementId"
            @click="handleRemoveSelected"
          >
            删除选中
          </button>
        </div>
      </div>
      <div
        class="mb-2 rounded-lg border border-slate-700/70 bg-slate-800/70 px-3 py-2 text-[11px] text-slate-300"
      >
        <div class="mb-1 text-slate-400">最近命令</div>
        <div v-if="recentCommands.length === 0" class="text-slate-500">暂无命令</div>
        <div v-else class="space-y-1">
          <div
            v-for="command in recentCommands"
            :key="command.id"
            class="truncate rounded border border-slate-700/70 bg-slate-900/60 px-2 py-1"
          >
            {{ command.type }}
          </div>
        </div>
      </div>
      <AiChatBox
        :messages="messages"
        :submitting="submitting"
        @submit="handlePromptSubmit"
        @add-to-canvas="addImageToCanvas"
      />
    </aside>
  </main>
</template>
