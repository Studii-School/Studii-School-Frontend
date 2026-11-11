"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function ClickableTableRow({
  href,
  onRowClick,
  label,
  children,
  className,
}: {
  href?: string;
  onRowClick?: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const clickable = Boolean(href || onRowClick);
  const activate = () => onRowClick ? onRowClick() : href && router.push(href);

  function open(event: MouseEvent<HTMLTableRowElement>) {
    if (event.defaultPrevented) return;
    const target = event.target;
    if (target instanceof Element && target.closest('a, button, input, select, textarea, summary, [role="button"], [role="link"], [contenteditable="true"]')) return;
    activate();
  }

  function openFromKeyboard(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    activate();
  }

  return (
    <tr
      aria-label={clickable ? `Open ${label} details` : undefined}
      className={cn(clickable && "cursor-pointer hover:bg-surface-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary", className)}
      onClick={clickable ? open : undefined}
      onKeyDown={clickable ? openFromKeyboard : undefined}
      role="row"
      tabIndex={clickable ? 0 : undefined}
    >
      {children}
    </tr>
  );
}
