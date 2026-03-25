import type { AiChatStreamEvent, AiGenerationRequest } from "@dreamer/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function parseSseChunks(buffer: string) {
  const frames = buffer.split("\n\n");
  return {
    completeFrames: frames.slice(0, -1),
    remain: frames[frames.length - 1] ?? "",
  };
}

function parseSseFrame(frame: string) {
  const lines = frame.split("\n");
  let eventName = "message";
  const dataParts: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataParts.push(line.slice(5).trim());
    }
  }

  if (dataParts.length === 0) return null;

  return {
    eventName,
    dataText: dataParts.join("\n"),
  };
}

export async function streamAiChat(
  request: AiGenerationRequest,
  onEvent: (event: AiChatStreamEvent) => void,
) {
  const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`SSE request failed: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("SSE response body is empty.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let remain = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    remain += decoder.decode(value, { stream: true });

    const { completeFrames, remain: nextRemain } = parseSseChunks(remain);
    remain = nextRemain;

    for (const frame of completeFrames) {
      const parsed = parseSseFrame(frame);
      if (!parsed || parsed.eventName !== "message") continue;
      try {
        const event = JSON.parse(parsed.dataText) as AiChatStreamEvent;
        onEvent(event);
      } catch {
        continue;
      }
    }
  }
}
