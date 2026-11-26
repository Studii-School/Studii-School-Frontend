"use client";

import { useMemo, useState } from "react";
import { Download, MessageSquareText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { useAcademics } from "@/features/academics/academics-context";
import { useFinanceView } from "./use-finance-view";
import { FinanceNavigation } from "./components/finance-navigation";
import { InvoiceTable } from "./components/invoice-table";
import { RecordPaymentForm } from "./forms/record-payment-form";
import { selectedClassFromParams } from "./finance-scope";
import { downloadCsv } from "./finance-utils";
import type { InvoiceStatus, StudentInvoice } from "./finance.types";

export function InvoicesScreen() {
  const { state: allState, label } = useFinanceView();
  const { state: academics } = useAcademics();
  const searchParams = useSearchParams();
  const selectedClassId = selectedClassFromParams(searchParams);
  const selectedFeeId = searchParams.get("feeId") ?? "";
  const selectedInvoiceId = searchParams.get("invoice") ?? "";
  const selectedClass = academics.classes.find((item) => item.id === selectedClassId);
  const selectedFee = allState.feeStructures.find((item) => item.id === selectedFeeId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "All">("All");
  const [className, setClassName] = useState("All");
  const [session, setSession] = useState("All");
  const [term, setTerm] = useState("All");
  const [selected, setSelected] = useState<StudentInvoice>();
  const invoices = allState.invoices;
  const filtered = useMemo(() => invoices.filter((item) =>
    (!selectedInvoiceId || item.id === selectedInvoiceId) &&
    (status === "All" || item.status === status) &&
    (selectedClassId ? item.classId === selectedClassId : className === "All" || item.className === className) &&
    (!selectedFeeId || item.feeStructureId === selectedFeeId) &&
    (session === "All" || item.academicSession === session) &&
    (term === "All" || item.term === term) &&
    `${item.student} ${item.invoiceNumber} ${item.admissionNumber} ${item.parent}`.toLowerCase().includes(search.toLowerCase()),
  ), [invoices, status, selectedClassId, selectedFeeId, selectedInvoiceId, className, session, term, search]);
  const exportInvoices = () => downloadCsv("student-invoices.csv", filtered.map((item) => ({
    invoice: item.invoiceNumber,
    student: item.student,
    class: item.className,
    session: item.academicSession,
    term: item.term,
    total: item.totalAmount,
    paid: item.amountPaid,
    balance: item.outstandingBalance,
    status: item.status,
  })));

  return (
    <>
      <PageHeader title={selectedFee ? `${selectedFee.name} invoices` : selectedClass ? `${selectedClass.displayName} invoices` : "Invoices"} description={selectedFee ? "Student bills generated from this fee structure." : "Search, filter and manage student fee invoices."} action={<div className="flex gap-2"><Button variant="outline"><MessageSquareText size={16} />Bulk reminder</Button><Button variant="outline" disabled={!filtered.length} onClick={exportInvoices}><Download size={16} />Export</Button></div>} />
      <FinanceNavigation />
      <Modal open={Boolean(selected)} title={selected ? `Record payment - ${selected.student}` : "Record payment"} description="Apply a payment to this student invoice." maxWidth="xl" onClose={() => setSelected(undefined)}>
        {selected && <RecordPaymentForm key={selected.id} initialInvoice={selected} onClose={() => setSelected(undefined)} />}
      </Modal>
      <SectionCard title="Student invoices" description={`${filtered.length} result(s)`}>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-5">
          <Input placeholder="Search invoices" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select label="Academic session" value={session} onChange={setSession} options={["All", ...new Set(invoices.map((item) => item.academicSession))].map((value) => ({ value, label: value }))}/>
          <Select label="Term" value={term} onChange={setTerm} options={["All", ...new Set(invoices.map((item) => item.term))].map((value) => ({ value, label: value }))}/>
          {!selectedClass && <Select label="Class" value={className} onChange={setClassName} options={["All", ...new Set(invoices.map((item) => item.className))].map((value) => ({ value, label: value }))}/>}
          <Select label="Invoice status" value={status} onChange={(value) => setStatus(value as InvoiceStatus | "All")} options={["All", "Unpaid", "Partially paid", "Paid", "Cancelled"].map((value) => ({ value, label: value }))}/>
        </div>
        <InvoiceTable invoices={filtered} onRecord={setSelected} />
        <div className="flex items-center justify-between border-t p-4 text-xs text-muted"><span>Showing {filtered.length} of {invoices.length} · {label}</span><span>Page 1 of 1</span></div>
      </SectionCard>
    </>
  );
}
