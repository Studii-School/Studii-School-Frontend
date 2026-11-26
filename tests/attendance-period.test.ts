import assert from "node:assert/strict";
import test from "node:test";
import type { AttendanceRegister, AttendanceStatus } from "../src/features/attendance/attendance.types.ts";
import { backendAttendancePeriod } from "../src/features/attendance/attendance-backend-period.ts";
import { dateBelongsToPeriod } from "../src/features/academic-period/period-scope-utils.ts";
import {
  attendanceHistoryForStudent,
  filterAttendanceByPeriod,
  filterAttendanceBySession,
  getAttendanceSummaryForStudent,
  isAutomaticAbsentDay,
  selectAttendanceStudentId,
  summarizeRegister,
} from "../src/features/attendance/attendance.utils.ts";

const period = {
  academicSessionId: "session-2026",
  termId: "term-1",
  startDate: "2026-10-16",
  endDate: "2026-12-18",
  today: "2026-10-16",
};

function register(termId: string, status: AttendanceStatus, submitted = true): AttendanceRegister {
  return {
    id: `register-${termId}`,
    schoolId: "school-1",
    classId: "class-1",
    academicSessionId: period.academicSessionId,
    termId,
    date: "2026-10-16",
    status: submitted ? "SUBMITTED" : "DRAFT",
    teacherUserId: "teacher-1",
    entries: [{
      id: `entry-${termId}`,
      schoolId: "school-1",
      registerId: `register-${termId}`,
      studentId: "student-1",
      status,
      markedByUserId: "teacher-1",
      createdAt: "2026-10-16T08:00:00Z",
      updatedAt: "2026-10-16T08:00:00Z",
    }],
    auditHistory: [],
    createdAt: "2026-10-16T08:00:00Z",
    updatedAt: "2026-10-16T08:00:00Z",
  };
}

test("submitted attendance appears in the selected term and updates student metrics", () => {
  const registers = [register("term-1", "PRESENT"), register("term-2", "ABSENT")];
  assert.deepEqual(filterAttendanceByPeriod(registers, period).map((item) => item.id), ["register-term-1"]);
  const summary = getAttendanceSummaryForStudent(registers, "student-1", period);
  assert.equal(summary.present, 1);
  assert.equal(summary.absent, 0);
  assert.equal(summary.percentage, 100);
});

test("a saved draft is visible to staff but does not count in student attendance", () => {
  const registers = [register("term-1", "PRESENT", false)];
  assert.equal(filterAttendanceByPeriod(registers, period).length, 1);
  assert.equal(getAttendanceSummaryForStudent(registers, "student-1", period).present, 0);
  assert.equal(getAttendanceSummaryForStudent(registers, "student-1", period).autoAbsent, 1);
});

test("reopened submitted attendance remains visible during correction", () => {
  const reopened = { ...register("term-1", "PRESENT"), status: "REOPENED" as const };
  assert.equal(getAttendanceSummaryForStudent([reopened], "student-1", period).present, 1);
});

test("backend registers inherit period IDs from attendance entries", () => {
  assert.deepEqual(
    backendAttendancePeriod(
      { sessionId: undefined, termId: undefined },
      [{ sessionId: "session-2026", termId: "term-1" }],
    ),
    { academicSessionId: "session-2026", sessionId: "session-2026", termId: "term-1" },
  );
});

test("attendance rate grows with elapsed school days and resets for a new session", () => {
  const firstDay = register("term-1", "PRESENT");
  const sessionPeriod = { ...period, startDate: "2026-10-16", endDate: "2027-07-30", termId: undefined };
  assert.equal(getAttendanceSummaryForStudent([firstDay], "student-1", sessionPeriod).percentage, 100);

  const secondDay = { ...firstDay, id: "register-day-2", date: "2026-10-19", entries: [{ ...firstDay.entries[0], id: "entry-day-2", registerId: "register-day-2", status: "PRESENT" as const }] };
  const nextTermDay = { ...secondDay, termId: "term-2" };
  const unmarkedSecondDay = getAttendanceSummaryForStudent([firstDay], "student-1", { ...sessionPeriod, today: "2026-10-19" });
  assert.equal(unmarkedSecondDay.percentage, 50);
  assert.equal(unmarkedSecondDay.unmarked, 0);
  assert.equal(unmarkedSecondDay.absent, 1);
  assert.equal(unmarkedSecondDay.autoAbsent, 1);
  assert.equal(getAttendanceSummaryForStudent([firstDay, secondDay], "student-1", { ...sessionPeriod, today: "2026-10-19" }).percentage, 100);
  assert.equal(getAttendanceSummaryForStudent([firstDay, nextTermDay], "student-1", { ...sessionPeriod, today: "2026-10-19" }).percentage, 100);
  assert.equal(getAttendanceSummaryForStudent([firstDay, nextTermDay], "student-1", { ...period, today: "2026-10-19" }).present, 1);
  assert.equal(getAttendanceSummaryForStudent([firstDay, secondDay], "student-1", { ...sessionPeriod, today: "2026-10-20" }).percentage, 67);
  assert.equal(getAttendanceSummaryForStudent([firstDay, secondDay], "student-1", { ...sessionPeriod, today: "2026-10-18" }).percentage, 100);
  assert.equal(getAttendanceSummaryForStudent([firstDay, secondDay], "student-1", { ...sessionPeriod, endDate: "2026-10-19", today: "2026-10-30" }).percentage, 100);
  assert.equal(getAttendanceSummaryForStudent([firstDay], "student-1", { ...sessionPeriod, academicSessionId: "session-2027" }).percentage, 0);
});

