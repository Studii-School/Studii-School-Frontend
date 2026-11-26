import assert from "node:assert/strict";
import test from "node:test";
import { formatDate, formatDateTime, formatTime } from "../src/lib/date-utils.ts";

test("dates use a clear day-month-year label", () => {
  assert.equal(formatDate("2026-11-11"), "11 Nov 2026");
});

test("timestamps omit seconds and show an uppercase day period", () => {
  assert.equal(formatDateTime("2026-11-11T07:59:47"), "11 Nov 2026, 7:59 AM");
  assert.equal(formatDateTime("2026-11-11T19:59:47"), "11 Nov 2026, 7:59 PM");
});

test("stored clock times display in twelve-hour form", () => {
  assert.equal(formatTime("00:00"), "12:00 AM");
  assert.equal(formatTime("12:00"), "12:00 PM");
  assert.equal(formatTime("16:05:30"), "4:05 PM");
});
