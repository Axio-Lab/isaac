"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Info } from "lucide-react";
import type { ChannelFormData } from "./channel-utils";
import { CHANNEL_PLATFORMS } from "./channel-utils";

const inputClass =
  "w-full px-3 py-2 border border-input rounded-lg text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const labelClass = "block text-[11px] font-medium text-muted-foreground mb-1";
const hintClass = "text-[10px] text-muted-foreground mt-1";

interface ChannelDialogFormProps {
  form: ChannelFormData;
  setForm: React.Dispatch<React.SetStateAction<ChannelFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  isEdit: boolean;
  isWhatsApp: boolean;
}

function StoredTokenMask() {
  return (
    <div
      className="w-full px-3 py-2 border border-input rounded-lg text-xs font-mono tracking-[0.25em] bg-muted/50 text-muted-foreground select-none"
      aria-hidden
    >
      {"•".repeat(32)}
    </div>
  );
}

function PlatformHint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1.5 mt-2 px-2.5 py-2 rounded-lg bg-muted/40 border border-border/50">
      <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
      <p className={hintClass}>{text}</p>
    </div>
  );
}

export function ChannelDialogForm({
  form,
  setForm,
  onSubmit,
  isPending,
  isEdit,
  isWhatsApp,
}: ChannelDialogFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3.5">
      <div>
        <label className={labelClass}>Label</label>
        <input
          type="text"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className={labelClass}>Platform</label>
        <select
          value={form.platform}
          disabled={isEdit}
          onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
          className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {CHANNEL_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* ── WhatsApp ── */}
      {isWhatsApp && isEdit && (
        <div className="px-3 py-2 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground">
          {form.whatsappNumber ? (
            <span>
              Connected as{" "}
              <strong className="text-foreground">+{form.whatsappNumber}</strong>
            </span>
          ) : (
            <span>
              Not connected — use Reconnect from the channel menu to pair again.
            </span>
          )}
        </div>
      )}
      {isWhatsApp && !isEdit && (
        <PlatformHint text="After creating the channel, you'll scan a QR code with WhatsApp to link your phone." />
      )}

      {/* ── Telegram ── */}
      {form.platform === "TELEGRAM" && (
        <div className="space-y-2">
          {isEdit && form.hasStoredTelegramToken && (
            <div>
              <label className={labelClass}>Current bot token</label>
              <StoredTokenMask />
            </div>
          )}
          <div>
            <label className={labelClass}>
              {isEdit && form.hasStoredTelegramToken
                ? "New bot token (optional)"
                : "Telegram bot token"}
            </label>
            <input
              type="password"
              autoComplete="off"
              value={form.botToken}
              onChange={(e) =>
                setForm((f) => ({ ...f, botToken: e.target.value }))
              }
              className={inputClass}
              placeholder={
                isEdit && form.hasStoredTelegramToken
                  ? "Paste only if replacing the token above"
                  : "Paste token from @BotFather"
              }
              required={!isEdit || !form.hasStoredTelegramToken}
            />
          </div>
          <PlatformHint text="Isaac will register a webhook with Telegram so your bot can receive messages from workers and send task notifications." />
        </div>
      )}

      {/* ── Discord ── */}
      {form.platform === "DISCORD" && (
        <div className="space-y-2">
          {isEdit && form.hasStoredDiscordToken && (
            <div>
              <label className={labelClass}>Current bot token</label>
              <StoredTokenMask />
            </div>
          )}
          <div>
            <label className={labelClass}>
              {isEdit && form.hasStoredDiscordToken
                ? "New bot token (optional)"
                : "Discord bot token"}
            </label>
            <input
              type="password"
              autoComplete="off"
              value={form.botToken}
              onChange={(e) =>
                setForm((f) => ({ ...f, botToken: e.target.value }))
              }
              className={inputClass}
              placeholder={
                isEdit && form.hasStoredDiscordToken
                  ? "Paste only if replacing the token above"
                  : "From Discord Developer Portal → Bot → Token"
              }
              required={!isEdit || !form.hasStoredDiscordToken}
            />
          </div>
          <PlatformHint text="Isaac will use your bot to send DMs directly to each worker. Make sure the bot has the 'Send Messages' and 'Create DM' permissions." />
        </div>
      )}

      {/* ── Slack ── */}
      {form.platform === "SLACK" && (
        <div className="space-y-2">
          {isEdit && form.hasStoredSlackToken && (
            <div>
              <label className={labelClass}>Current bot token</label>
              <StoredTokenMask />
            </div>
          )}
          <div>
            <label className={labelClass}>
              {isEdit && form.hasStoredSlackToken
                ? "New bot token (optional)"
                : "Slack bot token (xoxb-...)"}
            </label>
            <input
              type="password"
              autoComplete="off"
              value={form.botToken}
              onChange={(e) =>
                setForm((f) => ({ ...f, botToken: e.target.value }))
              }
              className={inputClass}
              placeholder={
                isEdit && form.hasStoredSlackToken
                  ? "Paste only if replacing the token above"
                  : "xoxb-your-bot-token"
              }
              required={!isEdit || !form.hasStoredSlackToken}
            />
            <p className={hintClass}>
              From your Slack app → OAuth & Permissions → Bot User OAuth Token
            </p>
          </div>
          <PlatformHint text="Isaac will use the bot token to send notifications and task messages directly to workers. Make sure the bot has 'chat:write' and 'users:read' scopes." />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3">
        <Dialog.Close asChild>
          <button
            type="button"
            className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </Dialog.Close>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          {isEdit
            ? "Save changes"
            : isWhatsApp
              ? "Create & connect"
              : "Add channel"}
        </button>
      </div>
    </form>
  );
}
