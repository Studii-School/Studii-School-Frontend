"use client";

import { apiRequest } from "@/lib/api";
import type { CheckoutInput, CheckoutResponse, CreateStaffFinanceEntryInput, Expense, FeeStructure, FinanceState, FinanceSummary, Payment, Receipt, RecordExpenseInput, RecordPaymentInput, StaffFinanceEntry, StaffFinanceRow, StudentInvoice } from "./finance.types";

type FinanceContext = { academicSessionId: string; termId: string };
const contextQuery = (context?: FinanceContext) => context ? `?sessionId=${encodeURIComponent(context.academicSessionId)}&termId=${encodeURIComponent(context.termId)}` : "";

export const financeApi = {
  getState: (context?: FinanceContext) => apiRequest<FinanceState>(`/finance${contextQuery(context)}`),
  getSummary: (context?: FinanceContext) => apiRequest<FinanceSummary>(`/finance/summary${contextQuery(context)}`),
  getFeeStructures: (context?: FinanceContext) => apiRequest<FeeStructure[]>(`/finance/fee-structures${contextQuery(context)}`),
  createFeeStructure: (input: Omit<FeeStructure, "id" | "studentsAssigned" | "expectedRevenue">) => {
    const { academicSessionId, ...body } = input;
    return apiRequest<FeeStructure>("/finance/fee-structures", { method: "POST", body: JSON.stringify({ ...body, sessionId: academicSessionId }) });
  },
  activateFeeStructure: (id: string) =>
    apiRequest<{ fee: FeeStructure; invoicesCreated: number }>(`/finance/fee-structures/${id}/activate`, { method: "POST" }),
  updateFeeStructure: (id: string, input: Partial<FeeStructure>) => {
    const { academicSessionId, ...body } = input;
    return apiRequest<FeeStructure>(`/finance/fee-structures/${id}`, { method: "PATCH", body: JSON.stringify({ ...body, ...(academicSessionId ? { sessionId: academicSessionId } : {}) }) });
  },
  deleteFeeStructure: (id: string) =>
    apiRequest<void>(`/finance/fee-structures/${id}`, { method: "DELETE" }),
  getInvoices: (context?: FinanceContext) => apiRequest<StudentInvoice[]>(`/finance/invoices${contextQuery(context)}`),
  getAudienceSummary: () => apiRequest<unknown>("/finance/admin/audience-summary"),
  getAdminTeacherFinance: () => apiRequest<{ staff?: StaffFinanceRow[]; teachers?: Array<Partial<StaffFinanceRow> & { teacherId: string; teacherName: string }> }>("/finance/admin/teachers"),
  createTeacherFinanceEntry: (teacherId: string, input: CreateStaffFinanceEntryInput) =>
    apiRequest<unknown>(`/finance/admin/teachers/${teacherId}/entries`, { method: "POST", body: JSON.stringify(input) }),
  preparePayrollRun: (period: string) =>
    apiRequest<{ period: string; created: number; alreadyPrepared?: boolean }>("/finance/admin/payroll/runs", { method: "POST", body: JSON.stringify({ period }) }),
  updateAdminStaffEntry: (entryId: string, input: { status: StaffFinanceEntry["status"]; paymentMethod?: string; paymentReference?: string; paymentNote?: string }) =>
    apiRequest<{ entry: StaffFinanceEntry }>(`/finance/admin/entries/${encodeURIComponent(entryId)}/status`, { method: "PATCH", body: JSON.stringify(input) }),
  getTeacherFinance: () => apiRequest<{ entries: StaffFinanceEntry[] }>("/finance/teacher"),
  getTeacherStudentStatus: () => apiRequest<{ students: Array<{ studentId: string; status: "No invoice" | "Paid in full" | "Part payment" | "Not paid" }> }>("/finance/teacher/student-status"),
  payTeacherFinanceEntry: (entryId: string, input: { method: string; reference: string; paymentDate?: string; note?: string }) =>
    apiRequest<unknown>(`/finance/teacher/entries/${entryId}/payment`, { method: "POST", body: JSON.stringify(input) }),
  recordPayment: (input: RecordPaymentInput) =>
    apiRequest<{ payment: Payment; receipt: Receipt }>("/finance/payments/manual", { method: "POST", body: JSON.stringify(input) }),
  getPayments: () => apiRequest<Payment[]>("/finance/payments"),
  createCheckout: (input: CheckoutInput) =>
    apiRequest<CheckoutResponse>("/finance/payments/flutterwave/checkout", { method: "POST", body: JSON.stringify(input) }),
  getExpenses: () => apiRequest<Expense[]>("/finance/expenses"),
  recordExpense: (input: RecordExpenseInput) =>
    apiRequest<Expense>("/finance/expenses", { method: "POST", body: JSON.stringify(input) }),
  getReceipts: () => apiRequest<Receipt[]>("/finance/receipts"),
};

