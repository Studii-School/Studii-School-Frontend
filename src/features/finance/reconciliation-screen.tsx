"use client";

import { useState } from "react";
import { CheckCircle2, SearchCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TablePagination, usePaginatedRows } from "@/components/ui/table-pagination";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PinToDashboardButton } from "@/features/dashboard-customisation/pin-to-dashboard-button";
import { formatNaira } from "@/lib/currency";
import { formatDate } from "@/lib/date-utils";
import { useFinance } from "./finance-context";
import { FinanceNavigation } from "./components/finance-navigation";
import { ReconciliationStatusBadge } from "./components/fee-status-badge";
import { useFinanceView } from "./use-finance-view";

export function ReconciliationScreen() {
  const { matchTransaction } = useFinance();
  const { state, label } = useFinanceView();
  const periodInvoices = state.invoices;
  const periodTransactions = state.reconciliationTransactions;
  const autoMatched = periodTransactions.filter((item) => item.status === "Auto-matched").length;
  const needsReview = periodTransactions.filter((item) => !["Auto-matched", "Manually matched"].includes(item.status)).length;
  const reconciliationRate = periodTransactions.length ? Math.round(((periodTransactions.length - needsReview) / periodTransactions.length) * 100) : 0;
  const [transactionId, setTransactionId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [message, setMessage] = useState("");
  const pagination = usePaginatedRows(periodTransactions, label);
  const transaction = state.reconciliationTransactions.find((item) => item.id === transactionId);
  const apply = async () => {
    try {
      await matchTransaction(transactionId, invoiceId);
      setMessage("Payment matched, invoice updated and receipt generated.");
      setTransactionId("");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Match could not be applied.");
    }
  };

  return (
    <>
      <PageHeader title="Payment Reconciliation" description={`Review matched student payments · ${label}.`} action={<PinToDashboardButton role="admin" widgetId="admin-reconciliation" />} />
      <FinanceNavigation />
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted">Transactions received</p><p className="mt-1 text-2xl font-bold">{periodTransactions.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Automatically matched</p><p className="mt-1 text-2xl font-bold text-success">{autoMatched}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Needs review</p><p className="mt-1 text-2xl font-bold text-warning">{needsReview}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Reconciliation rate</p><p className="mt-1 text-2xl font-bold">{reconciliationRate}%</p></Card>
      </div>
      {transaction && (
        <SectionCard title="Match Payment">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="rounded-xl bg-surface-muted p-4">
              <p className="text-sm font-semibold">{transaction.payerName}</p>
              <p className="text-2xl font-bold">{formatNaira(transaction.amount)}</p>
              <p className="text-xs text-muted">{transaction.reference} · {transaction.narrative}</p>
            </div>
            <label className="text-sm font-medium">
              Apply to invoice
              <Select className="mt-2" label="Invoice" placeholder="Select invoice" value={invoiceId} onChange={setInvoiceId} options={periodInvoices.filter((item) => item.outstandingBalance >= transaction.amount).map((item) => ({ value: item.id, label: `${item.student} · ${item.invoiceNumber} · ${formatNaira(item.outstandingBalance)}` }))}/>
            </label>
            <div className="sm:col-span-2">
              <Button disabled={!invoiceId} onClick={() => void apply()}><CheckCircle2 size={16} />Confirm match and generate receipt</Button>
            </div>
          </div>
        </SectionCard>
      )}
      {message && <p role="status" className="my-4 rounded-xl border bg-surface p-3 text-sm">{message}</p>}
      <SectionCard title="Incoming transactions" description="Matching reduces manual bank-statement and spreadsheet work">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Reference", "Payer", "Amount", "Date", "Channel", "Suggested student", "Invoice", "Confidence", "Status", "Action"].map((item) => <th key={item} className="px-4 py-3 font-medium">{item}</th>)}</tr></thead>
            <tbody className="divide-y">
              {pagination.rows.map((item) => (
                <ClickableTableRow key={item.id} label={`transaction ${item.reference}`} onRowClick={() => { setTransactionId(item.id); setInvoiceId(""); }}>
                  <td className="px-4 py-3 font-medium">{item.reference}</td>
                  <td className="px-4 py-3">{item.payerName}</td>
                  <td className="px-4 py-3 font-semibold">{formatNaira(item.amount)}</td>
                  <td className="px-4 py-3">{formatDate(item.date)}</td>
                  <td className="px-4 py-3">{item.channel}</td>
                  <td className="px-4 py-3">{item.suggestedStudent ?? "-"}</td>
                  <td className="px-4 py-3">{item.suggestedInvoice ?? "-"}</td>
                  <td className="px-4 py-3">{item.matchConfidence}%</td>
                  <td className="px-4 py-3"><ReconciliationStatusBadge status={item.status} /></td>
                  <td className="px-4 py-3"><Button variant="ghost" onClick={() => { setTransactionId(item.id); setInvoiceId(""); }}><SearchCheck size={15} />Review</Button></td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination label="Transactions" total={pagination.total} page={pagination.page} pageCount={pagination.pageCount} pageSize={pagination.pageSize} start={pagination.start} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
      </SectionCard>
    </>
  );
}
