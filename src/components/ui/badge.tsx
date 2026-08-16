import { cn } from "@/lib/utils";
import type { StatusTone } from "@/types";
export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: StatusTone; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", tone === "success" && "bg-green-50 text-success", tone === "warning" && "bg-amber-50 text-warning", tone === "danger" && "bg-red-50 text-danger", tone === "primary" && "bg-[color-mix(in_srgb,var(--school-primary)_12%,white)] text-[var(--school-primary)]", tone === "neutral" && "bg-surface-muted text-muted", className)}>{children}</span>;
}
