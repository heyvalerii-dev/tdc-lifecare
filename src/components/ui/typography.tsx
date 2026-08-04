import { cn } from "@/lib/utils";
import { type } from "@/lib/typography";

interface BookingStepHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function BookingStepHeader({ title, description, className }: BookingStepHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      <h1 className={type.pageTitle}>{title}</h1>
      {description && <p className={cn(type.bodyMuted, type.prose)}>{description}</p>}
    </header>
  );
}

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return <p className={cn(type.label, className)}>{children}</p>;
}
