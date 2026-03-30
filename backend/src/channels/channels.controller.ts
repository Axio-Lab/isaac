import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  Res,
  Sse,
  UseGuards,
  HttpCode,
  MessageEvent,
} from "@nestjs/common";
import { Response } from "express";
import { Observable, map, takeWhile } from "rxjs";
import { AuthGuard } from "../auth/auth.guard";
import { ChannelsService } from "./channels.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { ChatPlatform } from "@prisma/client";

@Controller("task-channels")
@UseGuards(AuthGuard)
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly whatsappService: WhatsAppService
  ) {}

  @Get()
  async listChannels(@Req() req: any) {
    return this.channelsService.listChannels(req.userId);
  }

  @Post()
  async createChannel(
    @Req() req: any,
    @Body()
    body: {
      label: string;
      platform: ChatPlatform;
      telegramBotToken?: string;
      telegramBotUsername?: string;
      slackBotToken?: string;
      slackSigningSecret?: string;
      slackTeamId?: string;
      slackChannelId?: string;
      discordBotToken?: string;
      discordGuildId?: string;
      discordChannelId?: string;
      webhookUrl?: string;
      sharedSecret?: string;
    }
  ) {
    const channel = await this.channelsService.createChannel(req.userId, body);

    if (body.platform === ChatPlatform.WHATSAPP) {
      this.whatsappService.startSession(channel.id).catch(() => {});
    }

    return channel;
  }

  @Get("active")
  async listActiveChannels(@Req() req: any) {
    const channels = await this.channelsService.listChannels(req.userId);
    return channels.filter((ch) => ch.status === "connected");
  }

  @Sse(":id/qr")
  qrStream(@Req() req: any, @Param("id") id: string): Observable<MessageEvent> {
    this.whatsappService.ensureSession(id).catch((err) => {
      console.error("Failed to start WhatsApp session for SSE", err);
    });

    return this.whatsappService.getQrObservable(id).pipe(
      takeWhile((evt) => evt.type !== "close", true),
      map((evt): MessageEvent => {
        if (evt.type === "close") {
          return { type: "close", data: "{}" };
        }
        return { type: evt.type, data: JSON.stringify(evt) };
      })
    );
  }

  @Get(":id")
  async getChannel(@Req() req: any, @Param("id") id: string) {
    return this.channelsService.getChannel(req.userId, id);
  }

  @Put(":id")
  async updateChannel(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.channelsService.updateChannel(req.userId, id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteChannel(@Req() req: any, @Param("id") id: string, @Res() res: Response) {
    await this.channelsService.deleteChannel(req.userId, id);
    res.status(204).send();
  }

  @Post(":id/disconnect")
  async disconnectChannel(@Req() req: any, @Param("id") id: string) {
    return this.channelsService.disconnectChannel(req.userId, id);
  }

  @Post(":id/test")
  async testChannel(@Req() req: any, @Param("id") id: string) {
    return this.channelsService.testChannel(req.userId, id);
  }

  @Post(":id/refresh")
  async refreshChannel(@Req() req: any, @Param("id") id: string) {
    return this.channelsService.refreshChannel(req.userId, id);
  }
}
