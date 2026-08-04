import { BadgeCheck, Shield } from "lucide-react";
import { homeIconStroke } from "./home-styles";
import { cn } from "@/lib/utils";

const signals = [
  { icon: BadgeCheck, text: "PRC-licensed psychologists" },
  { icon: Shield, text: "Strictly confidential" },
];

export function TrustStrip({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-col gap-2.5 border-t border-[var(--brand-border)] pt-6",
        className
      )}
    >
      {signals.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2">
          <Icon
            className="h-4 w-4 shrink-0 text-[var(--brand-purple)]"
            strokeWidth={homeIconStroke}
          />
          <span className="text-sm text-[var(--brand-text)]">{text}</span>
        </li>
      ))}
    </ul>
  );
}
