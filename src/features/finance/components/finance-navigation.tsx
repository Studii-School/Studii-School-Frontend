import { GraduationCap, UsersRound } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";

const audienceLinks = [
  { label: "Teachers Finance", href: "/admin/finance/teachers", description: "Salaries, fines, and required teacher payments", icon: UsersRound },
  { label: "Students Finance", href: "/admin/finance/debtors", description: "Fees, invoices, debtors, payments, and receipts", icon: GraduationCap },
];

const links = [
  { label: "Overview", href: "/admin/finance" },
  { label: "Teacher finance", href: "/admin/finance/teachers" },
  { label: "Fee structures", href: "/admin/finance/fees" },
  { label: "Invoices", href: "/admin/finance/invoices" },
  { label: "Payments", href: "/admin/finance/payments" },
  { label: "Reconciliation", href: "/admin/finance/reconciliation" },
  { label: "Debtors", href: "/admin/finance/debtors" },
  { label: "Receipts", href: "/admin/finance/receipts" },
  { label: "Reports", href: "/admin/finance/reports" },
  { label: "Settings", href: "/admin/finance/settings" },
];

export function FinanceNavigation() {
  return <>
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      {audienceLinks.map(({ label, href, description, icon: Icon }) => <Link key={href} href={href} className="min-h-32 rounded-[8px] border bg-surface p-5 text-left transition hover:border-[var(--school-primary)] hover:shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <span><b className="block">{label}</b><span className="mt-1 block text-sm text-muted">{description}</span></span>
          <Icon size={22} className="text-[var(--school-primary)]" />
        </div>
        <span className="mt-5 inline-flex text-sm font-semibold text-[var(--school-primary)]">Open section</span>
      </Link>)}
    </div>
    <nav className="scrollbar-thin mb-6 flex gap-1 overflow-x-auto rounded-xl border bg-surface p-1" aria-label="Finance sections">
      {links.map((item) => <Link key={item.href} href={item.href} className="shrink-0 rounded-[10px] px-3 py-2 text-sm font-medium text-muted hover:bg-surface-muted hover:text-foreground">{item.label}</Link>)}
    </nav>
  </>;
}
