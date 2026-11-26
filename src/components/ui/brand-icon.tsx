import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BrandTone = "primary" | "secondary" | "accent";

const softStyles: Record<BrandTone, string> = {
  primary: "bg-[var(--school-primary-soft)] text-[var(--school-primary-ink)]",
  secondary: "bg-[var(--school-secondary-soft)] text-[var(--school-secondary-ink)]",
  accent: "bg-[var(--school-accent-soft)] text-[var(--school-accent-ink)]",
};

const solidStyles: Record<BrandTone, string> = {
  primary: "bg-[var(--school-primary)] text-[var(--school-primary-foreground)]",
  secondary: "bg-[var(--school-secondary)] text-[var(--school-secondary-foreground)]",
  accent: "bg-[var(--school-accent)] text-[var(--school-accent-foreground)]",
};

export function BrandIcon({ children, tone = "secondary", solid = false, className }: {
  children: ReactNode;
  tone?: BrandTone;
  solid?: boolean;
  className?: string;
}) {
  return <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center rounded-lg", solid ? solidStyles[tone] : softStyles[tone], className)}>{children}</span>;
}
