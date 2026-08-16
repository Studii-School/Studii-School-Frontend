import type { AuthUser } from "@/lib/api";
import type { AcademicsState, Student } from "./academics.types";

type LooseUser = AuthUser & {
  admissionNumber?: string;
  profile?: unknown;
  student?: unknown;
  studentProfile?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function uniqueStrings(values: Array<string | undefined>) {
  return values.filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);
}

export function resolveStudentSession(
  academics: AcademicsState,
  user: AuthUser | null | undefined,
  fallbackStudentId?: string,
): { student?: Student; studentId?: string; classId?: string } {
  const looseUser = (user ?? {}) as LooseUser;
  const profile = asRecord(looseUser.profile);
  const nestedStudent = asRecord(looseUser.student ?? looseUser.studentProfile ?? profile.student);

  const candidateStudentIds = uniqueStrings([
    looseUser.studentId,
    firstString(nestedStudent.id, nestedStudent.studentId),
    looseUser.id,
    fallbackStudentId,
  ]);
  const candidateClassIds = uniqueStrings([
    firstString(nestedStudent.currentClassId, nestedStudent.classId),
    looseUser.currentClassId,
    looseUser.classId,
    looseUser.assignedClassIds?.[0],
  ]);
  const email = firstString(looseUser.email, nestedStudent.email);
  const admissionNumber = firstString(looseUser.admissionNumber, nestedStudent.admissionNumber);

  const student =
    academics.students.find((item) => candidateStudentIds.includes(item.id)) ??
    academics.students.find((item) => item.userId && item.userId === looseUser.id) ??
    academics.students.find((item) => email && item.email?.toLowerCase() === email.toLowerCase()) ??
    academics.students.find((item) => admissionNumber && item.admissionNumber.toLowerCase() === admissionNumber.toLowerCase());

  return {
    student,
    studentId: student?.id ?? candidateStudentIds[0],
    classId: student?.classId ?? student?.currentClassId ?? candidateClassIds[0],
  };
}
