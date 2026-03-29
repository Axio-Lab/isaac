"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Loader2,
  Trash2,
  Unplug,
  MoreVertical,
  RefreshCw,
  SendHorizonal,
  Pencil,
} from "lucide-react";
import type { TaskChannel } from "@/hooks/useTaskChannels";
import { PlatformChannelIcon } from "@/lib/channel-icons";
import { platformColor, connectionStatusColor } from "./channel-utils";

interface ChannelCardProps {
  channel: TaskChannel;
  menuBusy: boolean;
  onEdit: () => void;
  onDisconnect: () => void;
  onTest: () => void;
  onRefresh: () => void;
  onDelete: () => void;
}

export function ChannelCard({
  channel,
  menuBusy,
  onEdit,
  onDisconnect,
  onTest,
  onRefresh,
  onDelete,
}: ChannelCardProps) {
  return (
    <div className="border border-border rounded-xl px-3.5 py-3 bg-card hover:border-border/80 transition-all duration-150">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${platformColor(channel.platform)}`}
          >
            <PlatformChannelIcon platform={channel.platform} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-medium text-foreground truncate">
              {channel.label || channel.platform}
            </h3>
          </div>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Channel actions"
              aria-busy={menuBusy}
              disabled={menuBusy}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors shrink-0 disabled:opacity-70 disabled:pointer-events-none"
            >
              {menuBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MoreVertical className="h-3.5 w-3.5" />
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[168px] bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-1 z-200"
              sideOffset={4}
              align="end"
            >
              <DropdownMenu.Item
                className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted"
                onSelect={() => {
                  onEdit();
                }}
              >
                <Pencil className="h-3 w-3" /> Edit
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted"
                onSelect={() => {
                  onTest();
                }}
              >
                <SendHorizonal className="h-3 w-3" /> Send test
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted"
                onSelect={() => {
                  onRefresh();
                }}
              >
                <RefreshCw className="h-3 w-3" /> Refresh status
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted text-warning"
                onSelect={() => {
                  onDisconnect();
                }}
              >
                <Unplug className="h-3 w-3" /> Disconnect
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-border my-1" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] rounded-md cursor-pointer outline-none hover:bg-muted text-destructive"
                onSelect={() => {
                  onDelete();
                }}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${platformColor(channel.platform)}`}
        >
          {channel.platform}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${connectionStatusColor(channel.status)}`}
        >
          {channel.status}
        </span>
      </div>
    </div>
  );
}
