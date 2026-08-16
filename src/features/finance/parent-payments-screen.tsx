"use client";

import { useMemo, useState } from "react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { CreditCard, FileText } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { PinToDashboardButton } from "@/features/dashboard-customisation/pin-to-dashboard-button";
import { parentChildrenFromAcademics, studentLabel } from "@/features/parents/parent-child-utils";
import { formatNaira } from "@/lib/currency";
import { useFinance } from "./finance-context";
import { InvoiceStatusBadge } from "./components/fee-status-badge";
import { PaymentTable } from "./components/payment-table";
import { ParentPaymentForm } from "./forms/parent-payment-form";

export function ParentPaymentsScreen() {
  const { state } = useFinance();
  const { state: academics } = useAcademics();
  const [paying, setPaying] = useState(false);
  const [childId, setChildId] = useState("ALL");
  const children = useMemo(() => parentChildrenFromAcademics(academics), [academics]);
  const childIds = new Set(children.map((child) => child.id));
  const activeInvoices = state.invoices.filter((item) => !["Cancelled", "Waived"].includes(item.status));
  const familyInvoices = childIds.size ? activeInvoices.filter((item) => childIds.has(item.studentId)) : activeInvoices;
  const invoiceChildren = [...new Map(familyInvoices.map((invoice) => [invoice.studentId, { id: invoice.studentId, label: `${invoice.student} - ${invoice.admissionNumber}` }])).values()];
  const invoices = childId === "ALL" ? familyInvoices : familyInvoices.filter((item) => item.studentId === childId);
  const total = invoices.reduce((sum, item) => sum + item.totalAmount, 0);
  const paid = invoices.reduce((sum, item) => sum + item.amountPaid, 0);
  const outstanding = invoices.reduce((sum, item) => sum + item.outstandingBalance, 0);
  const next = invoices.filter((item) => item.outstandingBalance > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const payments = state.payments.filter((item) => invoices.some((invoice) => invoice.id === item.invoiceId));
  const receipts = state.receipts.filter((item) => invoices.some((invoice) => invoice.id === item.invoiceId));

  return <>
    <PageHeader title="Payments" description="Fees, payment plans and receipts for your children." action={<Button onClick={() => setPaying(true)}><CreditCard size={16} />Pay school fees</Button>} />
    <Card className="mb-5 p-4">
      <Select label="Show fees for" value={childId} onChange={setChildId} options={[{ value: "ALL", label: "All children" }, ...(children.length ? children.map((child) => ({ value: child.id, label: studentLabel(child) })) : invoiceChildren.map((child) => ({ value: child.id, label: child.label })))]} />
    </Card>
    {paying && <SectionCard title="School fee payment"><div className="p-5"><ParentPaymentForm invoices={invoices.filter((item) => item.outstandingBalance > 0)} onClose={() => setPaying(false)} /></div></SectionCard>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="p-4"><p className="text-sm text-muted">Current term fees</p><p className="mt-2 text-xl font-bold">{formatNaira(total)}</p></Card>
      <Card className="p-4"><p className="text-sm text-muted">Amount paid</p><p className="mt-2 text-xl font-bold text-success">{formatNaira(paid)}</p></Card>
      <Card className="p-4"><p className="text-sm text-muted">Outstanding balance</p><p className="mt-2 text-xl font-bold text-warning">{formatNaira(outstanding)}</p><div className="mt-3"><PinToDashboardButton role="parent" widgetId="parent-outstanding" /></div></Card>
      <Card className="p-4"><p className="text-sm text-muted">Next due date</p><p className="mt-2 text-xl font-bold">{next?.dueDate ?? "No balance due"}</p><div className="mt-3"><PinToDashboardButton role="parent" widgetId="parent-next-due" /></div></Card>
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <SectionCard title="Children fee overview" action={<PinToDashboardButton role="parent" widgetId="parent-children-fees" />}>
        <div className="divide-y px-5">{invoices.length ? invoices.map((invoice) => <div key={invoice.id} className="py-4"><div className="flex justify-between gap-4"><div><p className="text-sm font-semibold">{invoice.student}</p><p className="text-xs text-muted">{invoice.className} - Due {invoice.dueDate}</p></div><div className="text-right"><p className="text-sm font-bold">{formatNaira(invoice.outstandingBalance)}</p><InvoiceStatusBadge status={invoice.status} /></div></div></div>) : <p className="py-8 text-center text-sm text-muted">No active fees apply to the selected child.</p>}</div>
      </SectionCard>
      <SectionCard title="Active payment plan" action={<PinToDashboardButton role="parent" widgetId="parent-payment-plan" />}>
        <div className="p-5"><p className="font-semibold">{next?.paymentPlan ?? "No active plan"}</p><p className="mt-1 text-sm text-muted">{next ? `${formatNaira(next.outstandingBalance)} outstanding - due ${next.dueDate}` : "Paid invoices and future plans will appear here."}</p></div>
      </SectionCard>
      <SectionCard title="Recent payments" action={<PinToDashboardButton role="parent" widgetId="parent-recent-payments" />}><PaymentTable payments={payments.slice(0, 4)} /></SectionCard>
      <SectionCard title="Available receipts"><div className="divide-y px-5">{receipts.length ? receipts.map((receipt) => <div key={receipt.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-semibold">{receipt.receiptNumber}</p><p className="text-xs text-muted">{receipt.student} - {formatNaira(receipt.amount)}</p></div><Link href={`/parent/payments/receipt/${receipt.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--school-primary)]"><FileText size={15} />View</Link></div>) : <p className="py-8 text-center text-sm text-muted">No receipts available yet.</p>}</div></SectionCard>
    </div>
  </>;
}
