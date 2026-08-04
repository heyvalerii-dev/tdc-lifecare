import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

interface AlertProps {
  variant?: "info" | "success" | "error" | "warning";
  children: React.ReactNode;
  className?: string;
}

const variants = {
  info: { bg: "bg-blue-50 border-blue-200 text-blue-800", icon: Info },
  success: { bg: "bg-green-50 border-green-200 text-green-800", icon: CheckCircle },
  error: { bg: "bg-red-50 border-red-200 text-red-800", icon: AlertCircle },
  warning: { bg: "bg-amber-50 border-amber-200 text-amber-800", icon: AlertCircle },
};

export function Alert({ variant = "info", children, className }: AlertProps) {
  const { bg, icon: Icon } = variants[variant];
  return (
    <div className={cn("flex gap-3 rounded-lg border p-4 text-sm", bg, className)}>
      <Icon className="h-5 w-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
