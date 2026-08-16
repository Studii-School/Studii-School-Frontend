import { cn } from "@/lib/utils";
export function Avatar({ initials, className }: { initials: string; className?: string }) { return <span aria-hidden="true" className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary", className)}>{initials}</span>; }
