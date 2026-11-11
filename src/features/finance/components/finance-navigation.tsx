"use client";

import { GraduationCap, UsersRound } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { LinkTabs } from "@/components/ui/tabs";
import { isActiveRoute } from "@/lib/navigation-active";
import { selectedClassFromParams, withClassScope } from "../finance-scope";
import { FinancePeriodFilter } from "./finance-period-filter";

const audienceLinks = [
  { label: "Staff payments", href: "/admin/finance/teachers", description: "Prepare payroll, record deductions and track payments", icon: UsersRound },
  { label: "Students Finance", href: "/admin/finance/students", description: "Choose a class, then review fees, invoices, payments and receipts", icon: GraduationCap },
];

const links = [
  { label: "Overview", href: "/admin/finance", studentScoped: true },
  { label: "Fee structures", href: "/admin/finance/fees", studentScoped: true },
  { label: "Invoices", href: "/admin/finance/invoices", studentScoped: true },
  { label: "Payments", href: "/admin/finance/payments", studentScoped: true },
  { label: "Reconciliation", href: "/admin/finance/reconciliation", studentScoped: true },
  { label: "Debtors", href: "/admin/finance/debtors", studentScoped: true },
  { label: "Receipts", href: "/admin/finance/receipts", studentScoped: true },
  { label: "Reports", href: "/admin/finance/reports", studentScoped: true },
  { label: "Settings", href: "/admin/finance/settings", studentScoped: true },
];

export function FinanceAudienceCards() {
  return <div className="grid gap-4 sm:grid-cols-2">
    {audienceLinks.map(({ label, href, description, icon: Icon }) => <Link key={href} href={href} className="min-h-32 rounded-[8px] border bg-surface p-5 text-left transition hover:border-[var(--school-primary)] hover:shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <span><b className="block">{label}</b><span className="mt-1 block text-sm text-muted">{description}</span></span>
          <Icon size={22} className="text-[var(--school-primary)]" />
        </div>
        <span className="mt-5 inline-flex text-sm font-semibold text-[var(--school-primary)]">Open section</span>
      </Link>)}
  </div>;
}

export function FinanceNavigation() {
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedClassId = selectedClassFromParams(params);
  const hrefFor = (href: string) => {
    const scoped = withClassScope(href, selectedClassId);
    return params.get("financePeriod") === "term" ? `${scoped}${scoped.includes("?") ? "&" : "?"}financePeriod=term` : scoped;
  };

  return (
    <><LinkTabs label="Finance sections" items={links.map((item) => ({ ...item, href: item.studentScoped ? hrefFor(item.href) : item.href, active: item.href === "/admin/finance" ? pathname === item.href : isActiveRoute(pathname, item.href) }))} /><FinancePeriodFilter /></>
  );
}
