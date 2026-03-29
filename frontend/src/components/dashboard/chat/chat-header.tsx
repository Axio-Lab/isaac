"use client";

import { Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface ChatHeaderProps {
  planMode: boolean;
  onTogglePlan: () => void;
  onClear: () => void;
}

export function ChatHeader({ planMode, onTogglePlan, onClear }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-13 border-b border-border bg-card/50 backdrop-blur-sm">
      <h1 className="text-sm font-semibold text-foreground tracking-tight">Chat</h1>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlan}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {planMode ? (
            <ToggleRight className="h-4 w-4 text-primary" />
          ) : (
            <ToggleLeft className="h-4 w-4" />
          )}
          Plan
        </button>
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Clear chat"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
