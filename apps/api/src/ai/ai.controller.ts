import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { GenerateImageDto } from './dto/generate-image.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  generate(@Body() body: GenerateImageDto) {
    return this.aiService.generate(body);
  }

  @Post('chat/stream')
  async chatStream(@Body() body: GenerateImageDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const events = this.aiService.buildMockStreamEvents(body);
    const send = (eventName: string, data: unknown) => {
      if (res.writableEnded) return;
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send('open', { ok: true });

    for (const event of events) {
      if (event.type === 'thinking') {
        await this.sleep(500);
      } else if (event.type === 'image') {
        await this.sleep(1800);
      }
      send('message', event);
    }

    if (!res.writableEnded) {
      res.end();
    }
  }

  @Get('image-proxy')
  async imageProxy(@Query('url') rawUrl: string | undefined, @Res() res: Response) {
    if (!rawUrl) {
      throw new BadRequestException('Missing url query parameter');
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid url');
    }

    if (parsed.protocol !== 'https:') {
      throw new BadRequestException('Only https image urls are allowed');
    }

    const upstream = await fetch(parsed.toString());
    if (!upstream.ok) {
      throw new BadRequestException(`Upstream image fetch failed: ${upstream.status}`);
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(buffer);
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
