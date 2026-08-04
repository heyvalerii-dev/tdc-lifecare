import { type } from "@/lib/typography";

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="hidden h-4 w-0.5 shrink-0 rounded-full bg-[var(--brand-yellow)] lg:block"
        aria-hidden="true"
      />
      <h2 className={type.sectionTitle}>{children}</h2>
    </div>
  );
}
