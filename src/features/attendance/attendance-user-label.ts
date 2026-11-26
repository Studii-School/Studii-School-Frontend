import type { AcademicsState } from "@/features/academics/academics.types";

export function attendanceUserLabel(
  userId: string | undefined,
  academics: AcademicsState,
  user?: { name?: string | null; email?: string | null },
) {
  if (user?.name?.trim()) return user.name.trim();

  const staff = academics.staff.find((item) => item.userId === userId);
  if (staff) return staff.fullName || `${staff.firstName} ${staff.lastName}`.trim();

  const teacher = academics.teachers.find((item) => item.userId === userId);
  if (teacher) return `${teacher.firstName} ${teacher.lastName}`.trim();

  if (user?.email?.trim()) return user.email.trim();
  return userId ? "Unknown user" : "-";
}

export function attendanceActorLabel(
  userId: string | undefined,
  academics: AcademicsState,
  user?: { name?: string | null; email?: string | null; role?: string },
  auditRole?: string,
) {
  const role = auditRole ?? user?.role;
  const roleLabel = role === "SCHOOL_ADMIN" || role === "ADMIN"
    ? "Admin"
    : role === "TEACHER" || academics.teachers.some((teacher) => teacher.userId === userId)
      ? "Teacher"
      : "Staff";
  return `${roleLabel} · ${attendanceUserLabel(userId, academics, user)}`;
}
