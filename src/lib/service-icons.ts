import {
  Brain,
  ClipboardList,
  HeartHandshake,
  MessageCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

export function getServiceIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();

  if (lower.includes("couple")) return Users;
  if (lower.includes("assessment") || lower.includes("psychological")) {
    return Brain;
  }
  if (lower.includes("consultation") || lower.includes("initial")) {
    return ClipboardList;
  }
  if (
    lower.includes("therapy") ||
    lower.includes("counseling") ||
    lower.includes("session")
  ) {
    return MessageCircle;
  }

  return HeartHandshake;
}
