import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/common/prisma.service";
import { AgentService } from "@/agent/agent.service";
import { ReportDeliveryService } from "@/reports/report-delivery.service";

@Injectable()
export class AutomatedTaskRunnerService {
  private readonly logger = new Logger(AutomatedTaskRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: AgentService,
    private readonly reportDelivery: ReportDeliveryService,
  ) {}

  async execute(
    task: { id: string; userId: string; name: string; prompt: string; deliveryConfig?: any },
    triggeredBy: "SCHEDULE" | "ON_DEMAND" | "CHAT",
  ): Promise<{ runId: string; status: string; result?: string; error?: string }> {
    const run = await (this.prisma as any).automatedTaskRun.create({
      data: {
        automatedTaskId: task.id,
        triggeredBy,
        status: "RUNNING",
      },
    });

    this.logger.log(`Started automated task run ${run.id} for "${task.name}" (${triggeredBy})`);

    try {
      const agentResult = await this.agentService.simpleAgentQuery({
        prompt: task.prompt,
        userId: task.userId,
        maxTurns: 15,
      });

      if (!agentResult.success) {
        throw new Error(agentResult.error || "Agent query failed");
      }

      const resultText = agentResult.result || "";

      await (this.prisma as any).automatedTaskRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          result: resultText,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Automated task run ${run.id} completed for "${task.name}"`);

      await this.deliverResult(task, resultText).catch((err) =>
        this.logger.warn(`Delivery failed for run ${run.id}: ${err.message}`),
      );

      return { runId: run.id, status: "COMPLETED", result: resultText };
    } catch (err: any) {
      await (this.prisma as any).automatedTaskRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          error: err.message,
          completedAt: new Date(),
        },
      });

      this.logger.error(`Automated task run ${run.id} failed: ${err.message}`);
      return { runId: run.id, status: "FAILED", error: err.message };
    }
  }

  private async deliverResult(task: any, resultText: string): Promise<void> {
    const dc = (task.deliveryConfig ?? {}) as Record<string, unknown>;
    const destinations = (dc.destinations ?? []) as Array<{
      type: string;
      channelId: string;
      channelName?: string;
    }>;

    if (destinations.length === 0) return;

    const destTypes = destinations.map((d) => d.type as any);
    const deliveryConfig: Record<string, string | undefined> = {};
    for (const d of destinations) {
      if (d.type === "telegram") deliveryConfig.telegramChatId = d.channelId;
      if (d.type === "slack") deliveryConfig.slackChannelId = d.channelId;
      if (d.type === "discord") deliveryConfig.discordChannelId = d.channelId;
      if (d.type === "whatsapp") deliveryConfig.whatsappNumber = d.channelId;
      if (d.type === "gmail") deliveryConfig.recipientEmail = d.channelId;
    }

    const summary =
      `📋 *Automated Report: ${task.name}*\n\n` +
      (resultText.length > 3000 ? resultText.slice(0, 3000) + "\n\n…(truncated)" : resultText);

    const results = await this.reportDelivery.deliverToDestinations(
      destTypes,
      summary,
      null,
      task.userId,
      deliveryConfig,
    );

    this.logger.log(`Delivery results for task ${task.id}: ${JSON.stringify(results)}`);
  }
}
