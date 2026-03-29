"use client";

import { useState } from "react";
import { useIsaacChat } from "@/hooks/useIsaacChat";
import { ChatHeader } from "./chat-header";
import { ChatMessageList } from "./chat-message-list";
import { ChatComposer } from "./chat-composer";

export function ChatView() {
  const { messages, sendMessage, isStreaming, planMode, setPlanMode, clearMessages } = useIsaacChat();
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        planMode={planMode}
        onTogglePlan={() => setPlanMode(!planMode)}
        onClear={clearMessages}
      />
      <ChatMessageList messages={messages} isStreaming={isStreaming} />
      <ChatComposer value={input} onChange={setInput} onSubmit={handleSubmit} disabled={isStreaming} />
    </div>
  );
}
