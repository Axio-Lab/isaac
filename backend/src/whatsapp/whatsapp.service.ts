import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { ReplaySubject, Observable } from "rxjs";
import {
  makeWASocket,
  initAuthCreds,
  proto,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  WASocket,
  DisconnectReason,
  BufferJSON,
} from "baileys";
import * as QRCode from "qrcode";
import pino from "pino";

/** Baileys uses Pino; Nest `Logger` is not compatible (missing `.trace`). Set `WHATSAPP_BAILEYS_LOG=1` to see Baileys JSON logs. */
const baileysLogger = pino({
  level:
    process.env.WHATSAPP_BAILEYS_LOG === "1" ||
    process.env.WHATSAPP_BAILEYS_LOG === "debug"
      ? "info"
      : "silent",
});

export type QrEvent =
  | { type: "qr"; data: string }
  | { type: "connected"; phoneNumber: string }
  | { type: "error"; message: string }
  | { type: "close" };

export type WhatsAppMessageHandler = (params: {
  channelId: string;
  senderJid: string;
  text?: string;
  imageUrl?: string;
}) => void;

@Injectable()
export class WhatsAppService implements OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly sessions = new Map<string, WASocket>();
  private readonly subjects = new Map<string, ReplaySubject<QrEvent>>();
  private onMessage: WhatsAppMessageHandler | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a handler for incoming messages (called by ChannelsModule at bootstrap).
   */
  setMessageHandler(handler: WhatsAppMessageHandler) {
    this.onMessage = handler;
  }

  private get db(): PrismaClient {
    return this.prisma as unknown as PrismaClient;
  }

  onModuleDestroy() {
    for (const [channelId, sock] of this.sessions) {
      try {
        sock.end(undefined);
      } catch {
        this.logger.warn(`Failed to close session for ${channelId}`);
      }
    }
    this.sessions.clear();
    for (const sub of this.subjects.values()) {
      sub.complete();
    }
    this.subjects.clear();
  }

  getQrObservable(channelId: string): Observable<QrEvent> {
    let subject = this.subjects.get(channelId);
    if (!subject) {
      subject = new ReplaySubject<QrEvent>(1);
      this.subjects.set(channelId, subject);
    }
    return subject.asObservable();
  }

  /**
   * Ensure a session is running for the given channel.
   * Safe to call multiple times — only starts if not already active.
   */
  async ensureSession(channelId: string): Promise<void> {
    if (this.sessions.has(channelId)) return;
    await this.startSession(channelId);
  }

  async startSession(channelId: string): Promise<void> {
    if (this.sessions.has(channelId)) {
      this.logger.warn(`Session for ${channelId} already exists, closing old one`);
      try {
        this.sessions.get(channelId)!.end(undefined);
      } catch {}
      this.sessions.delete(channelId);
    }

    let subject = this.subjects.get(channelId);
    if (!subject) {
      subject = new ReplaySubject<QrEvent>(1);
      this.subjects.set(channelId, subject);
    }

    const { state, saveCreds } = await this.usePrismaAuthState(channelId);

    let version: [number, number, number] | undefined;
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
      this.logger.log(`Using WA version ${version.join(".")}`);
    } catch {
      this.logger.warn("Could not fetch latest WA version, using default");
    }

    const sock = makeWASocket({
      logger: baileysLogger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      version,
      printQRInTerminal: false,
      browser: ["Isaac", "Chrome", "22.04"],
      connectTimeoutMs: 60_000,
      qrTimeout: 60_000,
    });

    this.sessions.set(channelId, sock);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
          subject!.next({ type: "qr", data: dataUrl });
          this.logger.log(`QR code emitted for ${channelId}`);
        } catch (err) {
          this.logger.error("QR generation error", err);
        }
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        this.sessions.delete(channelId);

        if (statusCode === DisconnectReason.loggedOut) {
          this.logger.log(`Session ${channelId} logged out`);
          await this.clearAuthState(channelId);
          await this.db.taskChannel.update({
            where: { id: channelId },
            data: { status: "pending", whatsappNumber: null },
          });
          subject!.next({ type: "error", message: "Logged out from WhatsApp" });
          subject!.next({ type: "close" });
        } else if (
          statusCode === DisconnectReason.restartRequired ||
          statusCode === DisconnectReason.connectionClosed ||
          statusCode === DisconnectReason.timedOut
        ) {
          this.logger.log(`Session ${channelId} needs restart (code ${statusCode}), retrying...`);
          await new Promise((r) => setTimeout(r, 2000));
          try {
            await this.startSession(channelId);
          } catch (err: any) {
            this.logger.error(`Retry failed for ${channelId}`, err);
            subject!.next({ type: "error", message: "Reconnection failed. Try again." });
            subject!.next({ type: "close" });
          }
        } else {
          this.logger.warn(`Session ${channelId} closed with code ${statusCode}`);
          await new Promise((r) => setTimeout(r, 3000));
          try {
            await this.startSession(channelId);
          } catch (err: any) {
            this.logger.error(`Retry failed for ${channelId}`, err);
            subject!.next({ type: "error", message: `Connection failed (code ${statusCode}). Try again.` });
            subject!.next({ type: "close" });
          }
        }
      }

      if (connection === "open") {
        const me = sock.user;
        const phoneNumber = me?.id?.split(":")[0]?.split("@")[0] ?? "unknown";
        this.logger.log(`Session ${channelId} connected as ${phoneNumber}`);

        await this.db.taskChannel.update({
          where: { id: channelId },
          data: { status: "connected", whatsappNumber: phoneNumber },
        });

        subject!.next({ type: "connected", phoneNumber });
        subject!.next({ type: "close" });
      }
    });

    sock.ev.on("messages.upsert", async ({ messages: msgs }) => {
      if (!this.onMessage) return;
      for (const msg of msgs) {
        if (msg.key.fromMe) continue;
        const senderJid = msg.key.remoteJid;
        if (!senderJid || senderJid === "status@broadcast") continue;

        const text =
          msg.message?.conversation ??
          msg.message?.extendedTextMessage?.text ??
          msg.message?.imageMessage?.caption ??
          undefined;

        let imageUrl: string | undefined;
        if (msg.message?.imageMessage) {
          imageUrl = msg.message.imageMessage.url ?? undefined;
        }

        try {
          this.onMessage({ channelId, senderJid, text, imageUrl });
        } catch (err) {
          this.logger.error("WhatsApp message handler error", err);
        }
      }
    });
  }

  async sendTestMessage(channelId: string): Promise<{ success: boolean; message: string }> {
    const sock = this.sessions.get(channelId);
    if (!sock) {
      const channel = await this.db.taskChannel.findUnique({
        where: { id: channelId },
      });
      if (channel?.status === "connected" && channel.whatsappNumber) {
        await this.startSession(channelId);
        const restarted = this.sessions.get(channelId);
        if (!restarted) {
          return { success: false, message: "Could not restart WhatsApp session" };
        }
        await new Promise((r) => setTimeout(r, 3000));
        return this.doSendTest(restarted, channel.whatsappNumber);
      }
      return { success: false, message: "No active WhatsApp session. Reconnect first." };
    }

    const channel = await this.db.taskChannel.findUnique({
      where: { id: channelId },
    });
    const phone = channel?.whatsappNumber ?? sock.user?.id?.split(":")[0]?.split("@")[0];
    if (!phone) {
      return { success: false, message: "No phone number found" };
    }
    return this.doSendTest(sock, phone);
  }

  private async doSendTest(sock: WASocket, phone: string): Promise<{ success: boolean; message: string }> {
    try {
      const jid = `${phone}@s.whatsapp.net`;
      await sock.sendMessage(jid, {
        text: "Isaac — connection test. You can ignore this message.",
      });
      return { success: true, message: `Test message sent to +${phone}` };
    } catch (err: any) {
      this.logger.error("WhatsApp sendTest error", err);
      return { success: false, message: err.message || "Failed to send test message" };
    }
  }

  /**
   * Send a text message to an arbitrary JID through a connected session.
   */
  async sendMessage(
    channelId: string,
    jid: string,
    text: string,
  ): Promise<void> {
    let sock = this.sessions.get(channelId);
    if (!sock) {
      const channel = await this.db.taskChannel.findUnique({
        where: { id: channelId },
      });
      if (channel?.status !== "connected") {
        throw new Error("WhatsApp session is not connected");
      }
      await this.startSession(channelId);
      await new Promise((r) => setTimeout(r, 3000));
      sock = this.sessions.get(channelId);
      if (!sock) throw new Error("Could not restart WhatsApp session");
    }
    await sock.sendMessage(jid, { text });
  }

  async disconnectSession(channelId: string): Promise<void> {
    const sock = this.sessions.get(channelId);
    if (sock) {
      try {
        await sock.logout();
      } catch {}
      try {
        sock.end(undefined);
      } catch {}
      this.sessions.delete(channelId);
    }

    await this.clearAuthState(channelId);

    await this.db.taskChannel.update({
      where: { id: channelId },
      data: { status: "pending", whatsappNumber: null },
    });
  }

  async refreshSession(channelId: string): Promise<{ status: string; whatsappNumber?: string }> {
    const channel = await this.db.taskChannel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      return { status: "not_found" };
    }

    const hasStoredCreds = await this.db.whatsAppAuthState.count({
      where: { channelId, key: "creds" },
    });

    if (!hasStoredCreds) {
      return { status: "no_creds" };
    }

    if (!this.sessions.has(channelId)) {
      await this.startSession(channelId);
    }

    return {
      status: "reconnecting",
      whatsappNumber: channel.whatsappNumber ?? undefined,
    };
  }

  // ---------- Prisma-backed auth state ----------

  private async usePrismaAuthState(channelId: string) {
    const readData = async (key: string): Promise<any> => {
      const row = await this.db.whatsAppAuthState.findUnique({
        where: { channelId_key: { channelId, key } },
      });
      if (!row) return null;
      return JSON.parse(row.value, BufferJSON.reviver);
    };

    const writeData = async (key: string, value: any): Promise<void> => {
      const serialized = JSON.stringify(value, BufferJSON.replacer);
      await this.db.whatsAppAuthState.upsert({
        where: { channelId_key: { channelId, key } },
        update: { value: serialized },
        create: { channelId, key, value: serialized },
      });
    };

    const removeData = async (key: string): Promise<void> => {
      await this.db.whatsAppAuthState.deleteMany({
        where: { channelId, key },
      });
    };

    const creds = (await readData("creds")) || initAuthCreds();

    const keys = {
      get: async (type: string, ids: string[]) => {
        const result: Record<string, any> = {};
        for (const id of ids) {
          const val = await readData(`${type}-${id}`);
          if (val) {
            if (type === "app-state-sync-key") {
              result[id] = proto.Message.AppStateSyncKeyData.fromObject(val);
            } else {
              result[id] = val;
            }
          }
        }
        return result;
      },
      set: async (data: Record<string, Record<string, any>>) => {
        for (const [type, entries] of Object.entries(data)) {
          for (const [id, value] of Object.entries(entries)) {
            const key = `${type}-${id}`;
            if (value) {
              await writeData(key, value);
            } else {
              await removeData(key);
            }
          }
        }
      },
    };

    return {
      state: { creds, keys },
      saveCreds: async () => {
        await writeData("creds", creds);
      },
    };
  }

  private async clearAuthState(channelId: string): Promise<void> {
    await this.db.whatsAppAuthState.deleteMany({ where: { channelId } });
  }
}
