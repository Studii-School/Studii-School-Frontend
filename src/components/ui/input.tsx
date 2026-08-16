import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-11 w-full rounded-[10px] border bg-surface px-3 text-sm placeholder:text-muted/70 focus:border-primary", className)} {...props} />;
}
