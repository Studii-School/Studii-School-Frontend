import assert from "node:assert/strict";
import test from "node:test";
import { parentPaymentInvoices, studentPaymentInvoices } from "../src/features/finance/payment-audience.ts";
import type { StudentInvoice } from "../src/features/finance/finance.types.ts";

const oldInvoice = { id: "old", studentId: "student-a", parentId: "parent-a", academicSession: "2026/2027", term: "First Term", status: "Unpaid", outstandingBalance: 500 } as StudentInvoice;
const otherInvoice = { ...oldInvoice, id: "other", studentId: "student-b", parentId: "parent-b" };

test("students can pay their own overdue invoice from an earlier term", () => {
  assert.deepEqual(studentPaymentInvoices([oldInvoice, otherInvoice], false, "student-a").map((invoice) => invoice.id), ["old"]);
});

test("parents can pay an earlier invoice for a linked child", () => {
  assert.deepEqual(parentPaymentInvoices([oldInvoice, otherInvoice], false, new Set(["student-a"])).map((invoice) => invoice.id), ["old"]);
});

test("backend authorized invoices remain visible if profile linkage has not loaded", () => {
  assert.deepEqual(parentPaymentInvoices([oldInvoice], true, new Set()).map((invoice) => invoice.id), ["old"]);
});

test("cancelled invoices never show a payment button", () => {
  assert.deepEqual(studentPaymentInvoices([{ ...oldInvoice, status: "Cancelled" }], true), []);
});
