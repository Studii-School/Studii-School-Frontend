import type { Student } from "@/features/academics/academics.types";
import type {
  AttendanceRegister,
  AttendanceStatus,
  AttendanceSummary,
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
};

function isDateKey(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value));
}

function schoolDaysInclusive(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let days = 0;
  for (let date = start; date <= end; date = new Date(date.getTime() + 86_400_000)) {
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) days += 1;
  }
  return days;
}

export function elapsedSchoolDays(period?: AttendancePeriod) {
  if (period?.requireStartDate && !isDateKey(period.startDate)) return undefined;
  if (!period || !isDateKey(period.startDate)) return undefined;
  const startDate = period.startDate!.slice(0, 10);
  const today = isDateKey(period.today) ? period.today!.slice(0, 10) : toLocalDateKey(new Date());
  const periodEnd = isDateKey(period.endDate) ? period.endDate!.slice(0, 10) : undefined;
  const end = periodEnd && periodEnd < today ? periodEnd : today;
  return schoolDaysInclusive(startDate, end);
}

export function summarizeRegister(
  register?: AttendanceRegister,
  totalOverride?: number,
): AttendanceSummary {
  const total = totalOverride ?? register?.entries.length ?? 0;
  const present =
    register?.entries.filter((item) => item.status === "PRESENT").length ?? 0;
  const absent =
    register?.entries.filter((item) => item.status === "ABSENT").length ?? 0;
  const late =
    register?.entries.filter((item) => item.status === "LATE").length ?? 0;
  const excused =
    register?.entries.filter((item) => item.status === "EXCUSED").length ?? 0;
  const unmarked = Math.max(
    0,
    total - present - absent - late - excused,
  );
  return {
    present,
    absent,
    late,
    excused,
    unmarked,
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
  return (period?.termId ? filterAttendanceByPeriod(registers, period) : filterAttendanceBySession(registers, period))
    .filter((item) => item.status === "SUBMITTED" || item.status === "REOPENED")
    .flatMap((item) =>
      item.entries
        .filter((entry) => entry.studentId === studentId)
        .map((entry) => ({ ...entry, date: item.date })),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
}

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
  // A school day counts as soon as it starts, even before its register is submitted.
  // Keep the marked counts separate so an unmarked day is not labelled absent.
  const elapsed = elapsedSchoolDays(period);
  const total = Math.max(elapsed ?? items.length, items.length);
  return {
    present,
    absent,
    late,
    excused,
    unmarked: Math.max(0, total - items.length),
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
  const start = isDateKey(period?.startDate) ? period!.startDate!.slice(0, 10) : undefined;
  const end = isDateKey(period?.endDate) ? period!.endDate!.slice(0, 10) : undefined;
  return registers.filter((register) =>
    (register.academicSessionId ?? register.sessionId) === sessionId &&
    (!period?.schoolId || register.schoolId === period.schoolId) &&
    (!start || register.date >= start) &&
    (!end || register.date <= end),
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
