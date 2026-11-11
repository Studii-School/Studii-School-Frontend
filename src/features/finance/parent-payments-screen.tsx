"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, FileText } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PersonNameLink } from "@/features/people/person-name-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { parentChildrenFromAcademics, studentLabel } from "@/features/parents/parent-child-utils";
import { useAcademics } from "@/features/academics/academics-context";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { formatNaira } from "@/lib/currency";
import { readStoredUser } from "@/lib/auth";
import { useFinance } from "./finance-context";
import { ReceiptPreview } from "./components/receipt-preview";
import { filterReceiptsByInvoices } from "./finance-scope";
import { parentPaymentInvoices } from "./payment-audience";

export function ParentPaymentsScreen() {
  const { allState, source, isLoading, createFlutterwaveCheckout, refresh } = useFinance();
  const { state: academics } = useAcademics();
  const { toast } = useActionFeedback();
  const [childId, setChildId] = useState("ALL");
  const [payingId, setPayingId] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [customInvoiceId, setCustomInvoiceId] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const children = useMemo(() => parentChildrenFromAcademics(academics), [academics]);
  const childIds = useMemo(() => new Set(children.map((child) => child.id)), [children]);
  const user = readStoredUser();
  const familyInvoices = parentPaymentInvoices(allState.invoices, source === "api", childIds, user?.id, user?.email);
  const childOptions = [
    ...children.map((child) => ({ value: child.id, label: studentLabel(child) })),
    ...familyInvoices.filter((invoice) => !childIds.has(invoice.studentId)).filter((invoice, index, list) => list.findIndex((item) => item.studentId === invoice.studentId) === index).map((invoice) => ({ value: invoice.studentId, label: `${invoice.student} - ${invoice.admissionNumber}` })),
  ];
  const invoices = childId === "ALL" ? familyInvoices : familyInvoices.filter((item) => item.studentId === childId);
  const dueInvoices = invoices.filter((item) => item.outstandingBalance > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const outstanding = dueInvoices.reduce((sum, item) => sum + item.outstandingBalance, 0);
  const receipts = filterReceiptsByInvoices(allState.receipts, familyInvoices).slice(0, 4);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("payment");
    if (result !== "success" && result !== "failed") return;
    if (result === "success") void refresh();
    toast(result === "success" ? "Payment confirmed. Your family balance has been updated." : "Payment was not completed. You can try again.", result === "success" ? "success" : "error");
    params.delete("payment");
    params.delete("tx_ref");
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }, [refresh, toast]);

  const pay = async (invoiceId: string, amount: number) => {
    setPayingId(invoiceId);
    try {
      const invoice = invoices.find((item) => item.id === invoiceId);
      const checkout = await createFlutterwaveCheckout({ invoiceId, amount, customerName: invoice?.parent, studentName: invoice?.student, invoiceNumber: invoice?.invoiceNumber });
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Payment could not be started. Please try again.", "error");
      setPayingId("");
    }
  };

  return <>
    <PageHeader title="School fees" description="See each child’s unpaid fees from any term and pay securely online." />
    {childOptions.length > 1 && <div className="mb-4 max-w-sm"><Select label="Show fees for" value={childId} onChange={setChildId} options={[{ value: "ALL", label: "All my children" }, ...childOptions]} /></div>}
    <Card className="mb-5 overflow-hidden rounded-2xl border-0 bg-[var(--school-primary)] p-5 text-[var(--school-primary-foreground)] shadow-sm sm:p-7">
      <p className="text-sm opacity-85">Total to pay{childId === "ALL" && children.length > 1 ? " · all children" : ""}</p>
      <p className="mt-2 text-3xl font-bold sm:text-4xl">{isLoading ? "Loading…" : formatNaira(outstanding)}</p>
      <p className="mt-2 text-sm opacity-85">{dueInvoices.length ? `${dueInvoices.length} fee${dueInvoices.length === 1 ? "" : "s"} still due` : "No unpaid school fees were found."}</p>
    </Card>

    <section aria-labelledby="family-fees-title" className="mb-7">
      <h2 id="family-fees-title" className="mb-3 text-lg font-semibold">Fees to pay</h2>
      {isLoading ? <p className="rounded-xl border p-5 text-sm text-muted">Loading school fees…</p> : dueInvoices.length ? <div className="space-y-3">
        {dueInvoices.map((invoice) => {
          const feeName = allState.feeStructures.find((fee) => fee.id === invoice.feeStructureId)?.name ?? invoice.invoiceNumber;
          return <Card key={invoice.id} className="flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div><p className="font-semibold"><PersonNameLink kind="student" id={invoice.studentId}>{invoice.student}</PersonNameLink> <span className="font-normal text-muted">· {feeName}</span></p><p className="mt-1 text-sm text-muted">{invoice.className} · {invoice.term} {invoice.academicSession} · Due {invoice.dueDate}</p><p className="mt-2 text-lg font-bold">{formatNaira(invoice.outstandingBalance)} <span className="text-xs font-normal text-muted">remaining</span></p></div>
            <div className="flex flex-col gap-2 sm:min-w-48">
              <Button className="w-full" disabled={Boolean(payingId)} onClick={() => void pay(invoice.id, invoice.outstandingBalance)}><CreditCard size={16} />{payingId === invoice.id ? "Opening Flutterwave…" : "Pay with Flutterwave"}</Button>
              <button type="button" className="text-xs font-medium text-[var(--school-primary)] hover:underline" onClick={() => { setCustomInvoiceId(customInvoiceId === invoice.id ? "" : invoice.id); setCustomAmount(""); }}>Pay another amount</button>
              {customInvoiceId === invoice.id && <div className="grid gap-2 rounded-xl bg-surface-muted p-3">
                <label className="text-xs font-medium">Amount (up to {formatNaira(invoice.outstandingBalance)})<Input className="mt-1 bg-surface" type="number" min="1" max={invoice.outstandingBalance} step="1" inputMode="numeric" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} /></label>
                <Button className="w-full" disabled={Boolean(payingId) || !Number.isFinite(Number(customAmount)) || Number(customAmount) <= 0 || Number(customAmount) > invoice.outstandingBalance} onClick={() => void pay(invoice.id, Number(customAmount))}>Pay this amount with Flutterwave</Button>
              </div>}
            </div>
          </Card>;
        })}
      </div> : <Card className="rounded-2xl p-5 text-sm text-muted">{childOptions.length || source === "api" ? "No unpaid fees were found for your children." : "No children are linked to your account yet. Please contact the school office."}</Card>}
    </section>

    {receipts.length > 0 && <section aria-labelledby="family-payments-title">
      <div className="mb-3 flex items-center gap-2"><CheckCircle2 size={18} className="text-success" /><h2 id="family-payments-title" className="text-lg font-semibold">Recent receipts</h2></div>
      <Card className="divide-y rounded-2xl px-4 sm:px-5">{receipts.map((receipt) => <div key={receipt.id} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">{receipt.student} · {receipt.receiptNumber}</p><p className="text-xs text-muted">{receipt.paymentDate} · {formatNaira(receipt.amount)}</p></div><Button variant="outline" onClick={() => setReceiptId(receipt.id)}><FileText size={15} />View</Button></div>)}</Card>
      <Link href="/parent/payments/history" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--school-primary)]"><FileText size={15} />View payment history</Link>
    </section>}
    <Modal open={Boolean(receiptId)} onClose={() => setReceiptId("")} title="Payment receipt" maxWidth="2xl">
      {receipts.find((receipt) => receipt.id === receiptId) && <ReceiptPreview receipt={receipts.find((receipt) => receipt.id === receiptId)!} />}
    </Modal>
  </>;
}
