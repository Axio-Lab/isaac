import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@/auth/auth.guard";
import { AutomatedTasksService } from "./automated-tasks.service";
import { AutomatedTaskRunnerService } from "./automated-task-runner.service";

@Controller("automated-tasks")
@UseGuards(AuthGuard)
export class AutomatedTasksController {
  constructor(
    private readonly service: AutomatedTasksService,
    private readonly runner: AutomatedTaskRunnerService,
  ) {}

  @Get()
  async list(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.list(
      req.userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get(":id")
  async get(@Req() req: any, @Param("id") id: string) {
    const task = await this.service.get(req.userId, id);
    return { task };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    const task = await this.service.create(req.userId, body);
    return { task };
  }

  @Patch(":id")
  async update(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    const task = await this.service.update(req.userId, id, body);
    return { task };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Req() req: any, @Param("id") id: string) {
    await this.service.delete(req.userId, id);
  }

  @Post(":id/activate")
  @HttpCode(HttpStatus.OK)
  async activate(@Req() req: any, @Param("id") id: string) {
    const task = await this.service.activate(req.userId, id);
    return { task };
  }

  @Post(":id/run")
  async run(@Req() req: any, @Param("id") id: string) {
    const task = await this.service.get(req.userId, id);
    if (task.status === "ARCHIVED") {
      throw new BadRequestException(
        "Cannot run an archived automated task — reactivate it first",
      );
    }
    const result = await this.runner.execute(task, "ON_DEMAND");
    return result;
  }

  @Get(":id/runs")
  async listRuns(@Req() req: any, @Param("id") id: string) {
    await this.service.get(req.userId, id);
    const runs = await this.service.listRuns(id);
    return { runs };
  }
}
