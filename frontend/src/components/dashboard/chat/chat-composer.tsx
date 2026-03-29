"use client";

import { Send } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
}

export function ChatComposer({ value, onChange, onSubmit, disabled }: ChatComposerProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-3 border-t border-border bg-card/50 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3.5 py-2 bg-muted border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={disabled}
        />
        <GlassButton
          type="submit"
          disabled={!value.trim() || disabled}
          size="icon"
          className="glass-filled"
          contentClassName="flex items-center justify-center h-9 w-9"
        >
          <Send className="h-3.5 w-3.5" />
        </GlassButton>
      </form>
    </div>
  );
}
