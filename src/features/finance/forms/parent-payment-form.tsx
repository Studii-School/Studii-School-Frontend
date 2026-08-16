"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNaira } from "@/lib/currency";
import { useFinance } from "../finance-context";
import type { StudentInvoice } from "../finance.types";

export function ParentPaymentForm({ invoices: providedInvoices, onClose }: { invoices?: StudentInvoice[]; onClose: () => void }) {
  const { state, createFlutterwaveCheckout } = useFinance();
  const invoices = providedInvoices ?? state.invoices.filter((item) => item.outstandingBalance > 0);
  const [step, setStep] = useState(1);
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id ?? "");
  const [amountMode, setAmountMode] = useState<"full" | "instalment" | "custom">("full");
  const [custom, setCustom] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [txRef, setTxRef] = useState("");
  const [error, setError] = useState("");

  const invoice = state.invoices.find((item) => item.id === invoiceId);
  const maxPayable = invoice ? Math.max(0, invoice.outstandingBalance) : 0;
  const amount = invoice ? (amountMode === "full" ? maxPayable : amountMode === "instalment" ? Math.min(50000, maxPayable) : custom) : 0;
  const amountInvalid = !invoice || amount <= 0 || amount > maxPayable;

  const selectInvoice = (id: string) => {
    setInvoiceId(id);
    setAmountMode("full");
    setCustom(0);
    setError("");
  };

  const next = () => {
    if (step === 3 && amountInvalid) {
      setError(`Enter an amount between ${formatNaira(1)} and ${formatNaira(maxPayable)}.`);
      return;
    }
    setError("");
    setStep((value) => value + 1);
  };

  const process = async () => {
    if (amountInvalid) {
      setError("Enter a valid payment amount within the outstanding balance.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const checkout = await createFlutterwaveCheckout({ invoiceId: invoice.id, amount });
      setTxRef(checkout.txRef);
      window.location.href = checkout.checkoutUrl;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Flutterwave checkout could not be started.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-warning">
        <ShieldCheck size={17} />
        <b>Flutterwave Test Mode</b> hosted checkout is created by the backend.
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {!invoices.length && <p className="rounded-xl border p-5 text-center text-sm text-muted">No outstanding invoices are available for the selected child.</p>}

      {step === 1 && (
        <div>
          <h3 className="font-semibold">Select child</h3>
          <div className="mt-3 grid gap-2">
            {[...new Set(invoices.map((item) => item.student))].map((student) => (
              <button key={student} className="rounded-xl border p-4 text-left hover:bg-surface-muted" onClick={() => {
                const found = invoices.find((item) => item.student === student);
                if (found) selectInvoice(found.id);
                setStep(2);
              }}>
                <b>{student}</b>
                <p className="text-xs text-muted">Continue to available invoices</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="font-semibold">Select invoice or fee</h3>
          <div className="mt-3 grid gap-2">
            {invoices.map((item) => (
              <button key={item.id} className={`rounded-xl border p-4 text-left ${invoiceId === item.id ? "border-[var(--school-primary)] bg-primary-light" : ""}`} onClick={() => selectInvoice(item.id)}>
                <div className="flex justify-between gap-4">
                  <span>
                    <b>{item.invoiceNumber}</b>
                    <p className="text-xs text-muted">{item.term} - {item.className}</p>
                  </span>
                  <b>{formatNaira(item.outstandingBalance)}</b>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && invoice && (
        <div>
          <h3 className="font-semibold">Choose payment amount</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {(["full", "instalment", "custom"] as const).map((mode) => (
              <button key={mode} className={`rounded-xl border p-4 text-left capitalize ${amountMode === mode ? "border-[var(--school-primary)] bg-primary-light" : ""}`} onClick={() => {
                setAmountMode(mode);
                setError("");
              }}>
                <b>Pay {mode}</b>
                <p className="mt-1 text-xs text-muted">{mode === "full" ? formatNaira(maxPayable) : mode === "instalment" ? formatNaira(Math.min(50000, maxPayable)) : `Up to ${formatNaira(maxPayable)}`}</p>
              </button>
            ))}
          </div>
          {amountMode === "custom" && (
            <label className="mt-4 block text-sm font-medium">
              Custom amount
              <Input className="mt-2" type="number" min="1" max={maxPayable} value={custom || ""} onChange={(event) => {
                const value = Number(event.target.value);
                setCustom(Number.isFinite(value) ? Math.min(Math.max(value, 0), maxPayable) : 0);
                setError("");
              }} />
            </label>
          )}
        </div>
      )}

      {step === 4 && invoice && (
        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Review payment</h3>
          {[["Child", invoice.student], ["Invoice", invoice.invoiceNumber], ["Amount", formatNaira(amount)], ["Method", "Flutterwave"], ["Currency", "NGN"], ["Remaining", formatNaira(Math.max(0, maxPayable - amount))]].map(([label, value]) => (
            <div key={label} className="flex justify-between border-b py-2 text-sm">
              <span className="text-muted">{label}</span>
              <b>{value}</b>
            </div>
          ))}
          <Button className="mt-5 w-full" disabled={processing || amountInvalid} onClick={() => void process()}>{processing ? "Opening checkout..." : "Pay now"}</Button>
          {txRef && <p className="mt-3 text-center text-xs text-muted">Reference {txRef}</p>}
        </div>
      )}

      {step < 4 && (
        <div className="mt-6 flex justify-between border-t pt-4">
          <Button variant="outline" onClick={() => step === 1 ? onClose() : setStep((value) => value - 1)}>Back</Button>
          <Button disabled={!invoices.length || !invoice || (step === 3 && amountInvalid)} onClick={next}>Continue</Button>
        </div>
      )}
    </div>
  );
}
