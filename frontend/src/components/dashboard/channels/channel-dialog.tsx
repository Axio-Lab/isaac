"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ChannelFormData } from "./channel-utils";
import { ChannelDialogForm } from "./channel-dialog-form";
import { WhatsAppQrPanel } from "./whatsapp-qr-panel";
import { useWhatsAppQrStream } from "./use-whatsapp-qr-stream";

export interface ChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ChannelFormData;
  setForm: React.Dispatch<React.SetStateAction<ChannelFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  mode?: "add" | "edit";
  /** After WhatsApp channel creation, the new channel ID is set here to trigger QR flow. */
  whatsappChannelId?: string | null;
}

export function ChannelDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  isPending,
  mode = "add",
  whatsappChannelId,
}: ChannelDialogProps) {
  const isEdit = mode === "edit";
  const isWhatsApp = form.platform === "WHATSAPP";

  const { qrPhase, qrDataUrl, connectedNumber, qrError, retry } = useWhatsAppQrStream(
    whatsappChannelId,
    open
  );

  const showQrPanel = isWhatsApp && qrPhase !== "form";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-2xl w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto p-5 z-50"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              {isEdit ? "Edit channel" : showQrPanel ? "Connect WhatsApp" : "Add channel"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </Dialog.Close>
          </div>

          {showQrPanel ? (
            <WhatsAppQrPanel
              phase={qrPhase}
              qrDataUrl={qrDataUrl}
              connectedNumber={connectedNumber}
              error={qrError}
              onClose={() => onOpenChange(false)}
              onRetry={whatsappChannelId ? retry : undefined}
            />
          ) : (
            <ChannelDialogForm
              form={form}
              setForm={setForm}
              onSubmit={onSubmit}
              isPending={isPending}
              isEdit={isEdit}
              isWhatsApp={isWhatsApp}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
