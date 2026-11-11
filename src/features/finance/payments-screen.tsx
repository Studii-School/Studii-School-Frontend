"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PinToDashboardButton } from "@/features/dashboard-customisation/pin-to-dashboard-button";
import { useAcademics } from "@/features/academics/academics-context";
import { useFinanceView } from "./use-finance-view";
import { FinancePeriodFilter } from "./components/finance-period-filter";
import { FinanceNavigation } from "./components/finance-navigation";
import { PaymentTable } from "./components/payment-table";
import { StudentFinanceClassGrid } from "./components/student-finance-class-grid";
import { RecordPaymentForm } from "./forms/record-payment-form";
import { selectedClassFromParams } from "./finance-scope";
import { downloadCsv } from "./finance-utils";

export function PaymentsScreen() {
  const { state, label } = useFinanceView();
  const { state: academics } = useAcademics();
  const selectedClassId = selectedClassFromParams(useSearchParams());
  const selectedClass = academics.classes.find((item) => item.id === selectedClassId);
  const [recording, setRecording] = useState(false);
  const payments = state.payments;
  const exportPayments = () => downloadCsv("payment-records.csv", payments.map((item) => ({
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
      <PageHeader title={selectedClass ? `${selectedClass.displayName} payments` : "Student payments"} description={`Review payment records · ${label}.`} action={<div className="flex gap-2"><PinToDashboardButton role="admin" widgetId="admin-recent-payments" /><Button variant="outline" disabled={!payments.length} onClick={exportPayments}><Download size={16} />Export CSV</Button><Button onClick={() => setRecording(true)}><Plus size={16} />Record payment</Button></div>} />
      {selectedClass ? <FinanceNavigation /> : <><FinancePeriodFilter /><StudentFinanceClassGrid /></>}
      {!selectedClass && null}
      <Modal open={recording} title="Record payment" description="Add an offline payment to the selected class ledger." maxWidth="xl" onClose={() => setRecording(false)}>
        <RecordPaymentForm onClose={() => setRecording(false)} />
      </Modal>
      <SectionCard title="Payment history" description={`${payments.length} payment record(s) · ${label}`}><PaymentTable payments={payments} /></SectionCard>
    </>
  );
}
