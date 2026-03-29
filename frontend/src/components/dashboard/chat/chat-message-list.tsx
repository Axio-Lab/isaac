"use client";

import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Bot, User } from "lucide-react";
import type { ChatMessage } from "@/hooks/useIsaacChat";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export function ChatMessageList({ messages, isStreaming }: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Bot className="h-5 w-5 opacity-40" />
          </div>
          <p className="text-xs font-medium">Start a conversation with Isaac</p>
          <p className="text-[10px] mt-1 text-muted-foreground">
            Ask anything about your tasks, workers, or reports.
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
          {msg.role !== "user" && (
            <div className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-3 w-3" />
            </div>
          )}
          <div
            className={`max-w-[85%] sm:max-w-[70%] rounded-xl px-3 py-2.5 text-[11px] leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted border border-border text-foreground"
            }`}
          >
            {msg.role === "user" ? (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            ) : (
              <div className="prose prose-invert prose-xs max-w-none [&_p]:my-0.5 [&_code]:text-[10px] [&_pre]:bg-background [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg">
                <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
              </div>
            )}
          </div>
          {msg.role === "user" && (
            <div className="h-6 w-6 rounded-lg bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
              <User className="h-3 w-3" />
            </div>
          )}
        </div>
      ))}

      {isStreaming && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-[10px]">Isaac is thinking...</span>
        </div>
      )}
    </div>
  );
}
