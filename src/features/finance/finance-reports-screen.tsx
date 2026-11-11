"use client";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/currency";
import { FinanceNavigation } from "./components/finance-navigation";
import { useFinanceView } from "./use-finance-view";
import { billableInvoices } from "./finance-scope";
import { downloadCsv } from "./finance-utils";

export function FinanceReportsScreen() {
  const { state, summary, label } = useFinanceView();
  const reports = [
    { name: "Collection report", detail: `${formatNaira(summary.amountCollected)} collected`, download: () => downloadCsv("collections.csv", state.payments.filter((payment) => payment.status === "Successful").map((payment) => {
      const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
      return { reference: payment.reference, student: payment.student, class: invoice?.className, session: invoice?.academicSession, term: invoice?.term, amount: payment.amount, date: payment.paymentDate, method: payment.method };
    })) },
    { name: "Outstanding balances report", detail: `${formatNaira(summary.outstandingAmount)} outstanding`, download: () => downloadCsv("outstanding-balances.csv", billableInvoices(state.invoices).filter((invoice) => invoice.outstandingBalance > 0).map((invoice) => ({ invoice: invoice.invoiceNumber, student: invoice.student, class: invoice.className, session: invoice.academicSession, term: invoice.term, charged: invoice.totalAmount, paid: invoice.amountPaid, outstanding: invoice.outstandingBalance }))) },
    { name: "Payment methods report", detail: "Successful payments grouped by channel", download: () => {
      const methods = new Map<string, number>();
      for (const payment of state.payments.filter((item) => item.status === "Successful")) methods.set(payment.method, (methods.get(payment.method) ?? 0) + payment.amount);
      downloadCsv("payment-methods.csv", [...methods].map(([method, amount]) => ({ method, amount })));
    } },
    { name: "Reconciliation audit", detail: `${summary.reconciliationRate}% matched`, download: () => downloadCsv("reconciliation.csv", state.reconciliationTransactions.map((item) => ({ reference: item.reference, amount: item.amount, date: item.date, invoice: item.suggestedInvoice, status: item.status }))) },
  ];
  return <><PageHeader title="Finance Reports" description={`Collection and reconciliation summaries for the selected class · ${label}.`} /><FinanceNavigation /><SectionCard title="Available reports"><div className="divide-y px-5">{reports.map((report) => <div key={report.name} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-semibold">{report.name}</p><p className="text-xs text-muted">{report.detail}</p></div><Button variant="outline" onClick={report.download}><Download size={15} />Download</Button></div>)}</div></SectionCard></>;
}
