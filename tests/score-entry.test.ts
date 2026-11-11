import assert from "node:assert/strict";
import test from "node:test";
import { buildScoreEntries } from "../src/features/results/score-entry.ts";
import type { AssessmentComponent, ResultStudentRow } from "../src/features/results/results.types.ts";

const components: AssessmentComponent[] = [
  { name: "CA1", weight: 10 },
  { name: "Assignment", weight: 10 },
  { name: "Exam", weight: 80 },
];

function student(id: string, saved: Record<string, number> = {}): ResultStudentRow {
  return {
    id,
    firstName: "Ada",
    lastName: id,
    admissionNumber: id,
    results: Object.keys(saved).length ? [{
      id: `result-${id}`,
      studentId: id,
      classId: "class-1",
      sessionId: "session-1",
      termId: "term-1",
      total: 0,
      average: 0,
      status: "DRAFT",
      locked: false,
      subjectScores: [{
        id: `score-${id}`,
        subjectId: "subject-1",
        components: saved,
        total: 0,
        grade: "",
        remark: "",
        status: "DRAFT",
        locked: false,
      }],
    }] : [],
  };
}

test("saving CA1 preserves a previously graded assignment and skips untouched students", () => {
  const rows = [student("student-1", { Assignment: 8 }), student("student-2")];
  assert.deepEqual(buildScoreEntries(rows, "subject-1", { "student-1": { CA1: "7" } }, components, "draft"), [
    { studentId: "student-1", components: { Assignment: 8, CA1: 7 } },
  ]);
});

test("a single CA score creates a draft entry without filling blank components", () => {
  assert.deepEqual(buildScoreEntries([student("student-1")], "subject-1", { "student-1": { CA1: "6" } }, components, "draft"), [
    { studentId: "student-1", components: { CA1: 6 } },
  ]);
});

test("zero is a recorded score and a cleared input removes only that component", () => {
  const rows = [student("student-1", { CA1: 5, Assignment: 8 })];
  assert.deepEqual(buildScoreEntries(rows, "subject-1", { "student-1": { CA1: "", Exam: "0" } }, components, "draft"), [
    { studentId: "student-1", components: { Assignment: 8, Exam: 0 } },
  ]);
});

test("partial scores remain drafts until every component is entered", () => {
  const rows = [student("student-1", { Assignment: 8 })];
  assert.throws(() => buildScoreEntries(rows, "subject-1", { "student-1": { CA1: "7" } }, components, "submit"), /enter every assessment score/);
  assert.deepEqual(buildScoreEntries(rows, "subject-1", { "student-1": { CA1: "7", Exam: "0" } }, components, "submit"), [
    { studentId: "student-1", components: { Assignment: 8, CA1: 7, Exam: 0 } },
  ]);
});

test("a completed saved draft can be submitted without entering scores again", () => {
  const rows = [student("student-1", { CA1: 7, Assignment: 8, Exam: 64 })];
  assert.deepEqual(buildScoreEntries(rows, "subject-1", {}, components, "submit"), [
    { studentId: "student-1", components: { CA1: 7, Assignment: 8, Exam: 64 } },
  ]);
});
