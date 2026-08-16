"use client";
import { Copy, CreditCard, FileText } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PinToDashboardButton } from "@/features/dashboard-customisation/pin-to-dashboard-button";
import { useAcademics } from "@/features/academics/academics-context";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { formatNaira } from "@/lib/currency";
import { readStoredUser } from "@/lib/auth";
import { financePermissions } from "./finance.defaults";
import { useFinance } from "./finance-context";
import { InvoiceStatusBadge } from "./components/fee-status-badge";
import { PaymentTable } from "./components/payment-table";

export function StudentPaymentsScreen() {
  const { state, isLoading, createFlutterwaveCheckout } = useFinance();
  const { state: academics } = useAcademics();
  const { toast } = useActionFeedback();
  const user = readStoredUser();
  const studentId = user?.studentId ?? academics.students.find((student) => student.userId === user?.id)?.id ?? "";
  const activeInvoices = state.invoices.filter((item) => !["Cancelled", "Waived"].includes(item.status));
  const invoices = studentId ? activeInvoices.filter((item) => item.studentId === studentId) : activeInvoices;
  const invoiceStudentIds = new Set(invoices.map((item) => item.studentId));
  const payments = state.payments.filter((item) => (studentId ? item.studentId === studentId : invoiceStudentIds.has(item.studentId)));
  const receipts = state.receipts.filter((item) => invoices.some((invoice) => invoice.id === item.invoiceId));
  const total = invoices.reduce((sum, item) => sum + item.totalAmount, 0);
  const paid = invoices.reduce((sum, item) => sum + item.amountPaid, 0);
  const outstanding = invoices.reduce((sum, item) => sum + item.outstandingBalance, 0);
  const next = invoices.filter((item) => item.outstandingBalance > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const pay = async (invoice = next) => {
    if (!invoice) return;
    try {
      const checkout = await createFlutterwaveCheckout({ invoiceId: invoice.id, amount: invoice.outstandingBalance });
      window.location.href = checkout.checkoutUrl;
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Flutterwave checkout could not be started.", "error");
    }
  };

  return (
    <>
      <PageHeader title="Payments" description="Active fees, balances, plans and receipts for your student account." action={<div className="flex gap-2"><Button variant="outline" disabled={!next} onClick={() => next && void navigator.clipboard?.writeText(`${window.location.origin}/student/payments?invoice=${next.id}`)}><Copy size={16} />Copy payment link</Button>{financePermissions.allowStudentPayments && <Button disabled={!next} onClick={() => void pay()}><CreditCard size={16} />Pay now</Button>}</div>} />
      {isLoading ? <p className="text-sm text-muted">Loading fee obligations...</p> : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4"><p className="text-sm text-muted">Active fee total</p><p className="mt-2 text-xl font-bold">{formatNaira(total)}</p></Card>
          <Card className="p-4"><p className="text-sm text-muted">Amount paid</p><p className="mt-2 text-xl font-bold text-success">{formatNaira(paid)}</p></Card>
          <Card className="p-4"><p className="text-sm text-muted">Outstanding balance</p><p className="mt-2 text-xl font-bold text-warning">{formatNaira(outstanding)}</p><div className="mt-3"><PinToDashboardButton role="student" widgetId="student-fee-balance" /></div></Card>
          <Card className="p-4"><p className="text-sm text-muted">Next due date</p><p className="mt-2 text-xl font-bold">{next?.dueDate ?? "No balance due"}</p><div className="mt-3"><PinToDashboardButton role="student" widgetId="student-next-payment" /></div></Card>
        </div>
        <SectionCard title="Current fee obligations" description={`${invoices.length} active invoice(s)`}>
          <div className="divide-y px-5">{invoices.length ? invoices.map((invoice) => <div key={invoice.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{state.feeStructures.find((fee) => fee.id === invoice.feeStructureId)?.name ?? invoice.invoiceNumber}</p><InvoiceStatusBadge status={invoice.status} /></div><p className="mt-1 text-sm text-muted">{invoice.term} · Due {invoice.dueDate} · {invoice.paymentPlan}</p></div><div className="text-right"><p className="font-bold">{formatNaira(invoice.outstandingBalance)} outstanding</p><p className="text-xs text-muted">{formatNaira(invoice.amountPaid)} of {formatNaira(invoice.totalAmount)} paid</p>{invoice.outstandingBalance > 0 && <Button className="mt-2" onClick={() => void pay(invoice)}><CreditCard size={15} />Pay now</Button>}</div></div>) : <p className="py-8 text-center text-sm text-muted">No active fees apply to your class.</p>}</div>
        </SectionCard>
        <SectionCard title="Payment history"><PaymentTable payments={payments} /></SectionCard>
        <SectionCard title="Available receipts"><div className="divide-y px-5">{receipts.length ? receipts.map((receipt) => <div key={receipt.id} className="flex items-center justify-between py-3"><div><p className="text-sm font-semibold">{receipt.receiptNumber}</p><p className="text-xs text-muted">{formatNaira(receipt.amount)} · {receipt.paymentDate}</p></div><Button variant="outline" onClick={() => window.print()}><FileText size={15} />Download</Button></div>) : <p className="py-8 text-center text-sm text-muted">No receipts available yet.</p>}</div></SectionCard>
      </>}
    </>
  );
}
