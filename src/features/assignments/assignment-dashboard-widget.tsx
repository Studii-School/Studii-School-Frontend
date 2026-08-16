"use client";

import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAcademics } from "@/features/academics/academics-context";
import { readStoredUser } from "@/lib/auth";
import { useAssignments } from "./assignments-context";
import type { PortalRole } from "@/features/dashboard-customisation/dashboard-widget.types";

function studentIdFromSession(students: { id: string; userId?: string }[]) {
  const user = readStoredUser();
  return user?.studentId ?? students.find((student) => student.userId === user?.id)?.id ?? "student-yusuf";
}

function linkedStudentIds(students: { id: string; userId?: string; guardianIds: string[] }[], guardians: { id: string; userId?: string }[]) {
  const user = readStoredUser();
  const guardianId = user?.guardianId ?? guardians.find((guardian) => guardian.userId === user?.id)?.id ?? "guardian-001";
  return new Set(students.filter((student) => (user?.childStudentIds ?? []).includes(student.id) || student.guardianIds.includes(guardianId)).map((student) => student.id));
}

export function AssignmentDashboardWidget({ role, widgetId, title }: { role: PortalRole; widgetId: string; title: string }) {
  const { state } = useAssignments();
  const { state: academics } = useAcademics();
  const now = new Date();
  const user = readStoredUser();
  const teacherId = user?.id ?? "teacher-user-001";
  const published = state.assignments.filter((item) => item.status === "PUBLISHED");
  const studentSubmissions = state.submissions.filter((item) => item.studentId === studentIdFromSession(academics.students));
  const linked = linkedStudentIds(academics.students, academics.guardians);
  let value = 0;
  let note = "Open assignments";

  if (widgetId === "admin-active-assignments") value = published.length;
  if (widgetId === "teacher-active-assignments") value = published.filter((item) => item.teacherUserId === teacherId).length;
  if (widgetId === "teacher-submissions-review") {
    const teacherAssignmentIds = new Set(state.assignments.filter((item) => item.teacherUserId === teacherId).map((item) => item.id));
    value = state.submissions.filter((item) => teacherAssignmentIds.has(item.assignmentId) && (item.status === "SUBMITTED" || item.status === "LATE")).length;
    note = "Submitted or late";
  }
  if (widgetId === "student-overdue-assignments") {
    value = studentSubmissions.filter((entry) => entry.status === "NOT_SUBMITTED" && new Date(state.assignments.find((item) => item.id === entry.assignmentId)?.dueAt ?? 0) < now).length;
    note = "Past due and incomplete";
  }
  if (widgetId === "parent-pending-assignments") {
    value = state.submissions.filter((entry) => linked.has(entry.studentId) && entry.status === "NOT_SUBMITTED").length;
    note = "Across linked children";
  }
  if (widgetId === "parent-completed-assignments") {
    value = state.submissions.filter((entry) => linked.has(entry.studentId) && entry.status !== "NOT_SUBMITTED").length;
    note = "Across linked children";
  }

  const href = role === "admin" ? "/admin/academics" : `/${role}/assignments`;
  return <Card className="h-full p-4"><div className="flex justify-between"><div><p className="text-sm text-muted">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-2 text-xs text-muted">{note}</p></div><span className="h-fit rounded-[10px] bg-primary-light p-2 text-[var(--school-primary)]"><ClipboardList size={18} /></span></div><a className="mt-3 inline-block text-xs font-semibold text-[var(--school-primary)]" href={href}>View assignments</a></Card>;
}
