"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-primary bg-primary text-[var(--school-primary-foreground)]"
          : "border-border bg-surface text-transparent hover:border-primary/60",
        className
      )}
    >
      <Check size={14} strokeWidth={3} />
    </button>
  );
}
