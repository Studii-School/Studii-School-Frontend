"use client";

import Link from "@/features/navigation-progress/navigation-progress-link";
import { ArrowRight, Download, FilePlus2, Landmark, MessageSquareText, Plus, RefreshCw, WalletCards } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PinToDashboardButton } from "@/features/dashboard-customisation/pin-to-dashboard-button";
import { formatNaira } from "@/lib/currency";
import { FinanceNavigation } from "./components/finance-navigation";
import { FinanceStatGrid } from "./components/finance-stat-card";
import { CollectionProgress } from "./components/collection-progress";
import { PaymentTable } from "./components/payment-table";
import { ExpenseForm } from "./forms/expense-form";
import { useFinance } from "./finance-context";

const actions = [
  { label: "Create fee structure", href: "/admin/finance/fees", icon: FilePlus2 },
  { label: "Generate invoices", href: "/admin/finance/invoices", icon: Landmark },
  { label: "Record offline payment", href: "/admin/finance/payments", icon: WalletCards },
  { label: "Import bank statement", href: "/admin/finance/reconciliation", icon: RefreshCw },
  { label: "Reconcile payments", href: "/admin/finance/reconciliation", icon: RefreshCw },
  { label: "Send payment reminder", href: "/admin/finance/debtors", icon: MessageSquareText },
  { label: "Download collection report", href: "/admin/finance/reports", icon: Download },
];

export function FinanceOverview() {
  const { state, summary, error } = useFinance();
  const [showExpense, setShowExpense] = useState(false);
  const classBalances = Object.entries(
    state.invoices.reduce<Record<string, number>>((result, item) => ({ ...result, [item.className]: (result[item.className] ?? 0) + item.outstandingBalance }), {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const debtors = state.invoices.filter((item) => item.outstandingBalance > 0 && !["Cancelled", "Waived"].includes(item.status)).sort((a, b) => b.outstandingBalance - a.outstandingBalance).slice(0, 6);


  return <>
    <PageHeader title="Finance" description="Fee collection, payment tracking and simple school accounting." action={<PinToDashboardButton role="admin" widgetId="admin-collection-progress" />} />
    <FinanceNavigation />
    {error && <div className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm text-warning">{error}</div>}
    <FinanceStatGrid />
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <SectionCard title="Fee collection progress" action={<PinToDashboardButton role="admin" widgetId="admin-collection-progress" />}><CollectionProgress /></SectionCard>
      <SectionCard title="Quick actions"><div className="grid gap-2 p-4 sm:grid-cols-2">{actions.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="flex min-h-11 items-center gap-2 rounded-[10px] border px-3 text-sm font-medium hover:bg-surface-muted"><Icon size={16} className="text-[var(--school-primary)]" />{label}</Link>)}<button onClick={() => setShowExpense(true)} className="flex min-h-11 items-center gap-2 rounded-[10px] border px-3 text-left text-sm font-medium hover:bg-surface-muted"><Plus size={16} className="text-[var(--school-primary)]" />Record expense</button></div></SectionCard>
      {showExpense && <SectionCard title="Basic expense"><div className="p-5"><ExpenseForm onClose={() => setShowExpense(false)} /></div></SectionCard>}
      <SectionCard title="Income and expenses"><div className="space-y-3 p-5">{[["Total income", summary.amountCollected], ["Total expenses", summary.totalExpenses ?? 0], ["Current balance", summary.currentBalance ?? summary.amountCollected]].map(([label, value]) => <div key={label} className="flex justify-between text-sm"><span className="text-muted">{label}</span><b>{formatNaira(Number(value))}</b></div>)}<div className="mt-4 divide-y rounded-[8px] border">{state.expenses.slice(0, 4).map((item) => <div key={item.id} className="flex justify-between gap-4 p-3 text-sm"><span><b>{item.title}</b><p className="text-xs text-muted">{item.category} - {item.expenseDate}</p></span><b>{formatNaira(item.amount)}</b></div>)}{!state.expenses.length && <EmptyState title="No expenses recorded" description="Basic expenses will appear here." />}</div></div></SectionCard>
      <SectionCard title="Recent payments" action={<PinToDashboardButton role="admin" widgetId="admin-recent-payments" />}><PaymentTable payments={state.payments.slice(0, 5)} /></SectionCard>
      <SectionCard title="Students with outstanding fees" action={<Link href="/admin/finance/debtors" className="text-xs font-semibold text-[var(--school-primary)]">View all</Link>}><div className="divide-y px-5">{debtors.length ? debtors.map((invoice) => <div key={invoice.id} className="flex justify-between gap-4 py-3 text-sm"><span><b>{invoice.student}</b><p className="text-xs text-muted">{invoice.className} - {invoice.invoiceNumber}</p></span><b>{formatNaira(invoice.outstandingBalance)}</b></div>) : <EmptyState title="No outstanding fees" description="All active invoices are fully paid." />}</div></SectionCard>
      <SectionCard title="Payment method breakdown" action={<PinToDashboardButton role="admin" widgetId="admin-payment-methods" />}><div className="space-y-3 p-5">{["Flutterwave", "Bank transfer", "Online card payment", "POS", "Cash"].map((method) => { const amount = state.payments.filter((item) => item.method === method && item.status === "Successful").reduce((sum, item) => sum + item.amount, 0); return <div key={method} className="flex justify-between text-sm"><span className="text-muted">{method}</span><b>{formatNaira(amount)}</b></div>; })}</div></SectionCard>
      <SectionCard title="Outstanding balances by class" action={<PinToDashboardButton role="admin" widgetId="admin-balances-class" />}><div className="divide-y px-5">{classBalances.map(([className, balance]) => <div key={className} className="flex justify-between py-3 text-sm"><span>{className}</span><b>{formatNaira(balance)}</b></div>)}</div></SectionCard>
      <SectionCard title="Reconciliation alerts" description={`${summary.needsReview} transaction(s) need attention`} action={<PinToDashboardButton role="admin" widgetId="admin-reconciliation" />}><div className="p-5"><p className="text-3xl font-bold text-warning">{summary.needsReview}</p><p className="mt-1 text-sm text-muted">Unmatched, duplicate or mismatched transactions.</p><Link href="/admin/finance/reconciliation" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--school-primary)]">Review transactions<ArrowRight size={15} /></Link></div></SectionCard>
    </div>
  </>;
}
