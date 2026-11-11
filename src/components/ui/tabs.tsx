"use client";

import type { ReactNode } from "react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { cn } from "@/lib/utils";

const tabClass = (active: boolean) =>
  cn(
    "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
    active ? "border-[var(--school-primary)] text-[var(--school-primary)]" : "border-transparent text-muted hover:text-foreground",
  );

export function ButtonTabs<T extends string>({ items, value, onChange, label }: { items: readonly T[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <nav className="mb-5 max-w-full overflow-x-auto" aria-label={label}>
      <div className="flex min-w-max gap-2 border-b">
        {items.map((item) => (
          <button key={item} type="button" className={tabClass(value === item)} onClick={() => onChange(item)}>
            {item}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function LinkTabs({ items, label }: { items: Array<{ label: ReactNode; href: string; active: boolean }>; label: string }) {
  return (
    <nav className="mb-6 max-w-full overflow-x-auto" aria-label={label}>
      <div className="flex min-w-max gap-2 border-b">
        {items.map((item) => (
          <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} className={tabClass(item.active)}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
