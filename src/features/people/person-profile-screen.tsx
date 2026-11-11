"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAcademics } from "@/features/academics/academics-context";
import { getClassesForTeacher } from "@/features/academics/academics.selectors";
import { resolveStudentSession } from "@/features/academics/student-session";
import { parentChildrenFromAcademics } from "@/features/parents/parent-child-utils";
import { PersonNameLink } from "./person-name-link";
import { readStoredUser } from "@/lib/auth";

type Kind = "student" | "staff" | "guardian";
type Role = "admin" | "teacher" | "parent" | "student";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}

export function PersonProfileScreen({ kind, id, role }: { kind: Kind; id: string; role: Role }) {
  const { state, isLoading } = useAcademics();
  const user = readStoredUser();
  if (isLoading) return <Card className="h-48 animate-pulse" />;

  if (kind === "student") {
    const student = state.students.find((item) => item.id === id);
    const allowed = role === "admin" ||
      (role === "teacher" && getClassesForTeacher(state, user?.id ?? "").some((item) => item.id === student?.classId)) ||
      (role === "parent" && parentChildrenFromAcademics(state).some((item) => item.id === id)) ||
      (role === "student" && resolveStudentSession(state, user).studentId === id);
    if (!student || !allowed) return <EmptyState title="Profile unavailable" description="This student profile is not available to your account." />;
    const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
    const schoolClass = state.classes.find((item) => item.id === student.classId);
    return <><PageHeader title={name} description="Student profile" showBack /><SectionCard title="Student details"><div className="flex flex-wrap items-center gap-4 p-5"><Avatar initials={`${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`} src={student.photoUrl} alt={`${name} profile`} /><h2 className="text-lg font-semibold">{name}</h2></div><dl className="grid gap-5 border-t p-5 sm:grid-cols-2"><Field label="Admission number" value={student.admissionNumber} /><Field label="Class" value={schoolClass?.displayName} /><Field label="School level" value={student.schoolLevel} /><Field label="Status" value={student.status} /></dl></SectionCard></>;
  }

  if (kind === "staff") {
    const staff = state.staff.find((item) => item.userId === id || item.id === id);
    const teacher = state.teachers.find((item) => item.userId === id || item.id === id);
    if (!staff && !teacher) return <EmptyState title="Profile unavailable" description="This staff profile could not be found." />;
    const name = staff?.fullName ?? `${teacher?.firstName ?? ""} ${teacher?.lastName ?? ""}`.trim();
    const staffUserId = staff?.userId ?? teacher?.userId ?? id;
    const classes = state.classes.filter((item) => item.classTeacherUserId === staffUserId || item.assignedTeacherUserIds?.includes(staffUserId));
    return <><PageHeader title={name} description="Staff profile" showBack /><SectionCard title="School staff"><div className="flex flex-wrap items-center gap-4 p-5"><Avatar initials={name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)} src={staff?.photoUrl ?? teacher?.photoUrl} alt={`${name} profile`} /><h2 className="text-lg font-semibold">{name}</h2></div><dl className="grid gap-5 border-t p-5 sm:grid-cols-2"><Field label="Role" value={staff?.jobTitle ?? "Teacher"} /><Field label="Department" value={staff?.department} /><Field label="Assigned classes" value={classes.map((item) => item.displayName).join(", ")} />{role === "admin" && <Field label="Email" value={staff?.email} />}</dl></SectionCard></>;
  }

  if (role !== "admin") return <EmptyState title="Profile unavailable" description="This parent profile is not available to your account." />;
  const guardian = state.guardians.find((item) => item.id === id || item.userId === id);
  if (!guardian) return <EmptyState title="Profile unavailable" description="This parent profile could not be found." />;
  const children = state.students.filter((student) => student.guardianIds.includes(guardian.id));
  return <><PageHeader title={guardian.fullName} description="Parent or guardian profile" showBack /><SectionCard title="Contact details"><dl className="grid gap-5 p-5 sm:grid-cols-2"><Field label="Name" value={guardian.fullName} /><Field label="Relationship" value={guardian.relationship} /><Field label="Email" value={guardian.email} /><Field label="Phone" value={guardian.phone} /><div><dt className="text-xs font-medium uppercase tracking-wide text-muted">Linked children</dt><dd className="mt-1 space-x-2 font-medium">{children.map((student) => <PersonNameLink key={student.id} kind="student" id={student.id}>{student.firstName} {student.lastName}</PersonNameLink>)}</dd></div></dl></SectionCard></>;
}
