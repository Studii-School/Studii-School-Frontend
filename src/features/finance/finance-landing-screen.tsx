"use client";

import { useSearchParams } from "next/navigation";
import { formatNaira } from "@/lib/currency";
import { PageHeader } from "@/components/dashboard/page-header";
import { buttonStyles } from "@/components/ui/button";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { FinanceAudienceCards } from "./components/finance-navigation";
import { FinancePeriodFilter } from "./components/finance-period-filter";
import { useFinance } from "./finance-context";
import { useFinanceView } from "./use-finance-view";

export function FinanceLandingScreen() {
  const { allFeeStructures } = useFinance();
  const { state, summary, label } = useFinanceView();
  const params = useSearchParams();
  const href = (path: string) => params.get("financePeriod") === "all" ? `${path}?financePeriod=all` : path;
  const activeFees = state.feeStructures.filter((fee) => fee.status === "Active");
  const paidInvoices = state.invoices.filter((invoice) => invoice.status === "Paid").length;
  return <>
    <PageHeader title="Finance" description="School-wide billing and payroll at a glance." showBack={false} />
    <div className="mb-5 flex flex-wrap gap-2">
      <Link className={buttonStyles()} href={href("/admin/finance/invoices")}>Invoices</Link>
      <Link className={buttonStyles("outline")} href={`${href("/admin/finance/payments")}${params.get("financePeriod") === "all" ? "&" : "?"}record=1`}>Record payment</Link>
      <Link className={buttonStyles("outline")} href={href("/admin/finance/debtors")}>Outstanding fees</Link>
    </div>
    <FinancePeriodFilter />
    <section className="rounded-xl border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">School fee overview</h2><p className="mt-1 text-sm text-muted">Collections and balances · {label}</p></div>
        <Link href={href("/admin/finance/fees")} className="text-sm font-semibold text-[var(--school-primary)] hover:underline">Fee structures</Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Link href={href("/admin/finance/payments")} className="rounded-lg bg-primary-light p-4"><p className="text-sm">Collected · {label}</p><p className="mt-1 text-2xl font-bold">{formatNaira(summary.amountCollected)}</p><p className="mt-1 text-xs">{paidInvoices} invoice(s) paid in full</p></Link>
        <Link href={href("/admin/finance/debtors")} className="rounded-lg bg-warning/10 p-4"><p className="text-sm">Outstanding · {label}</p><p className="mt-1 text-2xl font-bold">{formatNaira(summary.outstandingAmount)}</p><p className="mt-1 text-xs">Open outstanding accounts</p></Link>
        <div className="rounded-lg bg-surface-muted p-4"><p className="text-sm text-muted">Fee structure status</p><p className="mt-1 text-2xl font-bold">{activeFees.length} active</p><p className="mt-1 text-xs text-muted">{state.feeStructures.length} in {label.toLowerCase()} · {allFeeStructures.length} saved overall</p></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-sm">
        <Link href={href("/admin/finance/reconciliation")} className="font-semibold text-primary hover:underline">Reconciliation</Link>
        <Link href={href("/admin/finance/receipts")} className="font-semibold text-primary hover:underline">Receipts</Link>
        <Link href={href("/admin/finance/reports")} className="font-semibold text-primary hover:underline">Reports</Link>
      </div>
    </section>
    <div className="mt-6"><FinanceAudienceCards /></div>
  </>;
}
