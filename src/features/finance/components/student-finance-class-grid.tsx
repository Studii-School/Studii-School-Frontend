"use client";

import { ArrowRight, GraduationCap } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { Card } from "@/components/ui/card";
import { BrandIcon } from "@/components/ui/brand-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { useAcademics } from "@/features/academics/academics-context";
import { sortClasses } from "@/features/academics/academics.class-utils";
import { formatNaira } from "@/lib/currency";
import { billableInvoices, studentAccountCounts, withClassScope } from "../finance-scope";
import { useFinanceView } from "../use-finance-view";

export function StudentFinanceClassGrid({ baseHref = "/admin/finance/payments" }: { baseHref?: string }) {
  const { state: academics } = useAcademics();
  const { state: finance, selectedTermOnly, label } = useFinanceView();
  const periodInvoices = finance.invoices;
  const academicClassCards = sortClasses(academics.classes.filter((item) => item.status === "ACTIVE")).map((schoolClass) => ({
    id: schoolClass.id,
    displayName: schoolClass.displayName,
    studentCount: schoolClass.studentIds.length || academics.students.filter((student) => student.classId === schoolClass.id).length,
    sortOrder: schoolClass.sortOrder,
  }));
  const academicClassIds = new Set(academicClassCards.map((item) => item.id));
  const invoiceClassCards = [...new Map(
    periodInvoices
      .filter((invoice) => invoice.classId && !academicClassIds.has(invoice.classId))
      .map((invoice) => [invoice.classId, { id: invoice.classId!, displayName: invoice.className, studentCount: new Set(periodInvoices.filter((item) => item.classId === invoice.classId).map((item) => item.studentId)).size, sortOrder: Number.MAX_SAFE_INTEGER }]),
  ).values()];
  const classCards = [...academicClassCards, ...invoiceClassCards].sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {classCards.map((schoolClass, index) => {
        const invoices = billableInvoices(periodInvoices.filter((invoice) => invoice.classId === schoolClass.id));
        const expected = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
        const outstanding = invoices.reduce((sum, invoice) => sum + invoice.outstandingBalance, 0);
        const accounts = studentAccountCounts(invoices);
        const invoiceIds = new Set(periodInvoices.filter((invoice) => invoice.classId === schoolClass.id).map((invoice) => invoice.id));
        const collected = finance.payments.filter((payment) => invoiceIds.has(payment.invoiceId) && payment.status === "Successful").reduce((sum, payment) => sum + payment.amount, 0);
        const classHref = withClassScope(baseHref, schoolClass.id);

        return (
          <Link key={schoolClass.id} href={selectedTermOnly ? `${classHref}&financePeriod=term` : classHref} className="block">
            <Card className="h-full p-5 transition hover:border-[var(--school-primary)] hover:shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{schoolClass.displayName}</p>
                  <p className="mt-1 text-sm text-muted">{schoolClass.studentCount} student(s)</p>
                  <p className="mt-1 text-xs text-muted">{label}</p>
                </div>
                <BrandIcon tone={(["primary", "secondary", "accent"] as const)[index % 3]} className="size-10">
                  <GraduationCap size={18} />
                </BrandIcon>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <span>
                  <b className="block">{formatNaira(expected)}</b>
                  <span className="text-xs text-muted">Expected</span>
                </span>
                <span>
                  <b className="block">{formatNaira(outstanding)}</b>
                  <span className="text-xs text-muted">Outstanding</span>
                </span>
              </div>
              <p className="mt-3 text-sm"><b>{formatNaira(collected)}</b> <span className="text-muted">collected</span></p>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-muted">{accounts.paid} paid · {accounts.partial} partial · {accounts.unpaid} unpaid</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--school-primary)]">
                  Open <ArrowRight size={15} />
                </span>
              </div>
            </Card>
          </Link>
        );
      })}
      {!classCards.length && <div className="sm:col-span-2 xl:col-span-3"><EmptyState title="No classes found" description="Create classes or invoices first, then student finance cards will appear here." /></div>}
    </div>
  );
}
