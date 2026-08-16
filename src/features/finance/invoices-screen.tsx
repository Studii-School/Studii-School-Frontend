"use client";
import { useMemo, useState } from "react";
import { Download, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFinance } from "./finance-context";
import { FinanceNavigation } from "./components/finance-navigation";
import { InvoiceTable } from "./components/invoice-table";
import { RecordPaymentForm } from "./forms/record-payment-form";
import { downloadCsv } from "./finance-utils";
import type { InvoiceStatus, StudentInvoice } from "./finance.types";

export function InvoicesScreen() {
  const { state } = useFinance();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "All">("All");
  const [className, setClassName] = useState("All");
  const [session, setSession] = useState("All");
  const [term, setTerm] = useState("All");
  const [selected, setSelected] = useState<StudentInvoice>();
  const filtered = useMemo(() => state.invoices.filter((item) =>
    (status === "All" || item.status === status) &&
    (className === "All" || item.className === className) &&
    (session === "All" || item.academicSession === session) &&
    (term === "All" || item.term === term) &&
    `${item.student} ${item.invoiceNumber} ${item.admissionNumber} ${item.parent}`.toLowerCase().includes(search.toLowerCase()),
  ), [state.invoices, status, className, session, term, search]);
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
      <PageHeader title="Invoices" description="Search, filter and manage student fee invoices." action={<div className="flex gap-2"><Button variant="outline"><MessageSquareText size={16} />Bulk reminder</Button><Button variant="outline" disabled={!filtered.length} onClick={exportInvoices}><Download size={16} />Export</Button></div>} />
      <FinanceNavigation />
      {selected && <SectionCard title={`Record payment · ${selected.student}`}><div className="p-5"><RecordPaymentForm key={selected.id} initialInvoice={selected} onClose={() => setSelected(undefined)} /></div></SectionCard>}
      <SectionCard title="Student invoices" description={`${filtered.length} result(s)`}>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-5">
          <Input placeholder="Search invoices" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="h-11 rounded-[10px] border bg-surface px-3" value={session} onChange={(event) => setSession(event.target.value)}><option>All</option>{[...new Set(state.invoices.map((item) => item.academicSession))].map((item) => <option key={item}>{item}</option>)}</select>
          <select className="h-11 rounded-[10px] border bg-surface px-3" value={term} onChange={(event) => setTerm(event.target.value)}><option>All</option>{[...new Set(state.invoices.map((item) => item.term))].map((item) => <option key={item}>{item}</option>)}</select>
          <select className="h-11 rounded-[10px] border bg-surface px-3" value={className} onChange={(event) => setClassName(event.target.value)}><option>All</option>{[...new Set(state.invoices.map((item) => item.className))].map((item) => <option key={item}>{item}</option>)}</select>
          <select className="h-11 rounded-[10px] border bg-surface px-3" value={status} onChange={(event) => setStatus(event.target.value as InvoiceStatus | "All")}><option>All</option>{["Unpaid", "Partially paid", "Paid", "Cancelled"].map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <InvoiceTable invoices={filtered} onRecord={setSelected} />
        <div className="flex items-center justify-between border-t p-4 text-xs text-muted"><span>Showing {filtered.length} of {state.invoices.length}</span><span>Page 1 of 1</span></div>
      </SectionCard>
    </>
  );
}
