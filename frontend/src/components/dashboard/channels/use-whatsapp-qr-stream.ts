"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSession } from "@/lib/auth-client";
import { API_URL } from "@/lib/api-client";
import type { QrPhase } from "./whatsapp-qr-panel";

export function useWhatsAppQrStream(whatsappChannelId: string | null | undefined, open: boolean) {
  const [qrPhase, setQrPhase] = useState<QrPhase>("form");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [connectedNumber, setConnectedNumber] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanupSse = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!whatsappChannelId || !open) {
      cleanupSse();
      return;
    }

    setQrPhase("scanning");
    setQrDataUrl(null);
    setQrError(null);
    setConnectedNumber(null);

    let cancelled = false;

    (async () => {
      let email = "";
      try {
        const session = await getSession();
        email = session?.data?.user?.email ?? "";
      } catch {
        /* ignore */
      }

      if (cancelled) return;

      const url = `${API_URL}/api/task-channels/${whatsappChannelId}/qr?email=${encodeURIComponent(email)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener("qr", (e) => {
        try {
          const parsed = JSON.parse((e as MessageEvent).data);
          setQrDataUrl(parsed.data);
          setQrPhase("scanning");
        } catch {
          /* ignore */
        }
      });

      es.addEventListener("connected", (e) => {
        try {
          const parsed = JSON.parse((e as MessageEvent).data);
          setConnectedNumber(parsed.phoneNumber ?? null);
        } catch {
          /* ignore */
        }
        setQrPhase("connected");
        es.close();
      });

      es.addEventListener("error", (e) => {
        if (e instanceof MessageEvent) {
          try {
            const parsed = JSON.parse(e.data);
            setQrError(parsed.message ?? "Connection failed");
          } catch {
            /* ignore */
          }
        }
        setQrPhase("error");
      });

      es.addEventListener("close", () => {
        es.close();
      });

      es.onerror = () => {
        setQrPhase("error");
        setQrError("Lost connection to server");
        es.close();
      };
    })();

    return () => {
      cancelled = true;
      cleanupSse();
    };
  }, [whatsappChannelId, open, cleanupSse, retryCount]);

  useEffect(() => {
    if (!open) {
      cleanupSse();
      setQrPhase("form");
      setQrDataUrl(null);
      setConnectedNumber(null);
      setQrError(null);
      setRetryCount(0);
    }
  }, [open, cleanupSse]);

  const retry = useCallback(() => {
    if (whatsappChannelId) {
      cleanupSse();
      setRetryCount((c) => c + 1);
    }
  }, [whatsappChannelId, cleanupSse]);

  return {
    qrPhase,
    qrDataUrl,
    connectedNumber,
    qrError,
    cleanupSse,
    retry,
  };
}
