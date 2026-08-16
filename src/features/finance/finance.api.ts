"use client";

import { apiRequest } from "@/lib/api";
import type { CheckoutInput, CheckoutResponse, Expense, FeeStructure, FinanceState, FinanceSummary, Payment, Receipt, RecordExpenseInput, RecordPaymentInput, StudentInvoice } from "./finance.types";

export const financeApi = {
  getState: () => apiRequest<FinanceState>("/finance"),
  getSummary: () => apiRequest<FinanceSummary>("/finance/summary"),
  getFeeStructures: () => apiRequest<FeeStructure[]>("/finance/fee-structures"),
  createFeeStructure: (input: Omit<FeeStructure, "id" | "studentsAssigned" | "expectedRevenue">) =>
    apiRequest<FeeStructure>("/finance/fee-structures", { method: "POST", body: JSON.stringify(input) }),
  activateFeeStructure: (id: string) =>
    apiRequest<{ fee: FeeStructure; invoicesCreated: number }>(`/finance/fee-structures/${id}/activate`, { method: "POST" }),
  getInvoices: () => apiRequest<StudentInvoice[]>("/finance/invoices"),
  getAudienceSummary: () => apiRequest<any>("/finance/admin/audience-summary"),
  getAdminTeacherFinance: () => apiRequest<any>("/finance/admin/teachers"),
  createTeacherFinanceEntry: (teacherId: string, input: any) =>
    apiRequest<any>(`/finance/admin/teachers/${teacherId}/entries`, { method: "POST", body: JSON.stringify(input) }),
  getTeacherFinance: () => apiRequest<any>("/finance/teacher"),
  getTeacherStudentStatus: () => apiRequest<any>("/finance/teacher/student-status"),
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

