import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { ComposioService } from "./composio.service";

@Controller("composio/connections")
@UseGuards(AuthGuard)
export class ComposioController {
  constructor(private readonly composioService: ComposioService) {}

  @Get("accounts")
  async listAccounts(@Req() req: any) {
    if (!this.composioService.isConfigured()) {
      throw new HttpException("Composio is not configured", HttpStatus.SERVICE_UNAVAILABLE);
    }
    const accounts = await this.composioService.listConnectedAccounts(req.userId);
    return { accounts };
  }

  @Get("apps")
  async listApps() {
    if (!this.composioService.isConfigured()) {
      throw new HttpException("Composio is not configured", HttpStatus.SERVICE_UNAVAILABLE);
    }
    const apps = await this.composioService.listAvailableApps();
    return { apps };
  }

  @Get("apps/:slug")
  async getAppDetails(@Param("slug") slug: string) {
    if (!this.composioService.isConfigured()) {
      throw new HttpException("Composio is not configured", HttpStatus.SERVICE_UNAVAILABLE);
    }
    const details = await this.composioService.getAppDetails(slug);
    if (!details) {
      throw new HttpException("App not found", HttpStatus.NOT_FOUND);
    }
    return { app: details };
  }

  @Post("initiate")
  async initiateConnection(
    @Req() req: any,
    @Body() body: { appSlug: string; callbackUrl?: string }
  ) {
    if (!this.composioService.isConfigured()) {
      throw new HttpException("Composio is not configured", HttpStatus.SERVICE_UNAVAILABLE);
    }
    const result = await this.composioService.initiateAppConnection(req.userId, body.appSlug);
    if (!result) {
      throw new HttpException("Failed to initiate connection", HttpStatus.BAD_REQUEST);
    }
    return result;
  }

  @Delete(":accountId")
  async deleteConnection(@Param("accountId") accountId: string) {
    if (!this.composioService.isConfigured()) {
      throw new HttpException("Composio is not configured", HttpStatus.SERVICE_UNAVAILABLE);
    }
    await this.composioService.deleteConnection(accountId);
    return { success: true };
  }
}
