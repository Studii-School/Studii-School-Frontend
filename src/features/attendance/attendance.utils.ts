import type { Student } from "@/features/academics/academics.types";
import type {
  AttendanceRegister,
  AttendanceStatus,
  AttendanceSummary,
} from "./attendance.types";

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
      ? Math.round(((present + late + excused) / total) * 100)
      : 0,
  };
}

export function attendanceHistoryForStudent(
  registers: AttendanceRegister[],
  studentId: string,
) {
  return registers
    .filter((item) => item.status === "SUBMITTED")
    .flatMap((item) =>
      item.entries
        .filter((entry) => entry.studentId === studentId)
        .map((entry) => ({ ...entry, date: item.date })),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getAttendanceSummaryForStudent(
  registers: AttendanceRegister[],
  studentId: string,
) {
  const items = attendanceHistoryForStudent(registers, studentId);
  const count = (status: AttendanceStatus) =>
    items.filter((item) => item.status === status).length;
  const present = count("PRESENT");
  const absent = count("ABSENT");
  const late = count("LATE");
  const excused = count("EXCUSED");
  return {
    present,
    absent,
    late,
    excused,
    total: items.length,
    percentage: items.length
      ? Math.round(((present + late + excused) / items.length) * 100)
      : 0,
  };
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
