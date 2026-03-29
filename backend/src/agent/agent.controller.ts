import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { AgentService, type AgentStreamEvent } from "./agent.service";
import { PrismaService } from "../common/prisma.service";

interface ChatRequestBody {
  prompt: string;
  planMode?: boolean;
  conversationHistory?: Array<{ role: string; content: string }>;
}

@Controller("agent")
@UseGuards(AuthGuard)
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("chat")
  async chat(
    @Body() body: ChatRequestBody,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const userId = (req as any).userId;

    if (!body.prompt || typeof body.prompt !== "string") {
      throw new HttpException("prompt is required", HttpStatus.BAD_REQUEST);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const abortController = new AbortController();

    req.on("close", () => {
      abortController.abort();
    });

    try {
      const stream = this.agentService.runAgentQuery({
        prompt: body.prompt,
        userId,
        conversationHistory: body.conversationHistory,
        planMode: body.planMode ?? false,
        abortController,
      });

      for await (const event of stream) {
        if (abortController.signal.aborted) break;
        this.writeSSE(res, event);
      }

      this.writeSSE(res, { type: "status", data: { status: "done" } });
    } catch (error: any) {
      if (!abortController.signal.aborted) {
        this.writeSSE(res, {
          type: "error",
          data: { message: error.message || "Internal server error" },
        });
      }
    } finally {
      res.end();
    }
  }

  @Get("history/:sessionId")
  async getHistory(
    @Param("sessionId") sessionId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).userId;

    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return { sessionId, messages };
  }

  private writeSSE(res: Response, event: AgentStreamEvent): void {
    const data = JSON.stringify(event);
    res.write(`event: ${event.type}\ndata: ${data}\n\n`);
  }
}
