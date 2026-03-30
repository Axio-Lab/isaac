import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Composio } from "@composio/core";

/** Toolkits that cannot use OAuth / “Connect” (e.g. built-in Composio router). */
const CONNECT_EXCLUDED_TOOLKIT_SLUGS = new Set(["composio"]);

@Injectable()
export class ComposioService {
  private readonly logger = new Logger(ComposioService.name);
  private client: Composio | null = null;

  private getClient(): Composio | null {
    if (this.client) return this.client;
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) return null;
    this.client = new Composio({ apiKey });
    return this.client;
  }

  private requireClient(): Composio {
    const client = this.getClient();
    if (!client) {
      throw new Error("Composio is not configured. Set COMPOSIO_API_KEY.");
    }
    return client;
  }

  isConfigured(): boolean {
    return !!process.env.COMPOSIO_API_KEY;
  }

  async getComposioMcpUrl(userId: string): Promise<string | null> {
    try {
      const client = this.getClient();
      if (!client) return null;
      const session = await (client as any).create(userId);
      return session?.mcp?.url || null;
    } catch (error) {
      this.logger.error(`Failed to get MCP URL for user ${userId}`, error);
      return null;
    }
  }

  async listConnectedAccounts(userId: string): Promise<any[]> {
    const client = this.getClient();
    if (!client) return [];
    try {
      const response = await client.connectedAccounts.list({
        userIds: [userId],
        statuses: ["ACTIVE"],
      });
      return ((response as any).items || []).map((item: any) => ({
        id: item.id,
        appName: item.toolkit?.slug || item.appName || "unknown",
        status: item.status || "UNKNOWN",
        createdAt: item.createdAt,
      }));
    } catch (error) {
      this.logger.error("Failed to list connected accounts", error);
      return [];
    }
  }

  async listAvailableApps(): Promise<any[]> {
    const client = this.requireClient();
    try {
      const response: any = await (client as any).toolkits.get({ limit: 2000 });
      const items = Array.from(response || []);
      return items
        .map((item: any) => ({
          slug: item.slug,
          name: item.name,
          description: item.meta?.description || item.description || "",
          logo: item.meta?.logo || item.logo || null,
          categories: (item.meta?.categories || []).map((c: any) =>
            typeof c === "string" ? c : c.name || c.slug
          ),
          noAuth: !!item.noAuth,
        }))
        .filter((app) => {
          if (app.noAuth) return false;
          const slug = String(app.slug || "").toLowerCase();
          if (CONNECT_EXCLUDED_TOOLKIT_SLUGS.has(slug)) return false;
          return true;
        });
    } catch (error) {
      this.logger.error("Failed to list available apps", error);
      return [];
    }
  }

  async getAppDetails(appSlug: string): Promise<any> {
    const client = this.requireClient();
    try {
      const toolkit: any = await (client as any).toolkits.get(appSlug);
      const toolkitSlug = String(toolkit?.slug || appSlug).toLowerCase();

      let toolItems: any[] = [];
      try {
        toolItems = await (client as any).tools?.getRawComposioTools?.({
          toolkits: [toolkitSlug],
          limit: 1000,
          important: false,
        });
      } catch {
        toolItems = [];
      }

      return {
        slug: toolkit?.slug || appSlug,
        name: toolkit?.name || appSlug,
        description: toolkit?.meta?.description || toolkit?.description || "",
        logo: toolkit?.meta?.logo || toolkit?.logo || null,
        categories: toolkit?.meta?.categories || toolkit?.categories || [],
        actions: (toolItems || []).map((t: any) => ({
          name: t.name || t.slug,
          description: t.description || "",
        })),
        triggers: [],
      };
    } catch (error) {
      this.logger.error(`Failed to get app details: ${appSlug}`, error);
      return null;
    }
  }

  async initiateAppConnection(
    userId: string,
    appSlug: string
  ): Promise<{ redirectUrl: string | null; connectionId: string }> {
    const client = this.requireClient();
    const slugLower = appSlug.toLowerCase();
    if (CONNECT_EXCLUDED_TOOLKIT_SLUGS.has(slugLower)) {
      throw new BadRequestException("This toolkit does not require a connection.");
    }

    try {
      const toolkit: any = await (client as any).toolkits.get(appSlug);
      if (toolkit?.noAuth) {
        throw new BadRequestException("This toolkit does not require a connection.");
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.warn(`Could not verify toolkit before connect: ${appSlug}`, e);
    }

    const appBaseUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
    const callbackUrl = `${appBaseUrl}/connected-apps`;

    const session: any = await (client as any).create(userId, {
      manageConnections: false,
    });

    const connectionRequest = await session.authorize(appSlug.toLowerCase(), {
      callbackUrl,
    });

    return {
      redirectUrl: connectionRequest.redirectUrl || null,
      connectionId: connectionRequest.id,
    };
  }

  async deleteConnection(accountId: string): Promise<void> {
    const client = this.requireClient();
    await client.connectedAccounts.delete(accountId);
  }

  async executeComposioAction(
    userId: string,
    actionName: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    const client = this.requireClient();
    const slug = actionName.toUpperCase();
    try {
      return await (client as any).tools.execute(slug, {
        userId,
        arguments: params,
        dangerouslySkipVersionCheck: true,
      });
    } catch (error: any) {
      this.logger.error(`Action "${slug}" failed for user ${userId}`, error);
      throw error;
    }
  }
}