test("ISO term dates from the backend preserve the student's attendance rate", () => {
  const isoPeriod = {
    ...period,
    startDate: "2026-10-01T00:00:00.000Z",
    endDate: "2026-12-18T00:00:00.000Z",
    requireStartDate: true,
  };
  assert.equal(dateBelongsToPeriod("2026-10-16", isoPeriod), true);
  assert.equal(getAttendanceSummaryForStudent([register("term-1", "PRESENT")], "student-1", isoPeriod).percentage, 8);
});

test("a term without configured dates still shows submitted attendance for that term", () => {
  const undatedPeriod = { ...period, startDate: "", endDate: "", requireStartDate: true };
  assert.equal(getAttendanceSummaryForStudent([register("term-1", "PRESENT")], "student-1", undatedPeriod).percentage, 100);
});

test("student attendance selects the sole ID returned by the personal attendance API", () => {
  assert.equal(selectAttendanceStudentId([register("term-1", "PRESENT")], "account-user-id"), "student-1");
});

test("submitted records remain visible when their owning session dates were configured incorrectly", () => {
  const saved = {
    ...register("term-1", "PRESENT"),
    date: "2026-11-11",
  };
  const selectedSession = {
    academicSessionId: period.academicSessionId,
    startDate: "2026-08-27",
    endDate: "2026-08-28",
    today: "2026-11-12",
  };

  assert.deepEqual(filterAttendanceByPeriod([saved], { ...selectedSession, termId: "term-1" }).map((item) => item.id), [saved.id]);
  assert.deepEqual(filterAttendanceBySession([saved], selectedSession).map((item) => item.id), [saved.id]);
  assert.deepEqual(attendanceHistoryForStudent([saved], "student-1", { ...selectedSession, studentStartDate: "2026-11-11" }).map((item) => item.date), ["2026-11-11"]);
  assert.equal(getAttendanceSummaryForStudent([saved], "student-1", selectedSession).present, 1);
  assert.deepEqual(filterAttendanceBySession([saved], { ...selectedSession, academicSessionId: "another-session" }), []);
});

test("missing submitted marks and wholly missing weekdays are auto absent until manually marked", () => {
  const first = register("term-1", "PRESENT");
  const omitted = { ...first, id: "register-monday", date: "2026-10-19", entries: [] };
  const active = { ...period, today: "2026-10-20", isCurrentPeriod: true };
  const history = attendanceHistoryForStudent([first, omitted], "student-1", active);
  assert.deepEqual(history.map((item) => [item.date, item.status, item.source]), [
    ["2026-10-20", "ABSENT", "AUTO"],
    ["2026-10-19", "ABSENT", "AUTO"],
    ["2026-10-16", "PRESENT", "MANUAL"],
  ]);
  assert.equal(getAttendanceSummaryForStudent([first, omitted], "student-1", active).autoAbsent, 2);
  assert.equal(summarizeRegister(omitted, 1, isAutomaticAbsentDay(omitted.date, active)).absent, 1);
  assert.equal(isAutomaticAbsentDay("2026-10-18", active), false);
  assert.equal(isAutomaticAbsentDay("2026-10-21", active), false);

  const manuallyAbsent = { ...omitted, entries: [{ ...first.entries[0], id: "manual-absent", status: "ABSENT" as const, markedByUserId: "admin-1" }] };
  const replaced = attendanceHistoryForStudent([first, manuallyAbsent], "student-1", active);
  assert.deepEqual(replaced.map((item) => [item.date, item.source]), [
    ["2026-10-20", "AUTO"],
    ["2026-10-19", "MANUAL"],
    ["2026-10-16", "MANUAL"],
  ]);
  assert.equal(replaced[1].markedByUserId, "admin-1");
});

test("active stale term dates extend to today and admission dates prevent earlier auto absences", () => {
  const active = { ...period, startDate: "2026-08-27", endDate: "2026-08-28", today: "2026-11-12", isCurrentPeriod: true, studentStartDate: "2026-11-11" };
  assert.deepEqual(attendanceHistoryForStudent([], "student-1", active).map((item) => item.date), ["2026-11-12", "2026-11-11"]);
  assert.equal(getAttendanceSummaryForStudent([], "student-1", active).absent, 2);
  assert.equal(getAttendanceSummaryForStudent([], "student-1", { ...active, isCurrentPeriod: false }).absent, 0);
});
