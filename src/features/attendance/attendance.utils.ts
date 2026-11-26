import type { Student } from "@/features/academics/academics.types";
import type {
  AttendanceRegister,
  AttendanceStatus,
  AttendanceSummary,
  StudentAttendanceEntry,
} from "./attendance.types";
import { toLocalDateKey } from "../../lib/date-utils.ts";

export type AttendancePeriod = {
  schoolId?: string;
  academicSessionId?: string;
  sessionId?: string;
  termId?: string;
  startDate?: string;
  endDate?: string;
  today?: string;
  requireStartDate?: boolean;
  isCurrentPeriod?: boolean;
  studentStartDate?: string;
};

function isDateKey(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value));
}

function schoolDayDates(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const days: string[] = [];
  for (let date = start; date <= end; date = new Date(date.getTime() + 86_400_000)) {
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

export function elapsedSchoolDates(period?: AttendancePeriod) {
  if (period?.requireStartDate && !isDateKey(period.startDate)) return undefined;
  if (!period || !isDateKey(period.startDate)) return undefined;
  const configuredStart = period.startDate!.slice(0, 10);
  const admissionDate = isDateKey(period.studentStartDate) ? period.studentStartDate!.slice(0, 10) : undefined;
  const startDate = admissionDate && admissionDate > configuredStart ? admissionDate : configuredStart;
  const today = isDateKey(period.today) ? period.today!.slice(0, 10) : toLocalDateKey(new Date());
  const periodEnd = isDateKey(period.endDate) ? period.endDate!.slice(0, 10) : undefined;
  const end = !period.isCurrentPeriod && periodEnd && periodEnd < today ? periodEnd : today;
  return schoolDayDates(startDate, end);
}

export function elapsedSchoolDays(period?: AttendancePeriod) {
  return elapsedSchoolDates(period)?.length;
}

export function isAutomaticAbsentDay(date: string, period?: AttendancePeriod) {
  return elapsedSchoolDates(period)?.includes(date) ?? false;
}

export function summarizeRegister(
  register?: AttendanceRegister,
  totalOverride?: number,
  autoAbsent = false,
): AttendanceSummary {
  const total = totalOverride ?? register?.entries.length ?? 0;
  const present =
    register?.entries.filter((item) => item.status === "PRESENT").length ?? 0;
  const markedAbsent =
    register?.entries.filter((item) => item.status === "ABSENT").length ?? 0;
  const late =
    register?.entries.filter((item) => item.status === "LATE").length ?? 0;
  const excused =
    register?.entries.filter((item) => item.status === "EXCUSED").length ?? 0;
  const unmarked = Math.max(
    0,
    total - present - markedAbsent - late - excused,
  );
  const absent = markedAbsent + (autoAbsent ? unmarked : 0);
  return {
    present,
    absent,
    late,
    excused,
    unmarked: autoAbsent ? 0 : unmarked,
    total,
    percentage: total
      ? Math.round(((present + late) / total) * 100)
      : 0,
  };
}

export function attendanceHistoryForStudent(
  registers: AttendanceRegister[],
  studentId: string,
  period?: AttendancePeriod,
) {
  if (!studentId) return [] as AttendanceHistoryItem[];
  const manual = (period?.termId ? filterAttendanceByPeriod(registers, period) : filterAttendanceBySession(registers, period))
    .filter((item) => item.status === "SUBMITTED" || item.status === "REOPENED")
    .flatMap((item) =>
      item.entries
        .filter((entry) => entry.studentId === studentId)
        .map((entry): AttendanceHistoryItem => ({ ...entry, date: item.date, classId: item.classId, source: "MANUAL" })),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  const byDate = new Map<string, AttendanceHistoryItem>();
  for (const item of manual) if (!byDate.has(item.date)) byDate.set(item.date, item);
  for (const date of elapsedSchoolDates(period) ?? []) {
    if (byDate.has(date)) continue;
    byDate.set(date, {
      id: `auto-absent-${studentId}-${date}`,
      schoolId: period?.schoolId ?? "",
      registerId: "",
      classId: "",
      studentId,
      status: "ABSENT",
      markedByUserId: "",
      source: "AUTO",
      date,
      createdAt: `${date}T00:00:00.000Z`,
      updatedAt: `${date}T00:00:00.000Z`,
    });
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export type AttendanceHistoryItem = StudentAttendanceEntry & {
  date: string;
  classId: string;
  source: "AUTO" | "MANUAL";
};

export function getAttendanceSummaryForStudent(
  registers: AttendanceRegister[],
  studentId: string,
  period?: AttendancePeriod,
) {
  const today = isDateKey(period?.today) ? period!.today!.slice(0, 10) : toLocalDateKey(new Date());
  const itemsByDate = new Map<string, ReturnType<typeof attendanceHistoryForStudent>[number]>();
  for (const item of attendanceHistoryForStudent(registers, studentId, period)) {
    if (item.date <= today && !itemsByDate.has(item.date)) itemsByDate.set(item.date, item);
  }
  const items = [...itemsByDate.values()];
  const count = (status: AttendanceStatus) =>
    items.filter((item) => item.status === status).length;
  const present = count("PRESENT");
  const absent = count("ABSENT");
  const late = count("LATE");
  const excused = count("EXCUSED");
  const total = items.length;
  return {
    present,
    absent,
    late,
    excused,
    unmarked: 0,
    autoAbsent: items.filter((item) => item.source === "AUTO").length,
    total,
    percentage: total
      ? Math.round(((present + late) / total) * 100)
      : 0,
  };
}

export function selectAttendanceStudentId(registers: AttendanceRegister[], preferredId?: string) {
  const registeredIds = [...new Set(registers.flatMap((register) => register.entries.map((entry) => entry.studentId)).filter(Boolean))];
  if (preferredId && registeredIds.includes(preferredId)) return preferredId;
  if (registeredIds.length === 1) return registeredIds[0];
  return preferredId ?? "";
}

export function attendanceRegisterBelongsToPeriod(
  register: AttendanceRegister,
  period?: AttendancePeriod,
) {
  const registerSessionId = register.academicSessionId ?? register.sessionId;
  const periodSessionId = period?.academicSessionId ?? period?.sessionId;
  if (!periodSessionId || !period?.termId) return false;
  return registerSessionId === periodSessionId && register.termId === period.termId;
}

export function filterAttendanceByPeriod(
  registers: AttendanceRegister[],
  period?: AttendancePeriod,
) {
  return registers.filter((register) => attendanceRegisterBelongsToPeriod(register, period));
}

export function filterAttendanceBySession(
  registers: AttendanceRegister[],
  period?: AttendancePeriod,
) {
  const sessionId = period?.academicSessionId ?? period?.sessionId;
  if (!sessionId) return [];
  // The saved session ID owns the register even when configured session dates are stale.
  return registers.filter((register) =>
    (register.academicSessionId ?? register.sessionId) === sessionId &&
    (!period?.schoolId || register.schoolId === period.schoolId),
  );
}

export function studentName(studentId: string, students?: Student[]) {
  const academicStudent = students?.find((item) => item.id === studentId);
  if (academicStudent) {
    return `${academicStudent.firstName} ${academicStudent.lastName}`.trim();
  }
  return studentId;
}

export function canTeacherManageClassAttendance(
  teacherUserId: string,
  classId: string,
  assignedClassIds: string[] = [],
) {
  return assignedClassIds.includes(classId);
}
