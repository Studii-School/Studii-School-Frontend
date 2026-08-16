import { readStoredUser } from "@/lib/auth";
import type { AcademicsState, Student } from "@/features/academics/academics.types";

export function parentChildrenFromAcademics(academics: AcademicsState): Student[] {
  const user = readStoredUser();
  const linkedStudentIds = new Set(user?.childStudentIds ?? []);
  const email = user?.email?.trim().toLowerCase();
  const guardianIds = new Set(
    academics.guardians
      .filter((guardian) => guardian.userId === user?.id || (email && guardian.email?.trim().toLowerCase() === email))
      .map((guardian) => guardian.id),
  );
  if (user?.guardianId) guardianIds.add(user.guardianId);

  return academics.students.filter((student) =>
    linkedStudentIds.has(student.id) ||
    student.guardianIds.some((guardianId) => guardianIds.has(guardianId)) ||
    Boolean(email && student.guardianEmail?.trim().toLowerCase() === email),
  );
}

export function studentLabel(student: Pick<Student, "firstName" | "middleName" | "lastName" | "admissionNumber">) {
  const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
  return `${name} - ${student.admissionNumber}`;
}
