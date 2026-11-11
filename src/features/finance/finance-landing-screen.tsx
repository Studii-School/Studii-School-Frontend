"use client";

import Link from "@/features/navigation-progress/navigation-progress-link";
import { formatNaira } from "@/lib/currency";
import { PageHeader } from "@/components/dashboard/page-header";
import { FinanceAudienceCards } from "./components/finance-navigation";
import { useFinance } from "./finance-context";
import { summarizeFinanceState } from "./finance-scope";

export function FinanceLandingScreen() {
  const { allState, allFeeStructures } = useFinance();
  const activeFees = allFeeStructures.filter((fee) => fee.status === "Active");
  const { outstandingAmount: amountDue, amountCollected } = summarizeFinanceState(allState);
  const paidInvoices = allState.invoices.filter((invoice) => invoice.status === "Paid").length;
  return (
    <>
      <PageHeader
        title="Finance"
        description="Choose whether you want to manage student finance or staff finance."
        showBack={false}
      />
      <FinanceAudienceCards />
      <section className="mt-6 rounded-xl border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">School fee overview</h2><p className="mt-1 text-sm text-muted">Your saved fee structures and student bills across all terms.</p></div>
          <Link href="/admin/finance/fees" className="text-sm font-semibold text-[var(--school-primary)] hover:underline">View fee structures</Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-surface-muted p-4"><p className="text-sm text-muted">Saved fees</p><p className="mt-1 text-2xl font-bold">{allFeeStructures.length}</p></div>
          <div className="rounded-lg bg-surface-muted p-4"><p className="text-sm text-muted">Active fees</p><p className="mt-1 text-2xl font-bold">{activeFees.length}</p></div>
          <div className="rounded-lg bg-surface-muted p-4"><p className="text-sm text-muted">Student balance due across all terms</p><p className="mt-1 text-2xl font-bold">{formatNaira(amountDue)}</p></div>
          <div className="rounded-lg bg-surface-muted p-4"><p className="text-sm text-muted">Collected across all terms</p><p className="mt-1 text-2xl font-bold">{formatNaira(amountCollected)}</p><p className="mt-1 text-xs text-muted">{paidInvoices} invoice(s) paid in full</p></div>
        </div>
        {allFeeStructures.length > 0 && <div className="mt-5 border-t pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recently created</p>{allFeeStructures.slice(0, 3).map((fee) => <div key={fee.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{fee.name} <span className="text-muted">· {fee.term} {fee.academicSession}</span></span><span className="font-medium">{formatNaira(fee.amount)} · {fee.status}</span></div>)}</div>}
      </section>
    </>
  );
}
