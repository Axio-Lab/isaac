"use client";

import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export type QrPhase = "form" | "scanning" | "connected" | "error";

interface WhatsAppQrPanelProps {
  phase: QrPhase;
  qrDataUrl: string | null;
  connectedNumber: string | null;
  error: string | null;
  onClose: () => void;
  onRetry?: () => void;
}

export function WhatsAppQrPanel({
  phase,
  qrDataUrl,
  connectedNumber,
  error,
  onClose,
  onRetry,
}: WhatsAppQrPanelProps) {
  if (phase === "connected") {
    return (
      <div className="flex flex-col items-center py-8 text-center gap-3">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <div>
          <p className="text-sm font-semibold text-foreground">WhatsApp connected</p>
          {connectedNumber && (
            <p className="text-xs text-muted-foreground mt-1">
              Linked to <strong className="text-foreground">+{connectedNumber}</strong>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center py-8 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <p className="text-sm font-semibold text-foreground">Connection failed</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error || "Could not connect. Try again."}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-4 gap-4">
      <p className="text-xs text-muted-foreground text-center">
        Scan this QR code with WhatsApp on your phone to link your account.
      </p>
      <div className="relative w-[260px] h-[260px] rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="WhatsApp QR Code"
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Generating QR code...</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>QR code refreshes automatically</span>
      </div>
    </div>
  );
}
