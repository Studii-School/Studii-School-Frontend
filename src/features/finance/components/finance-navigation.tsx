"use client";

import { GraduationCap, UsersRound } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { LinkTabs } from "@/components/ui/tabs";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { useFinance } from "../finance-context";
import { isActiveRoute } from "@/lib/navigation-active";
import { selectedClassFromParams, withClassScope } from "../finance-scope";
import { FinancePeriodFilter } from "./finance-period-filter";

const audienceLinks = [
  { label: "Staff payroll", href: "/admin/finance/teachers", description: "Prepare payroll, record deductions and track payments", icon: UsersRound },
  { label: "Student fees", href: "/admin/finance/students", description: "Review fees, invoices, payments and receipts", icon: GraduationCap },
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
  const params = useSearchParams();
  return <div className="grid gap-4 sm:grid-cols-2">
    {audienceLinks.map(({ label, href, description, icon: Icon }, index) => <Link key={href} href={params.get("financePeriod") === "all" ? `${href}?financePeriod=all` : href} className="min-h-32 rounded-[8px] border bg-surface p-5 text-left transition hover:border-[var(--school-primary)] hover:shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <span><b className="block">{label}</b><span className="mt-1 block text-sm text-muted">{description}</span></span>
          <BrandIcon tone={index === 0 ? "secondary" : "accent"} className="size-11"><Icon size={22} /></BrandIcon>
        </div>
        <span className="mt-5 inline-flex text-sm font-semibold text-[var(--school-primary-ink)]">{label}</span>
      </Link>)}
  </div>;
}

export function FinanceNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const { state: academics } = useAcademics();
  const { allState } = useFinance();
  const selectedClassId = selectedClassFromParams(params);
  const classOptions = [...new Map([
    ...academics.classes.map((item) => [item.id, item.displayName] as const),
    ...allState.invoices.filter((item) => item.classId).map((item) => [item.classId!, item.className] as const),
  ])].map(([value, label]) => ({ value, label }));
  const hrefFor = (href: string) => {
    const scoped = withClassScope(href, selectedClassId);
    return params.get("financePeriod") === "all" ? `${scoped}${scoped.includes("?") ? "&" : "?"}financePeriod=all` : scoped;
  };

  return (
    <><LinkTabs label="Finance sections" items={links.map((item) => ({ ...item, href: item.studentScoped ? hrefFor(item.href) : item.href, active: item.href === "/admin/finance" ? pathname === item.href : isActiveRoute(pathname, item.href) }))} /><div className="flex flex-wrap items-end gap-3"><FinancePeriodFilter /><div className="mb-5 w-56 max-w-full"><Select label="Class filter" value={selectedClassId} onChange={(value) => { const next = new URLSearchParams(params.toString()); if (value) next.set("classId", value); else next.delete("classId"); router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }); }} placeholder="All classes" options={[{ value: "", label: "All classes" }, ...classOptions]} /></div></div></>
  );
}
