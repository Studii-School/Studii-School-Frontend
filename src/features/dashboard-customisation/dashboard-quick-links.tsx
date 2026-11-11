"use client";

import { NavIcon } from "@/components/layout/icon";
import { buttonStyles } from "@/components/ui/button";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { useFrequentPages } from "@/features/navigation-progress/frequent-pages-provider";

export function DashboardQuickLinks() {
  const pages = useFrequentPages();
  if (!pages.length) return null;
  return (
    <nav aria-label="Frequently opened pages" className="flex min-w-0 flex-wrap gap-2">
      {pages.map((page) => (
        <Link key={page.href} href={page.href} className={buttonStyles("outline")} title={`Open ${page.label}`}>
          <NavIcon name={page.icon} size={16} />
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
