"use client";

import { NavIcon } from "@/components/layout/icon";
import { BrandIcon, type BrandTone } from "@/components/ui/brand-icon";
import { buttonStyles } from "@/components/ui/button";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { useFrequentPages } from "@/features/navigation-progress/frequent-pages-provider";

export function DashboardQuickLinks() {
  const pages = useFrequentPages();
  if (!pages.length) return null;
  return (
    <nav aria-label="Frequently opened pages" className="flex min-w-0 flex-wrap gap-2">
      {pages.map((page, index) => (
        <Link key={page.href} href={page.href} className={`${buttonStyles("outline")} gap-2.5 pl-2.5`} title={`Open ${page.label}`}>
          <BrandIcon tone={(["primary", "secondary", "accent"] as BrandTone[])[index % 3]} className="size-8">
            <NavIcon name={page.icon} size={16} />
          </BrandIcon>
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
