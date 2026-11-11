import assert from "node:assert/strict";
import test from "node:test";
import { matchesFinancePeriod } from "../src/features/finance/finance-period-matches.ts";

const selected = { academicSessionId: "session-2027", termId: "term-1", academicSession: "2027/2028", term: "First Term" };

test("a saved fee with selected period IDs remains visible", () => {
  assert.equal(matchesFinancePeriod({ ...selected }, selected), true);
});

test("backend invoices without period IDs use their session and term names", () => {
  assert.equal(matchesFinancePeriod({ academicSession: "2027/2028", term: "First Term" }, selected), true);
});

test("fees from another term stay out of the current student bill list", () => {
  assert.equal(matchesFinancePeriod({ ...selected, termId: "term-2", term: "Second Term" }, selected), false);
});

test("an ID on only one side falls back to the stored period name", () => {
  assert.equal(matchesFinancePeriod({ academicSessionId: "legacy", academicSession: "2027/2028", term: "First Term" }, { academicSession: "2027/2028", term: "First Term" }), true);
});

test("a legacy fee with current IDs but an old session label is not billed this term", () => {
  assert.equal(matchesFinancePeriod({ ...selected, academicSession: "2026/2027" }, selected), false);
});
