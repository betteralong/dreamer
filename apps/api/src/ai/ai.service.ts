import { Injectable } from "@nestjs/common";
import type {
  AiChatStreamEvent,
  AiGenerationRequest,
  AiGenerationResponse,
} from "@dreamer/shared";
import { GenerateImageDto } from "./dto/generate-image.dto";

const MOCK_IMAGE_POOL = [
  "https://cdn.dancf.com/fe-assets/20260325/fc7f3165f563557c70b160df03c1ce89.jpg",
  "https://cdn.dancf.com/fe-assets/20260325/8a3dfb9f58b4edda6c2bc2c9578bc353.png",
] as const;

@Injectable()
export class AiService {
  generate(body: GenerateImageDto): AiGenerationResponse {
    const request: AiGenerationRequest = {
      prompt: body.prompt,
      sessionId: body.sessionId,
    };

    return {
      id: crypto.randomUUID(),
      status: "not_implemented",
      message: `AI provider not configured yet. Prompt received: ${request.prompt}`,
    };
  }

  buildMockStreamEvents(_body: GenerateImageDto): AiChatStreamEvent[] {
    const imageUrl =
      MOCK_IMAGE_POOL[Math.floor(Math.random() * MOCK_IMAGE_POOL.length)];

    return [
      {
        type: "thinking",
        content: "正在努力思考中...",
      },
      {
        type: "image",
        id: crypto.randomUUID(),
        imageUrl,
        content: "已完成生成，给你一张灵感图。",
      },
      {
        type: "done",
      },
    ];
  }
}
