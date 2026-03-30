"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useTaskChannels,
  useCreateChannel,
  useDeleteChannel,
  useDisconnectChannel,
  useTestChannel,
  useRefreshChannel,
  useUpdateChannel,
} from "@/hooks/useTaskChannels";
import type { TaskChannel } from "@/hooks/useTaskChannels";
import { Plus, Loader2, Hash } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AppPagination } from "@/components/ui/pagination";
import { ChannelDialog } from "./channel-dialog";
import { ChannelCard } from "./channel-card";
import {
  defaultChannelForm,
  toChannelPayload,
  toChannelUpdatePayload,
  formFromChannel,
} from "./channel-utils";
import { CHANNELS_PAGE_SIZE } from "./channels-constants";

export function ChannelsView() {
  const { data, isLoading } = useTaskChannels();
  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const deleteChannel = useDeleteChannel();
  const disconnectChannel = useDisconnectChannel();
  const testChannel = useTestChannel();
  const refreshChannel = useRefreshChannel();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultChannelForm);
  const [whatsappChannelId, setWhatsappChannelId] = useState<string | null>(null);

  const isSubmitting = createChannel.isPending || updateChannel.isPending;
  const [menuBusyChannelId, setMenuBusyChannelId] = useState<string | null>(null);
  const [channelPendingDelete, setChannelPendingDelete] = useState<TaskChannel | null>(null);
  const [page, setPage] = useState(1);

  const channels = data?.channels ?? [];
  const totalPages = Math.max(1, Math.ceil(channels.length / CHANNELS_PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedChannels = useMemo(() => {
    const start = (page - 1) * CHANNELS_PAGE_SIZE;
    return channels.slice(start, start + CHANNELS_PAGE_SIZE);
  }, [channels, page]);

  async function runChannelAction(channelId: string, action: () => Promise<unknown>) {
    setMenuBusyChannelId(channelId);
    try {
      await action();
    } finally {
      setMenuBusyChannelId(null);
    }
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setForm(defaultChannelForm);
      setWhatsappChannelId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await updateChannel.mutateAsync({
        id: editingId,
        data: toChannelUpdatePayload(form),
      });
      setForm(defaultChannelForm);
      setEditingId(null);
      setDialogOpen(false);
    } else {
      const created = await createChannel.mutateAsync(toChannelPayload(form));
      if (form.platform === "WHATSAPP" && created?.id) {
        setWhatsappChannelId(created.id);
        return;
      }
      setForm(defaultChannelForm);
      setEditingId(null);
      setDialogOpen(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Channels</h1>
          <p className="text-xs text-muted-foreground">
            Configure channels for notifications and reporting
          </p>
        </div>
        <GlassButton
          onClick={() => {
            setEditingId(null);
            setForm(defaultChannelForm);
            setDialogOpen(true);
          }}
          size="sm"
          className="glass-filled"
          contentClassName="flex items-center gap-1.5 text-xs"
        >
          <Plus className="h-3 w-3" /> Add Channel
        </GlassButton>
      </div>

      {channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Hash className="h-5 w-5 text-muted-foreground opacity-50" />
          </div>
          <p className="text-xs text-muted-foreground">No channels configured yet.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedChannels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                menuBusy={menuBusyChannelId === channel.id}
                onEdit={() => {
                  setMenuBusyChannelId(channel.id);
                  requestAnimationFrame(() => {
                    setEditingId(channel.id);
                    setForm(formFromChannel(channel));
                    setDialogOpen(true);
                    setMenuBusyChannelId(null);
                  });
                }}
                onDisconnect={() =>
                  runChannelAction(channel.id, () =>
                    disconnectChannel.mutateAsync({ id: channel.id })
                  )
                }
                onTest={() =>
                  runChannelAction(channel.id, () => testChannel.mutateAsync({ id: channel.id }))
                }
                onRefresh={() => {
                  if (channel.platform === "WHATSAPP" && channel.status !== "connected") {
                    setWhatsappChannelId(channel.id);
                    setForm({
                      ...defaultChannelForm,
                      label: channel.label || "",
                      platform: "WHATSAPP",
                    });
                    setDialogOpen(true);
                  } else {
                    void runChannelAction(channel.id, () =>
                      refreshChannel.mutateAsync({ id: channel.id })
                    );
                  }
                }}
                onDelete={() => {
                  setChannelPendingDelete(channel);
                }}
              />
            ))}
          </div>
          <AppPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-6"
          />
        </>
      )}

      <ConfirmDialog
        open={channelPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setChannelPendingDelete(null);
        }}
        title="Delete channel?"
        description={
          channelPendingDelete
            ? `Delete channel "${channelPendingDelete.label || channelPendingDelete.platform}"? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={async () => {
          if (!channelPendingDelete) return;
          await runChannelAction(channelPendingDelete.id, () =>
            deleteChannel.mutateAsync({ id: channelPendingDelete.id })
          );
        }}
      />

      <ChannelDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isPending={isSubmitting}
        mode={editingId ? "edit" : "add"}
        whatsappChannelId={whatsappChannelId}
      />
    </div>
  );
}
