import { PageHeader } from "@/components/dashboard/page-header";
import { StudentFinanceClassGrid } from "./components/student-finance-class-grid";
import { FinancePeriodFilter } from "./components/finance-period-filter";

export function StudentFinanceScreen() {
  return (
    <>
      <PageHeader
        title="Student Finance"
        description="Choose a class to view fees, invoices, payments, debtors, receipts and reports for only that class."
        backFallback="/admin/finance"
      />
      <FinancePeriodFilter />
      <StudentFinanceClassGrid baseHref="/admin/finance" />
    </>
  );
}
