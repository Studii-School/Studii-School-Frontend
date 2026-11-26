"use client";

import Link from "@/features/navigation-progress/navigation-progress-link";
import { PersonNameLink } from "@/features/people/person-name-link";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { EmptyState } from "@/components/ui/empty-state";
import { TablePagination, usePaginatedRows } from "@/components/ui/table-pagination";
import { formatNaira } from "@/lib/currency";
import { formatDate } from "@/lib/date-utils";
import type { StudentInvoice } from "../finance.types";
import { InvoiceStatusBadge } from "./fee-status-badge";

export function InvoiceTable({ invoices, onRecord }: { invoices: StudentInvoice[]; onRecord?: (invoice: StudentInvoice) => void }) {
  const pagination = usePaginatedRows(invoices, `${invoices.length}|${invoices[0]?.id}|${invoices[invoices.length - 1]?.id}`);
  if (!invoices.length) return <EmptyState title="No invoices found" description="Assigned student invoices will appear here." />;

  return (
    <>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="bg-surface-muted text-xs uppercase text-muted">
          <tr>
            <th className="px-4 py-3"><input type="checkbox" aria-label="Select all invoices" /></th>
            {["Invoice", "Student", "Class", "Total", "Paid", "Balance", "Due", "Status", "Actions"].map((item) => <th key={item} className="px-4 py-3 font-medium">{item}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y">
          {pagination.rows.map((invoice) => (
            <ClickableTableRow key={invoice.id} href={`/admin/finance/invoices?invoice=${invoice.id}`} label={`invoice ${invoice.invoiceNumber}`}>
              <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${invoice.invoiceNumber}`} /></td>
              <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
              <td className="px-4 py-3"><p className="font-medium"><PersonNameLink kind="student" id={invoice.studentId}>{invoice.student}</PersonNameLink></p><p className="text-xs text-muted">{invoice.admissionNumber}</p></td>
              <td className="px-4 py-3">{invoice.className}</td>
              <td className="px-4 py-3">{formatNaira(invoice.totalAmount)}</td>
              <td className="px-4 py-3 text-success">{formatNaira(invoice.amountPaid)}</td>
              <td className="px-4 py-3 font-semibold">{formatNaira(invoice.outstandingBalance)}</td>
              <td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
              <td className="px-4 py-3"><InvoiceStatusBadge status={invoice.status} /></td>
              <td className="px-4 py-3"><div className="flex gap-2"><Link href={`/admin/finance/invoices?invoice=${invoice.id}`} className="text-xs font-semibold text-[var(--school-primary)]">View invoice</Link>{invoice.outstandingBalance > 0 && onRecord && <button className="text-xs font-semibold text-[var(--school-primary)]" onClick={() => onRecord(invoice)}>Record payment</button>}<button className="text-xs font-semibold text-muted">History</button></div></td>
            </ClickableTableRow>
          ))}
        </tbody>
      </table>
    </div>
    <TablePagination label="Invoices" total={pagination.total} page={pagination.page} pageCount={pagination.pageCount} pageSize={pagination.pageSize} start={pagination.start} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
    </>
  );
}
