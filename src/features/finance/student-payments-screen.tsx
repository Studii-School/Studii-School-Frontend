"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, FileText } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useAcademics } from "@/features/academics/academics-context";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { formatNaira } from "@/lib/currency";
import { readStoredUser } from "@/lib/auth";
import { resolveStudentSession } from "@/features/academics/student-session";
import { useFinance } from "./finance-context";
import { ReceiptPreview } from "./components/receipt-preview";
import { filterReceiptsByInvoices } from "./finance-scope";
import { studentPaymentInvoices } from "./payment-audience";

export function StudentPaymentsScreen() {
  const { allState, source, isLoading, createFlutterwaveCheckout, refresh } = useFinance();
  const { state: academics } = useAcademics();
  const { toast } = useActionFeedback();
  const [payingId, setPayingId] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const user = readStoredUser();
  const studentId = resolveStudentSession(academics, user).studentId;
  const invoices = useMemo(() => studentPaymentInvoices(allState.invoices, source === "api", studentId), [allState.invoices, source, studentId]);
  const dueInvoices = invoices.filter((item) => item.outstandingBalance > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const receipts = filterReceiptsByInvoices(allState.receipts, invoices).slice(0, 3);
  const outstanding = dueInvoices.reduce((sum, item) => sum + item.outstandingBalance, 0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("payment");
    if (result !== "success" && result !== "failed") return;
    if (result === "success") void refresh();
    toast(result === "success" ? "Payment confirmed. Your balance has been updated." : "Payment was not completed. You can try again.", result === "success" ? "success" : "error");
    params.delete("payment");
    params.delete("tx_ref");
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }, [refresh, toast]);

  const pay = async (invoiceId: string, amount: number) => {
    setPayingId(invoiceId);
    try {
      const checkout = await createFlutterwaveCheckout({ invoiceId, amount });
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Payment could not be started. Please try again.", "error");
      setPayingId("");
    }
  };

  return <>
    <PageHeader title="School fees" description="See unpaid fees from any term and pay securely online." />
    <Card className="mb-5 overflow-hidden rounded-2xl border-0 bg-[var(--school-primary)] p-5 text-[var(--school-primary-foreground)] shadow-sm sm:p-7">
      <p className="text-sm opacity-85">Your amount to pay</p>
      <p className="mt-2 text-3xl font-bold sm:text-4xl">{isLoading ? "Loading…" : formatNaira(outstanding)}</p>
      <p className="mt-2 text-sm opacity-85">{dueInvoices.length ? `${dueInvoices.length} fee${dueInvoices.length === 1 ? "" : "s"} still due` : "You have no unpaid fees."}</p>
    </Card>

    <section aria-labelledby="student-fees-title" className="mb-7">
      <h2 id="student-fees-title" className="mb-3 text-lg font-semibold">Fees to pay</h2>
      {isLoading ? <p className="rounded-xl border p-5 text-sm text-muted">Loading your fees…</p> : dueInvoices.length ? <div className="space-y-3">
        {dueInvoices.map((invoice) => {
          const feeName = allState.feeStructures.find((fee) => fee.id === invoice.feeStructureId)?.name ?? invoice.invoiceNumber;
          return <Card key={invoice.id} className="flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div><p className="font-semibold">{feeName}</p><p className="mt-1 text-sm text-muted">{invoice.term} {invoice.academicSession} · Due {invoice.dueDate}</p><p className="mt-2 text-lg font-bold">{formatNaira(invoice.outstandingBalance)} <span className="text-xs font-normal text-muted">remaining</span></p></div>
            <Button className="w-full sm:w-auto" disabled={Boolean(payingId)} onClick={() => void pay(invoice.id, invoice.outstandingBalance)}><CreditCard size={16} />{payingId === invoice.id ? "Opening Flutterwave…" : "Pay with Flutterwave"}</Button>
          </Card>;
        })}
      </div> : <Card className="rounded-2xl p-5 text-sm text-muted">{studentId || source === "api" ? "No unpaid fees were found for your account." : "Your student account is not linked to a student record yet. Ask the school office for help."}</Card>}
    </section>

    {receipts.length > 0 && <section aria-labelledby="student-payments-title">
      <div className="mb-3 flex items-center gap-2"><CheckCircle2 size={18} className="text-success" /><h2 id="student-payments-title" className="text-lg font-semibold">Recent receipts</h2></div>
      <Card className="divide-y rounded-2xl px-4 sm:px-5">{receipts.map((receipt) => <div key={receipt.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">{receipt.receiptNumber}</p><p className="text-xs text-muted">{receipt.paymentDate} · {formatNaira(receipt.amount)}</p></div><Button variant="outline" onClick={() => setReceiptId(receipt.id)}><FileText size={15} />View</Button></div>)}</Card>
    </section>}
    <Modal open={Boolean(receiptId)} onClose={() => setReceiptId("")} title="Payment receipt" maxWidth="2xl">
      {receipts.find((receipt) => receipt.id === receiptId) && <ReceiptPreview receipt={receipts.find((receipt) => receipt.id === receiptId)!} />}
    </Modal>
  </>;
}
