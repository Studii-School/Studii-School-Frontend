import { forwardRef,type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export function buttonStyles(variant: Variant = "primary") {
  return cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50",
    variant === "primary" && "bg-[var(--school-primary)] text-[var(--school-primary-foreground)] hover:opacity-90",
    variant === "secondary" && "bg-[var(--school-secondary)] text-[var(--school-secondary-foreground)] hover:opacity-90",
    variant === "outline" && "border bg-surface text-foreground hover:bg-[var(--school-secondary-soft)] [&>svg]:text-[var(--school-secondary-ink)]",
    variant === "ghost" && "text-muted hover:bg-surface-muted hover:text-foreground",
    variant === "danger" && "bg-danger text-white hover:bg-danger/90");
}
export const Button=forwardRef<HTMLButtonElement,ButtonHTMLAttributes<HTMLButtonElement>&{variant?:Variant}>(function Button({className,variant="primary",...props},ref){return <button ref={ref} className={cn(buttonStyles(variant),className)} {...props}/>});
