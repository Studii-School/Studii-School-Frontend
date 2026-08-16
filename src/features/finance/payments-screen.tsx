"use client";
import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { PinToDashboardButton } from "@/features/dashboard-customisation/pin-to-dashboard-button";
import { useFinance } from "./finance-context";
import { FinanceNavigation } from "./components/finance-navigation";
import { PaymentTable } from "./components/payment-table";
import { RecordPaymentForm } from "./forms/record-payment-form";
import { downloadCsv } from "./finance-utils";

export function PaymentsScreen() {
  const { state } = useFinance();
  const [recording, setRecording] = useState(false);
  const exportPayments = () => downloadCsv("payment-records.csv", state.payments.map((item) => ({
    reference: item.txRef ?? item.reference,
    student: item.student,
    amount: item.amount,
    method: item.method,
    provider: item.bankOrProvider,
    date: item.paymentDate,
    status: item.status,
  })));

  return (
    <>
      <PageHeader title="Payments" description="Record offline payments and review Flutterwave collection activity." action={<div className="flex gap-2"><PinToDashboardButton role="admin" widgetId="admin-recent-payments" /><Button variant="outline" disabled={!state.payments.length} onClick={exportPayments}><Download size={16} />Export CSV</Button><Button onClick={() => setRecording(true)}><Plus size={16} />Record payment</Button></div>} />
      <FinanceNavigation />
      {recording && <SectionCard title="Record payment"><div className="p-5"><RecordPaymentForm onClose={() => setRecording(false)} /></div></SectionCard>}
      <SectionCard title="Payment history" description="Successful, failed and pending payments"><PaymentTable payments={state.payments} /></SectionCard>
    </>
  );
}
