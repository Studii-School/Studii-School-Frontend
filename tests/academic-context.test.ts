import assert from "node:assert/strict";
import test from "node:test";
import {
  academicContextQuery,
  recordBelongsToAcademicContext,
  recordBelongsToAcademicSession,
  studentClassForAcademicSession,
} from "../src/features/academic-period/academic-context.ts";
import { assignmentBelongsToPeriod } from "../src/features/assignments/assignments-period-utils.ts";
import { eventBelongsToPeriod } from "../src/features/events/events-period-utils.ts";
import { filterTimetableByPeriod, findTimetableConflict, visibleTimetableEntries } from "../src/features/timetable/timetable-period-utils.ts";

const firstTerm = { schoolId: "school-a", academicSessionId: "2025", termId: "term-1" };
const secondTerm = { ...firstTerm, termId: "term-2" };
const nextSession = { ...firstTerm, academicSessionId: "2026", termId: "term-1-next" };
const owned = { schoolId: "school-a", academicSessionId: "2025", termId: "term-1" };

test("attendance remains in its owning term", () => assert.equal(recordBelongsToAcademicContext(owned, firstTerm), true));
test("attendance is hidden in another term", () => assert.equal(recordBelongsToAcademicContext(owned, secondTerm), false));
test("assignments are hidden in another session", () => assert.equal(recordBelongsToAcademicContext(owned, nextSession), false));
test("results are restored when switching back", () => assert.equal(recordBelongsToAcademicContext(owned, firstTerm), true));
test("fee invoices are hidden outside their term", () => assert.equal(recordBelongsToAcademicContext(owned, secondTerm), false));
test("another school's record is rejected", () => assert.equal(recordBelongsToAcademicContext({ ...owned, schoolId: "school-b" }, firstTerm), false));
test("an incomplete selected context never matches", () => assert.equal(recordBelongsToAcademicContext(owned, { ...firstTerm, termId: "" }), false));
test("an unowned legacy term record never matches by accident", () => assert.equal(recordBelongsToAcademicContext({ schoolId: "school-a" }, firstTerm), false));
test("canonical session id takes precedence over a conflicting legacy alias", () => assert.equal(recordBelongsToAcademicContext({ ...owned, sessionId: "2026" }, firstTerm), true));
test("legacy session alias remains readable during migration", () => assert.equal(recordBelongsToAcademicContext({ schoolId: "school-a", sessionId: "2025", termId: "term-1" }, firstTerm), true));
test("student enrollment matches its session independent of term", () => assert.equal(recordBelongsToAcademicSession({ schoolId: "school-a", academicSessionId: "2025" }, firstTerm), true));
test("student enrollment does not leak into the next session", () => assert.equal(recordBelongsToAcademicSession({ schoolId: "school-a", academicSessionId: "2025" }, nextSession), false));
test("historical class membership stays visible in its own session", () => assert.equal(studentClassForAcademicSession("class-2025", undefined, new Set(["class-2025"])), "class-2025"));
test("class membership does not leak into another session", () => assert.equal(studentClassForAcademicSession("class-2025", undefined, new Set(["class-2026"])), ""));
test("session enrollment history takes precedence over the student's current class", () => assert.equal(studentClassForAcademicSession("class-2026", "class-2025", new Set(["class-2025"])), "class-2025"));
test("API query maps internal session ownership to the backend sessionId contract", () => assert.equal(academicContextQuery(firstTerm).toString(), "sessionId=2025&termId=term-1"));
test("an assignment without explicit period ownership is hidden", () => assert.equal(assignmentBelongsToPeriod({} as never, firstTerm), false));
test("an assignment only appears in its exact term", () => {
  const assignment = { academicSessionId: "2025", termId: "term-1" } as never;
  assert.equal(assignmentBelongsToPeriod(assignment, firstTerm), true);
  assert.equal(assignmentBelongsToPeriod(assignment, secondTerm), false);
});
test("an unowned timetable row is never copied into every term", () => assert.deepEqual(filterTimetableByPeriod([{} as never], firstTerm), []));
test("a legacy timetable row appears only for the active term", () => {
  const entry = { id: "legacy", classId: "class-1", day: "MONDAY", startTime: "08:00", endTime: "08:40" } as never;
  assert.deepEqual(filterTimetableByPeriod([entry], { ...firstTerm, isCurrentPeriod: true }), [entry]);
  assert.deepEqual(filterTimetableByPeriod([entry], { ...secondTerm, isCurrentPeriod: false }), []);
});
test("backend weekly timetable remains visible when a different academic term is selected", () => {
  const entry = { id: "school-week", classId: "class-1", day: "MONDAY" } as never;
  assert.deepEqual(visibleTimetableEntries([entry], secondTerm, true), [entry]);
  assert.deepEqual(visibleTimetableEntries([entry], secondTerm, false), []);
});
test("a timetable entry with period IDs appears only in its selected term", () => {
  const entry = { academicSessionId: "2025", termId: "term-1" } as never;
  assert.deepEqual(filterTimetableByPeriod([entry], firstTerm), [entry]);
  assert.deepEqual(filterTimetableByPeriod([entry], secondTerm), []);
});
test("a timetable entry with a legacy session ID remains visible", () => {
  const entry = { sessionId: "2025", termId: "term-1" } as never;
  assert.deepEqual(filterTimetableByPeriod([entry], firstTerm), [entry]);
});
test("a legacy timetable term label matches the selected term label", () => {
  const entry = { academicSession: "2025/2026", term: "FIRST" } as never;
  assert.deepEqual(filterTimetableByPeriod([entry], { academicSession: "2025/2026", term: "First Term" }), [entry]);
});
test("timetable conflicts are restricted to the selected academic period", () => {
  const input = { classId: "class-1", subjectId: "math", day: "MONDAY", startTime: "08:00", endTime: "08:40", ...secondTerm };
  const firstTermEntry = { id: "first", classId: "class-1", day: "MONDAY", startTime: "08:10", endTime: "08:30", ...firstTerm };
  const secondTermEntry = { ...firstTermEntry, id: "second", ...secondTerm };
  assert.equal(findTimetableConflict([firstTermEntry as never], input as never), undefined);
  assert.equal(findTimetableConflict([firstTermEntry as never, secondTermEntry as never], input as never), secondTermEntry);
});
test("a visible legacy timetable row blocks a duplicate in the active term", () => {
  const input = { classId: "class-1", subjectId: "math", day: "MONDAY", startTime: "08:00", endTime: "08:40", ...firstTerm } as never;
  const legacy = { id: "legacy", classId: "class-1", day: "MONDAY", startTime: "08:10", endTime: "08:30" } as never;
  assert.equal(findTimetableConflict([legacy], input, undefined, true), legacy);
  assert.equal(findTimetableConflict([legacy], input, undefined, false), undefined);
});
test("a legacy labelled event is limited to that exact labelled period", () => {
  const event = { academicSession: "2025/2026", term: "First Term" } as never;
  assert.equal(eventBelongsToPeriod(event, { academicSession: "2025/2026", term: "First Term" }), true);
  assert.equal(eventBelongsToPeriod(event, { academicSession: "2025/2026", term: "Second Term" }), false);
});
