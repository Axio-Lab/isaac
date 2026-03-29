import type { LucideIcon } from "lucide-react";
import { Hash, Send, MessagesSquare, Phone, Bell } from "lucide-react";

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  TELEGRAM: Send,
  SLACK: Hash,
  DISCORD: MessagesSquare,
  WHATSAPP: Phone,
};

/**
 * Lucide-based icon for a chat platform (task channel / notification channel).
 * Slack uses Hash (no official Slack glyph in Lucide).
 */
export function platformChannelIcon(platform: string, className: string) {
  const Icon = PLATFORM_ICONS[platform.toUpperCase()] ?? Bell;
  return <Icon className={className} />;
}

export function PlatformChannelIcon({
  platform,
  className = "h-4 w-4 shrink-0",
}: {
  platform: string;
  className?: string;
}) {
  return platformChannelIcon(platform, className);
}
