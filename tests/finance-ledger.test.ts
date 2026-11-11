import assert from "node:assert/strict";
import test from "node:test";
import { selectFinanceView, studentAccountCounts, summarizeFinanceState } from "../src/features/finance/finance-scope.ts";
import type { FinanceState, Payment, StudentInvoice } from "../src/features/finance/finance.types.ts";

const invoice = (id: string, overrides: Partial<StudentInvoice> = {}): StudentInvoice => ({
  id, invoiceNumber: id, studentId: id, student: id, admissionNumber: id, parentId: "parent", parent: "Parent", parentPhone: "", classId: "primary-1", className: "Primary 1", academicSession: "2026/2027", term: "First Term", totalAmount: 250000, amountPaid: 0, outstandingBalance: 250000, dueDate: "2026-10-01", status: "Unpaid", paymentPlan: "Full payment", ...overrides,
});
const paid = invoice("paid", { amountPaid: 250000, outstandingBalance: 0, status: "Paid" });
const payment: Payment = { id: "payment", invoiceId: paid.id, studentId: paid.studentId, student: paid.student, amount: 250000, paymentDate: "2026-10-16", method: "Flutterwave", reference: "10556186", payerName: "Parent", recordedBy: "Flutterwave", status: "Successful" };
const state: FinanceState = { feeStructures: [], invoices: [paid, invoice("unpaid"), invoice("other", { classId: "primary-2" })], payments: [payment], receipts: [], expenses: [], staffFinanceEntries: [], paymentPlans: [], reconciliationTransactions: [], activity: [] };

test("Primary 1 all-term summary includes the confirmed payment and old outstanding invoice", () => {
  const view = selectFinanceView(state, undefined, "primary-1");
  const summary = summarizeFinanceState(view);
  assert.equal(summary.totalExpected, 500000);
  assert.equal(summary.amountCollected, 250000);
  assert.equal(summary.outstandingAmount, 250000);
  assert.equal(summary.collectionRate, 50);
  assert.deepEqual(studentAccountCounts(view.invoices), { paid: 1, partial: 0, unpaid: 1 });
  assert.equal(view.payments.length, 1);
});

test("explicit 2027/2028 view does not reassign a previous year's payment", () => {
  const view = selectFinanceView(state, { academicSession: "2027/2028", term: "First Term" }, "primary-1");
  assert.equal(view.invoices.length, 0);
  assert.equal(view.payments.length, 0);
  assert.equal(summarizeFinanceState(view).amountCollected, 0);
});

test("settling an old invoice in a later year still belongs to its invoice term", () => {
  const view = selectFinanceView({ ...state, payments: [{ ...payment, paymentDate: "2027-10-16" }] }, { academicSession: "2026/2027", term: "First Term", startDate: "2026-09-01", endDate: "2026-12-31" }, "primary-1");
  assert.equal(summarizeFinanceState(view).amountCollected, 250000);
});

test("accounts are counted by student and all their invoices must be settled", () => {
  assert.deepEqual(studentAccountCounts([paid, invoice("second-bill", { studentId: paid.studentId }), invoice("cancelled", { status: "Cancelled" })]), { paid: 0, partial: 1, unpaid: 0 });
  assert.deepEqual(studentAccountCounts([paid, { ...paid, id: "another-paid" }]), { paid: 1, partial: 0, unpaid: 0 });
});

test("failed and pending payments never increase collections; cancelled and waived bills are not debt", () => {
  const summary = summarizeFinanceState({ ...state, invoices: [paid, invoice("cancelled", { status: "Cancelled" }), invoice("waived", { status: "Waived" })], payments: [payment, { ...payment, id: "failed", status: "Failed" }, { ...payment, id: "pending", status: "Pending" }] });
  assert.equal(summary.totalExpected, 250000);
  assert.equal(summary.amountCollected, 250000);
  assert.equal(summary.outstandingAmount, 0);
});

test("class reports, receipts, reconciliation and plans use the same invoice scope", () => {
  const view = selectFinanceView({ ...state,
    receipts: [{ invoiceId: "paid", paymentId: "payment" }, { invoiceId: "other", paymentId: "other-payment" }] as FinanceState["receipts"],
    paymentPlans: [{ id: "plan", invoiceId: "paid", name: "Plan", instalments: [] }, { id: "other-plan", invoiceId: "other", name: "Plan", instalments: [] }],
    reconciliationTransactions: [{ id: "one", suggestedInvoice: "paid" }, { id: "two", suggestedInvoice: "other" }, { id: "unassigned" }] as FinanceState["reconciliationTransactions"],
  }, undefined, "primary-1");
  assert.equal(view.receipts.length, 1);
  assert.equal(view.paymentPlans.length, 1);
  assert.deepEqual(view.reconciliationTransactions.map((item) => item.id), ["one"]);
});
