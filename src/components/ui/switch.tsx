"use client";

import { cn } from "@/lib/utils";

export function Switch({ checked, onCheckedChange, disabled, label }: { checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "border-primary bg-primary" : "border-border bg-surface-muted"
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}
