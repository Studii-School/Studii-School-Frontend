"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNaira } from "@/lib/currency";
import { useFinance } from "../finance-context";
import type { Payment } from "../finance.types";

function compactReference(payment: Payment) {
  const preferred = payment.reference || payment.providerTransactionId || payment.txRef || payment.id;
  if (preferred.length <= 24) return preferred;
  if (/^\d+$/.test(preferred)) return preferred;
  return `${preferred.slice(0, 8)}...${preferred.slice(-8)}`;
}

export function PaymentTable({ payments }: { payments: Payment[] }) {
  const { state } = useFinance();
  const invoiceById = new Map(state.invoices.map((invoice) => [invoice.id, invoice]));

  if (!payments.length) {
    return <EmptyState title="No payments yet" description="Flutterwave and manually recorded payments will appear here." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-surface-muted text-xs uppercase text-muted">
          <tr>
            {["Reference", "Student", "Class", "Amount", "Method", "Provider", "Date", "Status"].map((item) => (
              <th key={item} className="px-4 py-3 font-medium">{item}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {payments.map((payment) => {
            const invoice = invoiceById.get(payment.invoiceId);
            const fullReference = payment.txRef || payment.reference || payment.providerTransactionId || payment.id;

            return (
              <tr key={payment.id}>
                <td className="px-4 py-3 font-medium">
                  <span title={fullReference} className="whitespace-nowrap">{compactReference(payment)}</span>
                </td>
                <td className="px-4 py-3">{payment.student}</td>
                <td className="px-4 py-3">{invoice?.className ?? "Not set"}</td>
                <td className="px-4 py-3 font-semibold">{formatNaira(payment.amount)}</td>
                <td className="px-4 py-3">{payment.method}</td>
                <td className="px-4 py-3">{payment.bankOrProvider ?? "School office"}</td>
                <td className="px-4 py-3">{payment.paymentDate}</td>
                <td className="px-4 py-3">
                  <Badge tone={payment.status === "Successful" ? "success" : payment.status === "Failed" ? "danger" : "warning"}>{payment.status}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
