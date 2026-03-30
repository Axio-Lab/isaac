"use client";

import { useState, useCallback, useRef } from "react";
import { getAuthHeaders } from "@/lib/api-client";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useIsaacChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      };

      const assistantId = generateId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const headers = await getAuthHeaders();
        const conversationHistory = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch(`${API_URL}/api/agent/chat`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ prompt, planMode, conversationHistory }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || body.message || res.statusText);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const event = JSON.parse(payload);

              switch (event.type) {
                case "message":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + (event.content || "") }
                        : m
                    )
                  );
                  break;

                case "tool_use":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content: m.content + `\n\n_Using tool: ${event.name || "unknown"}_\n\n`,
                            metadata: {
                              ...m.metadata,
                              lastTool: event.name,
                            },
                          }
                        : m
                    )
                  );
                  break;

                case "result":
                  if (event.content) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: m.content + (event.content || "") }
                          : m
                      )
                    );
                  }
                  break;

                case "error":
                  toast.error(event.message || "An error occurred");
                  break;
              }
            } catch {
              // skip malformed SSE data
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Failed to send message";
        toast.error(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || "_Error: could not get a response._" }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, messages, planMode]
  );

  return {
    messages,
    sendMessage,
    isStreaming,
    planMode,
    setPlanMode,
    clearMessages,
  };
}
