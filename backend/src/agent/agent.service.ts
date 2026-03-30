import { Injectable } from "@nestjs/common";
import {
  query,
  tool,
  createSdkMcpServer,
  type SDKMessage,
  type Query,
  type McpServerConfig,
  type SdkMcpToolDefinition,
  type AgentDefinition,
} from "@anthropic-ai/claude-agent-sdk";
import { PrismaService } from "../common/prisma.service";
import { ComposioService } from "../composio/composio.service";
import { isaacTools, type ToolContext } from "./isaac-mcp-tools";
import { getIsaacSystemPrompt } from "./isaac-system-prompt";
import { getBuiltinSubagents } from "./subagents";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_BUDGET_USD = 2.0;
const TEXT_GEN_MAX_BUDGET_USD = 0.5;

const AGENT_BUILTIN_TOOLS = [
  "Read",
  "Glob",
  "Grep",
  "Edit",
  "Bash",
  "WebSearch",
  "WebFetch",
  "Agent",
];

export interface AgentStreamEvent {
  type: "message" | "tool_use" | "tool_result" | "thinking" | "result" | "error" | "status";
  data: any;
}

export interface AgentQueryOptions {
  prompt: string;
  userId: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  planMode?: boolean;
  model?: string;
  maxTurns?: number;
  abortController?: AbortController;
}

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly composioService: ComposioService,
  ) {}

  private getModel(override?: string): string {
    return override || process.env.AGENT_CLAUDE_MODEL || DEFAULT_MODEL;
  }

  private stderrHandler(data: string): void {
    if (data.trim()) {
      console.error("[Isaac:AgentSDK]", data.trimEnd());
    }
  }

  // ============================================
  // Convert Isaac tools to SDK MCP tool format
  // ============================================

  private createIsaacMcpTools(context: ToolContext): SdkMcpToolDefinition<any>[] {
    return isaacTools.map((isaacTool) =>
      tool(
        isaacTool.name,
        isaacTool.description,
        isaacTool.inputSchema.shape,
        async (args: any, _extra: unknown) => {
          try {
            const result = await isaacTool.execute(args, context);
            return {
              content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
            };
          } catch (error: any) {
            return {
              content: [{ type: "text" as const, text: `Error: ${error.message}` }],
              isError: true,
            };
          }
        },
      ),
    );
  }

  // ============================================
  // Load user context for system prompt
  // ============================================

  private async getUserContext(userId: string) {
    const [skills, composioAccounts] = await Promise.all([
      this.prisma.userSkill
        .findMany({
          where: { userId },
          select: { id: true, name: true, description: true, content: true },
        })
        .catch(() => []),
      this.composioService.listConnectedAccounts(userId).catch(() => []),
    ]);

    return {
      userId,
      userSkills: skills,
      composioConnectedApps: composioAccounts,
    };
  }

  // ============================================
  // Main Agent Query (Async Generator)
  // ============================================

  async *runAgentQuery(options: AgentQueryOptions): AsyncGenerator<AgentStreamEvent> {
    const {
      prompt,
      userId,
      conversationHistory,
      planMode = false,
      model: modelOverride,
      maxTurns = 10,
      abortController,
    } = options;

    const model = this.getModel(modelOverride);

    try {
      const toolContext: ToolContext = {
        userId,
        prisma: this.prisma,
      };

      const isaacMcpServer = createSdkMcpServer({
        name: "isaac-tasks",
        version: "1.0.0",
        tools: this.createIsaacMcpTools(toolContext),
      });

      const composioUrl = await this.composioService.getComposioMcpUrl(userId);
      let composioMcpConfig: McpServerConfig | undefined;
      if (composioUrl) {
        composioMcpConfig = { type: "http", url: composioUrl };
      }

      const userContext = await this.getUserContext(userId);
      const systemPrompt = await getIsaacSystemPrompt(userContext);

      let fullPrompt = prompt;
      if (conversationHistory && conversationHistory.length > 0) {
        const historyText = conversationHistory
          .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
          .join("\n\n");
        fullPrompt = `Previous conversation:\n${historyText}\n\nCurrent request: ${prompt}`;
      }

      const mcpServers: Record<string, any> = {
        "isaac-tasks": isaacMcpServer,
        ...(composioMcpConfig ? { composio: composioMcpConfig } : {}),
      };
      const mcpServerNames = Object.keys(mcpServers);

      const allowedTools = [
        ...AGENT_BUILTIN_TOOLS,
        ...mcpServerNames.map((name) => `mcp__${name}__*`),
      ];

      const permissionMode = planMode ? "plan" : "bypassPermissions";

      const result: Query = query({
        prompt: fullPrompt,
        options: {
          model,
          systemPrompt,
          permissionMode,
          allowDangerouslySkipPermissions: !planMode,
          mcpServers,
          tools: AGENT_BUILTIN_TOOLS,
          allowedTools,
          agents: getBuiltinSubagents(mcpServerNames),
          maxTurns,
          maxBudgetUsd: DEFAULT_MAX_BUDGET_USD,
          persistSession: false,
          abortController,
          includePartialMessages: true,
          stderr: this.stderrHandler,
        },
      });

      for await (const message of result) {
        yield* this.processSDKMessage(message);
      }
    } catch (error: any) {
      console.error("[Isaac:AgentService] runAgentQuery failed:", error);
      yield {
        type: "error",
        data: { message: error.message, stack: error.stack },
      };
    }
  }

  // ============================================
  // Simple Text Generation (no tools)
  // ============================================

  async generateTextWithSystemPrompt(options: {
    systemPrompt: string;
    userPrompt: string;
    images?: Array<{ base64: string; mediaType: string }>;
    model?: string;
  }): Promise<{ text: string }> {
    const model = this.getModel(options.model);

    const hasImages = options.images && options.images.length > 0;

    let promptInput: string | AsyncIterable<any>;

    if (hasImages) {
      const contentBlocks: any[] = [];
      for (const img of options.images!) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mediaType,
            data: img.base64,
          },
        });
      }
      contentBlocks.push({ type: "text", text: options.userPrompt });

      const msg = {
        type: "user" as const,
        message: { role: "user" as const, content: contentBlocks },
        parent_tool_use_id: null,
        session_id: "",
      };
      async function* streamPrompt() {
        yield msg;
      }
      promptInput = streamPrompt();
    } else {
      promptInput = options.userPrompt;
    }

    try {
      const result = query({
        prompt: promptInput,
        options: {
          model,
          systemPrompt: options.systemPrompt,
          permissionMode: "bypassPermissions",
          allowDangerouslySkipPermissions: true,
          tools: [],
          maxTurns: 1,
          maxBudgetUsd: TEXT_GEN_MAX_BUDGET_USD,
          persistSession: false,
          stderr: this.stderrHandler,
        },
      });

      let text = "";
      for await (const message of result) {
        if (message.type === "assistant" && message.message?.content) {
          for (const block of message.message.content) {
            if (block.type === "text") text += block.text;
          }
        }
        if (message.type === "result") {
          const r = message as any;
          if (r.subtype === "success" && typeof r.result === "string") {
            text = r.result;
          }
          break;
        }
      }
      return { text };
    } catch (error) {
      console.error("[Isaac:AgentService] generateTextWithSystemPrompt failed:", error);
      return { text: "" };
    }
  }

  // ============================================
  // Non-Streaming Wrapper
  // ============================================

  async simpleAgentQuery(options: AgentQueryOptions): Promise<{
    success: boolean;
    result?: string;
    error?: string;
    usage?: any;
    cost?: number;
  }> {
    let resultText = "";

    for await (const event of this.runAgentQuery(options)) {
      if (event.type === "message" && !event.data.partial) {
        resultText += event.data.text || "";
      }

      if (event.type === "result") {
        return {
          success: event.data.success,
          result: event.data.result || resultText,
          error: event.data.error,
          usage: event.data.usage,
          cost: event.data.cost,
        };
      }

      if (event.type === "error") {
        return {
          success: false,
          error: event.data.message,
        };
      }
    }

    return {
      success: true,
      result: resultText,
    };
  }

  // ============================================
  // Process SDK Messages into Stream Events
  // ============================================

  private *processSDKMessage(message: SDKMessage): Generator<AgentStreamEvent> {
    switch (message.type) {
      case "assistant": {
        const content = message.message.content;
        for (const block of content) {
          if (block.type === "text") {
            yield { type: "message", data: { text: block.text } };
          } else if (block.type === "tool_use") {
            yield {
              type: "tool_use",
              data: {
                id: block.id,
                name: block.name,
                input: block.input,
              },
            };
          } else if (block.type === "thinking") {
            yield { type: "thinking", data: { thinking: (block as any).thinking } };
          }
        }
        break;
      }

      case "stream_event": {
        const event = message.event;
        if (event.type === "content_block_delta") {
          const delta = event.delta as any;
          if (delta.type === "text_delta") {
            yield { type: "message", data: { text: delta.text, partial: true } };
          } else if (delta.type === "thinking_delta") {
            yield { type: "thinking", data: { thinking: delta.thinking, partial: true } };
          }
        }
        break;
      }

      case "result":
        yield {
          type: "result",
          data: {
            success: message.subtype === "success",
            result: message.subtype === "success" ? (message as any).result : null,
            error: message.subtype !== "success" ? message.subtype : null,
            usage: message.usage,
            cost: message.total_cost_usd,
            turns: message.num_turns,
          },
        };
        break;

      case "system":
        if (message.subtype === "init") {
          yield {
            type: "status",
            data: {
              status: "initialized",
              tools: message.tools,
              model: message.model,
              mcpServers: message.mcp_servers,
            },
          };
        } else if (message.subtype === "status") {
          yield {
            type: "status",
            data: { status: message.status },
          };
        }
        break;

      case "tool_progress":
        yield {
          type: "tool_result",
          data: {
            toolName: message.tool_name,
            toolUseId: message.tool_use_id,
            elapsed: message.elapsed_time_seconds,
            inProgress: true,
          },
        };
        break;

      case "user":
        if (message.tool_use_result !== undefined) {
          yield {
            type: "tool_result",
            data: {
              result: message.tool_use_result,
              inProgress: false,
            },
          };
        }
        break;
    }
  }
}
