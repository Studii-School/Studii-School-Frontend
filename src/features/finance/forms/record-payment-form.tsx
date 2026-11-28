"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PersonNameLink } from "@/features/people/person-name-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { formatNaira } from "@/lib/currency";
import { formatDate } from "@/lib/date-utils";
import { InvoiceStatusBadge } from "../components/fee-status-badge";
import { useFinance } from "../finance-context";
import type { PaymentMethod, StudentInvoice } from "../finance.types";
import { useFinanceView } from "../use-finance-view";
import { readStoredUser } from "@/lib/auth";

const methods: PaymentMethod[] = ["Online card payment", "Bank transfer", "Cash", "POS", "USSD", "Cheque", "Mobile money", "Other"];

export function RecordPaymentForm({ initialInvoice, onClose }: { initialInvoice?: StudentInvoice; onClose?: () => void }) {
  const { allState, recordPayment } = useFinance();
  const { state } = useFinanceView();
  const params = useSearchParams();
  const [invoiceLaunch, setInvoiceLaunch] = useState(Boolean(initialInvoice));
  const [step, setStep] = useState(initialInvoice ? 3 : 1);
  const [search, setSearch] = useState("");
  const [invoiceId, setInvoiceId] = useState(initialInvoice?.id ?? "");
  const invoice = allState.invoices.find((item) => item.id === invoiceId);
  const [amount, setAmount] = useState(initialInvoice?.outstandingBalance ?? 0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("Bank transfer");
  const [bank, setBank] = useState("GTBank");
  const [reference, setReference] = useState("");
  const [payer, setPayer] = useState(initialInvoice?.parent ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const receiptParams = new URLSearchParams(params.toString());
  receiptParams.delete("record");
  receiptParams.set("receipt", receiptId);
  const matches = useMemo(
    () =>
      state.invoices.filter((item) => item.outstandingBalance > 0 && !["Cancelled", "Waived"].includes(item.status))
        .filter((item) => `${item.student} ${item.admissionNumber} ${item.parent} ${item.parentPhone} ${item.invoiceNumber}`.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 6),
    [state.invoices, search],
  );

  const next = () => {
    setError("");
    if (step === 1 && !invoice) {
      setError("Select a student invoice.");
      return;
    }
    if (step === 2 && invoice) {
      setAmount(invoice.outstandingBalance);
      setPayer(invoice.parent);
    }
    if (step === 3) {
      if (amount <= 0) {
        setError("Enter an amount greater than zero.");
        return;
      }
      if (invoice && amount > invoice.outstandingBalance) {
        setError("Amount cannot exceed the outstanding balance.");
        return;
      }
      if (!reference.trim()) {
        setError("Transaction reference is required.");
        return;
      }
    }
    setStep((value) => Math.min(4, value + 1));
  };

  const submit = async () => {
    if (!invoice) return;
    setError("");
    try {
      const user = readStoredUser();
      const id = await recordPayment({ invoiceId: invoice.id, amount, paymentDate: date, method, bankOrProvider: bank, reference, payerName: payer, notes, recordedBy: user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "School office" });
      setReceiptId(id);
      setStep(5);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment could not be recorded.");
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {["Find account", "Select invoice", "Payment details", "Review", "Confirmation"].map((label, index) => ({ label, index })).filter(({ index }) => !invoiceLaunch || index >= 2).map(({ label, index }) => (
          <span key={label} className={`rounded-full px-3 py-1 text-xs font-medium ${step === index + 1 ? "bg-[var(--school-primary)] text-[var(--school-primary-foreground)]" : "bg-surface-muted text-muted"}`}>
            {index + 1}. {label}
          </span>
        ))}
      </div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</div>}
      {step === 1 && (
        <div>
          <label className="text-sm font-medium">Find student or invoice<Input className="mt-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Student, admission no., parent, phone or invoice" /></label>
          <div className="mt-4 divide-y rounded-xl border">
            {matches.map((item) => (
              <button type="button" key={item.id} onClick={() => setInvoiceId(item.id)} className={`flex w-full items-center justify-between gap-3 p-3 text-left ${invoiceId === item.id ? "bg-primary-light" : "hover:bg-surface-muted"}`}>
                <span><b className="block text-sm">{item.student}</b><span className="text-xs text-muted">{item.admissionNumber} - {item.className} - {item.invoiceNumber}</span></span>
                <span className="text-right"><b className="block text-sm">{formatNaira(item.outstandingBalance)}</b><InvoiceStatusBadge status={item.status} /></span>
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 2 && invoice && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-4"><p className="text-xs text-muted">Student</p><p className="mt-1 font-semibold"><PersonNameLink kind="student" id={invoice.studentId}>{invoice.student}</PersonNameLink></p><p className="text-sm text-muted">{invoice.className} - {invoice.admissionNumber}</p></div>
          <div className="rounded-xl border p-4"><p className="text-xs text-muted">Invoice</p><p className="mt-1 font-semibold">{invoice.invoiceNumber}</p><p className="text-sm text-muted">Balance {formatNaira(invoice.outstandingBalance)}</p></div>
          <div className="sm:col-span-2"><p className="mb-2 text-sm font-semibold">Previous payments</p><div className="divide-y rounded-xl border">{allState.payments.filter((item) => item.invoiceId === invoice.id).map((item) => <div key={item.id} className="flex justify-between p-3 text-sm"><span>{formatDate(item.paymentDate)} - {item.method}</span><b>{formatNaira(item.amount)}</b></div>)}</div></div>
        </div>
      )}
      {step === 3 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {invoice && <div className="rounded-xl border bg-surface-muted p-3 text-sm sm:col-span-2"><b>{invoice.student}</b> · {invoice.invoiceNumber} · Balance {formatNaira(invoice.outstandingBalance)}</div>}
          <label className="text-sm font-medium">Amount paid<MoneyInput className="mt-2" min="1" value={amount} onValueChange={setAmount} /></label>
          <label className="text-sm font-medium">Payment date<Input className="mt-2" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <div className="text-sm font-medium">Payment method<Select className="mt-2" label="Payment method" value={method} onChange={(value) => setMethod(value as PaymentMethod)} options={methods.map((value) => ({ value, label: value }))}/></div>
          <label className="text-sm font-medium">Bank or provider<Input className="mt-2" value={bank} onChange={(event) => setBank(event.target.value)} /></label>
          <label className="text-sm font-medium">Transaction reference<Input className="mt-2" value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="GF-TRF-2026-00422" /></label>
          <label className="text-sm font-medium">Payer name<Input className="mt-2" value={payer} onChange={(event) => setPayer(event.target.value)} /></label>
          <label className="text-sm font-medium sm:col-span-2">Notes<Input className="mt-2" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          <p className="text-xs text-muted sm:col-span-2">Payment proof attachments are unavailable in this workspace. Keep the transaction reference for reconciliation.</p>
        </div>
      )}
      {step === 4 && invoice && (
        <div className="space-y-3 rounded-xl border p-5">
          <h3 className="font-semibold">Review payment</h3>
          {[["Student", invoice.student], ["Invoice", invoice.invoiceNumber], ["Amount", formatNaira(amount)], ["New outstanding", formatNaira(invoice.outstandingBalance - amount)], ["Method", method], ["Reference", reference]].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b pb-2 text-sm"><span className="text-muted">{label}</span><b className="text-right">{value}</b></div>
          ))}
        </div>
      )}
      {step === 5 && (
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto text-success" size={42} />
          <h3 className="mt-3 text-xl font-bold">Payment successful</h3>
          <p className="mt-1 text-sm text-muted">The invoice, receipt and dashboards have been updated.</p>
          <p className="mt-4 text-sm font-semibold">Receipt created - {receiptId}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2"><Button type="button" variant="outline" onClick={() => window.print()}><Printer size={16} />Print receipt</Button><Link href={`/admin/finance/receipts?${receiptParams}`}><Button type="button">View receipt</Button></Link><Button type="button" variant="outline" onClick={() => { setInvoiceLaunch(false); setStep(1); setInvoiceId(""); setReference(""); }}>Record another</Button></div>
        </div>
      )}
      {step < 5 && <div className="mt-6 flex justify-between border-t pt-4"><Button type="button" variant="outline" disabled={step === (invoiceLaunch ? 3 : 1)} onClick={() => setStep((value) => Math.max(invoiceLaunch ? 3 : 1, value - 1))}><ChevronLeft size={16} />Back</Button>{step === 4 ? <Button type="button" onClick={() => void submit()}>Confirm payment<CheckCircle2 size={16} /></Button> : <Button type="button" onClick={next}>Continue<ChevronRight size={16} /></Button>}</div>}
      {onClose && step === 5 && <button onClick={onClose} className="mt-4 text-sm text-muted">Close</button>}
    </div>
  );
}
