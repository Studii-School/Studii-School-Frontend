"use client";

import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useFinance } from "./finance-context";
import { FinanceNavigation } from "./components/finance-navigation";

export function FinanceSettingsScreen() {
  const { resetDemo, source, isLoading, error } = useFinance();
  const { confirm, toast } = useActionFeedback();
  return <>
    <PageHeader title="Finance Settings" description={source === "local" ? "Manage finance preview data." : "Review available payment methods."} />
    <FinanceNavigation />
    {isLoading ? <SectionCard title="Payment settings"><p className="p-5 text-sm text-muted">Loading finance workspace…</p></SectionCard> : source === "api" ? <SectionCard title="Online payments">
      {error && <p role="alert" className="px-5 pt-5 text-sm text-danger">{error}</p>}
      <p className="p-5 text-sm text-muted">Gateway availability is unknown. This workspace has a checkout request API but no gateway status or configuration endpoint. Checkout reports its result when a payer starts it. Offline payments can be recorded from an invoice or the Payments page.</p>
    </SectionCard> : <>
      <SectionCard title="Demo payment flow">
        <p className="p-5 text-sm text-muted">Payments and receipts here are simulated preview data. This screen does not change live payment settings.</p>
      </SectionCard>
      <SectionCard title="Reset finance demo data" description="Restore the original invoices, payments and reconciliation scenarios.">
        <div className="p-5"><Button variant="danger" onClick={() => confirm({ title: "Reset finance demo data?", description: "All simulated payments and changes will be removed and the original finance dataset restored.", confirmLabel: "Reset Demo Data", destructive: true, onConfirm: async () => { await resetDemo(); toast("Finance demo data reset successfully.", "success"); } })}><RotateCcw size={16} />Reset demo data</Button></div>
      </SectionCard>
    </>}
  </>;
}
