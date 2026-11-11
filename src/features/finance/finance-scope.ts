import { dateBelongsToPeriod } from "../academic-period/period-scope-utils.ts";
import type { FinanceState, FinanceSummary, Payment, Receipt, StudentInvoice } from "./finance.types";
import type { FeeStructure } from "./finance.types";
import { matchesFinancePeriod } from "./finance-period-matches.ts";

export const STUDENT_FINANCE_CLASS_PARAM = "classId";

export type FinancePeriodScope = {
  academicSessionId?: string;
  termId?: string;
  academicSession?: string;
  term?: string;
  startDate?: string;
  endDate?: string;
  requireStartDate?: boolean;
};

export function hasPeriodScope(scope?: FinancePeriodScope) {
  return Boolean(scope?.academicSession && scope?.term);
}

export function filterFeeStructuresByPeriod(fees: FeeStructure[], scope?: FinancePeriodScope) {
  if (!hasPeriodScope(scope)) return fees;
  return fees.filter((fee) => matchesFinancePeriod(fee, scope!));
}

export function filterInvoicesByPeriod(invoices: StudentInvoice[], scope?: FinancePeriodScope) {
  if (!hasPeriodScope(scope)) return invoices;
  return invoices.filter((invoice) => matchesFinancePeriod(invoice, scope!));
}

export function filterPaymentsByInvoices(payments: Payment[], invoices: StudentInvoice[]) {
  const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
  return payments.filter((payment) => invoiceIds.has(payment.invoiceId));
}

export function filterReceiptsByInvoices(receipts: Receipt[], invoices: StudentInvoice[]) {
  const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
  return receipts.filter((receipt) => invoiceIds.has(receipt.invoiceId));
}

export function selectedClassFromParams(searchParams: URLSearchParams) {
  return searchParams.get(STUDENT_FINANCE_CLASS_PARAM) ?? "";
}

export function withClassScope(href: string, classId?: string | null) {
  if (!classId) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${STUDENT_FINANCE_CLASS_PARAM}=${encodeURIComponent(classId)}`;
}

export function filterInvoicesByClass(invoices: StudentInvoice[], classId?: string | null) {
  if (!classId) return invoices;
  return invoices.filter((invoice) => invoice.classId === classId);
}

export function filterPaymentsByClass(payments: Payment[], invoices: StudentInvoice[], classId?: string | null) {
  if (!classId) return payments;
  const scopedStudentIds = new Set(filterInvoicesByClass(invoices, classId).map((invoice) => invoice.studentId));
  const scopedInvoiceIds = new Set(filterInvoicesByClass(invoices, classId).map((invoice) => invoice.id));
  return payments.filter((payment) => scopedStudentIds.has(payment.studentId) && scopedInvoiceIds.has(payment.invoiceId));
}

export function filterReceiptsByClass(receipts: Receipt[], invoices: StudentInvoice[], classId?: string | null) {
  if (!classId) return receipts;
  const scopedInvoiceIds = new Set(filterInvoicesByClass(invoices, classId).map((invoice) => invoice.id));
  return receipts.filter((receipt) => scopedInvoiceIds.has(receipt.invoiceId));
}

export function filterFinanceStateByPeriod(state: FinanceState, scope?: FinancePeriodScope): FinanceState {
  if (!hasPeriodScope(scope)) return state;
  const feeStructures = filterFeeStructuresByPeriod(state.feeStructures, scope);
  const invoices = filterInvoicesByPeriod(state.invoices, scope);
  const invoiceIds = new Set(invoices.map((item) => item.id));
  const invoiceNumbers = new Set(invoices.map((item) => item.invoiceNumber));
  const payments = state.payments.filter((item) => invoiceIds.has(item.invoiceId));
  const paymentIds = new Set(payments.map((item) => item.id));
  return {
    feeStructures,
    invoices,
    payments,
    receipts: state.receipts.filter((item) => invoiceIds.has(item.invoiceId) && paymentIds.has(item.paymentId)),
    expenses: state.expenses.filter((item) => dateBelongsToPeriod(item.expenseDate, scope)),
    reconciliationTransactions: state.reconciliationTransactions.filter((item) =>
      (item.suggestedInvoice ? invoiceNumbers.has(item.suggestedInvoice) : false) || dateBelongsToPeriod(item.date, scope),
    ),
    paymentPlans: state.paymentPlans.filter((item) => invoiceIds.has(item.invoiceId)),
    staffFinanceEntries: state.staffFinanceEntries.filter((item) =>
      dateBelongsToPeriod(item.paidAt || item.dueDate || item.createdAt, scope),
    ),
    activity: [],
  };
}

export function summarizeFinanceState(state: FinanceState): FinanceSummary {
  const invoices = billableInvoices(state.invoices);
  const totalExpected = invoices.reduce((sum, item) => sum + item.totalAmount, 0);
  const amountCollected = state.payments.filter((item) => item.status === "Successful").reduce((sum, item) => sum + item.amount, 0);
  const outstandingAmount = invoices.reduce((sum, item) => sum + item.outstandingBalance, 0);
  const needsReview = state.reconciliationTransactions.filter((item) => !["Auto-matched", "Manually matched"].includes(item.status)).length;
  const totalExpenses = state.expenses.reduce((sum, item) => sum + item.amount, 0);
  return {
    totalExpected,
    amountCollected,
    outstandingAmount,
    collectionRate: totalExpected ? Math.round((amountCollected / totalExpected) * 100) : 0,
    transactionCount: state.payments.length,
    reconciliationRate: state.reconciliationTransactions.length ? Math.round(((state.reconciliationTransactions.length - needsReview) / state.reconciliationTransactions.length) * 100) : 0,
    needsReview,
    totalExpenses,
    currentBalance: amountCollected - totalExpenses,
  };
}

export function billableInvoices(invoices: StudentInvoice[]) {
  return invoices.filter((invoice) => !["Cancelled", "Waived"].includes(invoice.status));
}

export function studentAccountCounts(invoices: StudentInvoice[]) {
  const accounts = new Map<string, { paid: number; outstanding: number }>();
  for (const invoice of billableInvoices(invoices)) {
    const account = accounts.get(invoice.studentId) ?? { paid: 0, outstanding: 0 };
    account.paid += invoice.amountPaid;
    account.outstanding += invoice.outstandingBalance;
    accounts.set(invoice.studentId, account);
  }
  const values = [...accounts.values()];
  return {
    paid: values.filter((account) => account.outstanding <= 0).length,
    partial: values.filter((account) => account.outstanding > 0 && account.paid > 0).length,
    unpaid: values.filter((account) => account.outstanding > 0 && account.paid <= 0).length,
  };
}

export function selectFinanceView(state: FinanceState, scope?: FinancePeriodScope, classId?: string | null): FinanceState {
  const periodState = filterFinanceStateByPeriod(state, scope);
  if (!classId) return periodState;
  const invoices = filterInvoicesByClass(periodState.invoices, classId);
  const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
  const invoiceNumbers = new Set(invoices.map((invoice) => invoice.invoiceNumber));
  return {
    ...periodState,
    invoices,
    payments: filterPaymentsByInvoices(periodState.payments, invoices),
    receipts: filterReceiptsByInvoices(periodState.receipts, invoices),
    paymentPlans: periodState.paymentPlans.filter((plan) => invoiceIds.has(plan.invoiceId)),
    reconciliationTransactions: periodState.reconciliationTransactions.filter((item) => Boolean(item.suggestedInvoice && invoiceNumbers.has(item.suggestedInvoice))),
    // School expenses and payroll have no student class allocation.
    expenses: [],
    staffFinanceEntries: [],
  };
}
