"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { cn } from "@/lib/utils";

export const pageTabClass = (active: boolean) =>
  cn(
    "relative shrink-0 rounded-t-xl px-4 py-3 text-sm transition-colors",
    active
      ? "bg-[var(--school-primary-soft)] font-semibold text-[var(--school-primary-ink)] after:absolute after:inset-x-3 after:bottom-0 after:h-1 after:rounded-t-full after:bg-[var(--school-primary)]"
      : "font-medium text-muted hover:bg-surface-muted hover:text-foreground",
  );

function useActiveTabInView(activeKey: string) {
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]');
    if (!nav || !active) return;
    const navBounds = nav.getBoundingClientRect();
    const activeBounds = active.getBoundingClientRect();
    if (activeBounds.left < navBounds.left) nav.scrollLeft -= navBounds.left - activeBounds.left + 8;
    if (activeBounds.right > navBounds.right) nav.scrollLeft += activeBounds.right - navBounds.right + 8;
  }, [activeKey]);
  return navRef;
}

export function ButtonTabs<T extends string>({ items, value, onChange, label }: { items: readonly T[]; value: T; onChange: (value: T) => void; label: string }) {
  const navRef = useActiveTabInView(value);
  return (
    <nav ref={navRef} className="portal-page-tabs mb-5 max-w-full overflow-x-auto" aria-label={label}>
      <div className="flex min-w-max gap-1 border-b">
        {items.map((item) => (
          <button key={item} type="button" aria-pressed={value === item} className={pageTabClass(value === item)} onClick={() => onChange(item)}>
            {item}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function LinkTabs({ items, label }: { items: Array<{ label: ReactNode; href: string; active: boolean }>; label: string }) {
  const navRef = useActiveTabInView(items.find((item) => item.active)?.href ?? "");
  return (
    <nav ref={navRef} className="portal-page-tabs table-page-tabs mb-6 max-w-full overflow-x-auto" aria-label={label}>
      <div className="flex min-w-max gap-1 border-b">
        {items.map((item) => (
          <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} className={pageTabClass(item.active)}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
