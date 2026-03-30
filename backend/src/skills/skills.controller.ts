import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { Response } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { SkillsService } from "./skills.service";

@Controller("skills")
@UseGuards(AuthGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  async listSkills(@Req() req: any, @Query("page") page?: string, @Query("limit") limit?: string) {
    return this.skillsService.getSkills(
      req.userId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined
    );
  }

  @Post()
  async createSkill(
    @Req() req: any,
    @Body() body: { name: string; description?: string; url?: string; content?: string }
  ) {
    return this.skillsService.createSkill({
      userId: req.userId,
      ...body,
    });
  }

  @Get(":id")
  async getSkill(@Req() req: any, @Param("id") id: string) {
    return this.skillsService.getSkill(req.userId, id);
  }

  @Put(":id")
  async updateSkill(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: Partial<{ name: string; description: string; url: string; content: string }>
  ) {
    return this.skillsService.updateSkill(req.userId, id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteSkill(@Req() req: any, @Param("id") id: string, @Res() res: Response) {
    await this.skillsService.deleteSkill(req.userId, id);
    res.status(204).send();
  }
}
