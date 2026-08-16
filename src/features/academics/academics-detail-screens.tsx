"use client";

import Link from "@/features/navigation-progress/navigation-progress-link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademics } from "./academics-context";
import {
  getClassById,
  getStudentsByClass,
  getTeacherByUserId,
  getTeachersByClass,
} from "./academics.selectors";
import type { SchoolClass, Subject, TeacherClassAssignment } from "./academics.types";

function displayDate(value?: string | null) {
  if (!value) return "Not provided";
  return new Date(value).toLocaleDateString();
}

function className(item?: Pick<SchoolClass, "name" | "displayName" | "section">) {
  if (!item) return "Unknown class";
  return item.displayName ?? [item.name, item.section].filter(Boolean).join(" ");
}

function subjectName(item?: Pick<Subject, "name" | "code">) {
  if (!item) return "Unknown subject";
  return item.code ? `${item.name} (${item.code})` : item.name;
}

function assignmentRoleLabel(type: TeacherClassAssignment["assignmentType"]) {
  if (type === "CLASS_TEACHER") return "Class Teacher";
  if (type === "SUBJECT_TEACHER") return "Subject Teacher";
  return "Class Access";
}

function DetailGrid({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-surface-muted p-4">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-1 font-semibold">{value || "Not provided"}</p>
        </div>
      ))}
    </div>
  );
}

export function AdminClassDetailScreen({ classId }: { classId: string }) {
  const { state } = useAcademics();
  const item = getClassById(state, classId);

  if (!item) {
    return (
      <EmptyState
        title="Class not found"
        description="The class may have been archived or removed."
      />
    );
  }

  const students = getStudentsByClass(state, item.id);
  const teachers = getTeachersByClass(state, item.id);
  const classTeacher = getTeacherByUserId(state, item.classTeacherUserId ?? "");

  return (
    <>
      <PageHeader
        title={item.displayName}
        description="Class membership, capacity and assigned teaching staff."
        action={
          <div className="flex flex-wrap gap-2">
            <Link className={buttonStyles("outline")} href={`/admin/academics/classes?class=${item.id}`}>
              <Pencil size={15} />Edit class
            </Link>
            <Link className="font-semibold text-[var(--school-primary)]" href="/admin/staff/assignments">
              Assign teachers
            </Link>
          </div>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted">School level</p><b>{item.level}</b></Card>
        <Card className="p-4"><p className="text-xs text-muted">Students</p><b>{students.length} / {item.capacity ?? "-"}</b></Card>
        <Card className="p-4"><p className="text-xs text-muted">Class teacher</p><b>{classTeacher ? `${classTeacher.firstName} ${classTeacher.lastName}` : "Unassigned"}</b></Card>
        <Card className="p-4"><p className="text-xs text-muted">Status</p><Badge tone={item.status === "ACTIVE" ? "success" : "neutral"}>{item.status}</Badge></Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Students">
          <div className="divide-y px-5">
            {students.map((student) => (
              <div key={student.id} className="py-3">
                <b className="text-sm">{student.firstName} {student.lastName}</b>
                <p className="text-xs text-muted">{student.admissionNumber}</p>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Assigned teachers">
          <div className="divide-y px-5">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="py-3">
                <b className="text-sm">{teacher.firstName} {teacher.lastName}</b>
                <p className="text-xs text-muted">{teacher.staffId}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export function AdminTeacherDetailScreen({ teacherId }: { teacherId: string }) {
  const { state, removeTeacherAssignment, removeStaff } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const router = useRouter();
  const staff =
    state.staff.find((item) => item.userId === teacherId || item.id === teacherId) ??
    state.staff.find((item) => item.email === teacherId);

  if (!staff) {
    return (
      <EmptyState
        title="Staff member not found"
        description="Choose a staff member from the Staff & HR directory."
      />
    );
  }

  const teacherAssignments = state.teacherAssignments.filter((item) => item.teacherUserId === staff.userId);
  const assignedClassIds = [...new Set(teacherAssignments.map((item) => item.classId))];
  const subjectIds = [...new Set(teacherAssignments.flatMap((item) => item.subjectIds))];
  const assignedClasses = assignedClassIds.length
    ? resolveClasses(undefined, assignedClassIds, state.classes)
    : resolveClasses(staff.assignedClasses, staff.assignedClassIds, state.classes);
  const subjects = subjectIds.length
    ? resolveSubjects(undefined, subjectIds, state.subjects)
    : resolveSubjects(staff.subjects, staff.subjectIds, state.subjects);
  const removeAssignment = (assignment: TeacherClassAssignment) => {
    const schoolClass = getClassById(state, assignment.classId);
    const subjectList = assignment.subjectIds
      .map((subjectId) => subjectName(state.subjects.find((subject) => subject.id === subjectId)))
      .join(", ");
    confirm({
      title: "Remove teacher assignment?",
      description: `${staff.fullName} will lose ${schoolClass ? className(schoolClass) : "this class"} ${assignmentRoleLabel(assignment.assignmentType).toLowerCase()} access${subjectList ? ` for ${subjectList}` : ""}.`,
      confirmLabel: "Remove assignment",
      destructive: true,
      onConfirm: async () => {
        await removeTeacherAssignment(assignment.id);
        toast("Teacher assignment removed.", "success");
      },
    });
  };
  const deleteTeacher = () => {
    confirm({
      title: "Delete teacher?",
      description: `${staff.fullName} will be removed from active staff and moved to Trash for 3 months.`,
      confirmLabel: "Delete teacher",
      destructive: true,
      onConfirm: async () => {
        await removeStaff(staff.userId);
        toast("Teacher moved to Trash.", "success");
        router.push("/admin/staff");
      },
    });
  };

  return (
    <>
      <PageHeader
        title={staff.fullName}
        description={`${staff.employeeNumber ?? staff.userId} - ${staff.jobTitle}`}
        action={
          staff.isTeachingStaff ? (
            <div className="flex flex-wrap gap-2">
              <Link className={buttonStyles("outline")} href={`/admin/staff/assignments?teacher=${staff.userId}`}>
                Assign classes
              </Link>
              <Button variant="danger" onClick={deleteTeacher}><Trash2 size={15} />Delete teacher</Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted">Status</p><Badge tone={staff.status === "ACTIVE" ? "success" : "warning"}>{staff.status}</Badge></Card>
        <Card className="p-4"><p className="text-xs text-muted">Role</p><b>{staff.role}</b></Card>
        <Card className="p-4"><p className="text-xs text-muted">Assigned classes</p><b>{assignedClasses.length}</b></Card>
        <Card className="p-4"><p className="text-xs text-muted">Subjects</p><b>{subjects.length}</b></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <SectionCard title="Personal information">
          <div className="p-5">
            <DetailGrid
              rows={[
                ["Full name", staff.fullName],
                ["Staff ID", staff.employeeNumber ?? staff.staffId ?? "Not provided"],
                ["Email", staff.email],
                ["Phone", staff.phone ?? "Not provided"],
                ["Gender", staff.gender ?? "Not provided"],
                ["Date of birth", displayDate(staff.dateOfBirth)],
                ["Department", staff.department ?? "Not provided"],
                ["Address", staff.address ?? "Not provided"],
                ["Teaching staff", staff.isTeachingStaff ? "Yes" : "No"],
                ["Created", displayDate(staff.createdAt)],
              ]}
            />
          </div>
        </SectionCard>

        <SectionCard title="Account">
          <div className="p-5">
            <DetailGrid
              rows={[
                ["User ID", staff.userId],
                ["Account status", staff.status],
                ["Job title", staff.jobTitle],
                ["Last updated", displayDate(staff.updatedAt)],
              ]}
            />
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <AssignmentListSection
          title="Class teacher for"
          assignments={teacherAssignments.filter((item) => item.assignmentType === "CLASS_TEACHER")}
          classes={state.classes}
          subjects={state.subjects}
          empty="No class-teacher responsibility."
          onRemove={removeAssignment}
        />
        <AssignmentListSection
          title="Assigned classes"
          assignments={teacherAssignments.filter((item) => item.assignmentType === "GENERAL_ACCESS")}
          classes={state.classes}
          subjects={state.subjects}
          empty="No assigned classes."
          onRemove={removeAssignment}
        />
        <AssignmentListSection
          title="Subjects taught"
          assignments={teacherAssignments.filter((item) => item.assignmentType === "SUBJECT_TEACHER")}
          classes={state.classes}
          subjects={state.subjects}
          empty="No assigned subjects."
          onRemove={removeAssignment}
        />
      </div>

      <div className="mt-5 flex justify-end">
        <Link href="/admin/staff">
          <Button variant="outline">Back to staff</Button>
        </Link>
      </div>
    </>
  );
}

function resolveClasses(
  embedded: SchoolClass[] | undefined,
  ids: string[],
  allClasses: SchoolClass[],
) {
  return embedded?.length
    ? embedded
    : ids.map((id) => allClasses.find((item) => item.id === id)).filter((item): item is SchoolClass => Boolean(item));
}

function resolveSubjects(
  embedded: Subject[] | undefined,
  ids: string[],
  allSubjects: Subject[],
) {
  return embedded?.length
    ? embedded
    : ids.map((id) => allSubjects.find((item) => item.id === id)).filter((item): item is Subject => Boolean(item));
}

function AssignmentListSection({
  title,
  assignments,
  classes,
  subjects,
  empty,
  onRemove,
}: {
  title: string;
  assignments: TeacherClassAssignment[];
  classes: SchoolClass[];
  subjects: Subject[];
  empty: string;
  onRemove: (assignment: TeacherClassAssignment) => void;
}) {
  return (
    <SectionCard title={title}>
      <div className="divide-y px-5">
        {assignments.length ? (
          assignments.map((assignment) => {
            const schoolClass = classes.find((item) => item.id === assignment.classId);
            const subjectList = assignment.subjectIds
              .map((subjectId) => subjectName(subjects.find((subject) => subject.id === subjectId)))
              .join(", ");
            return (
              <div key={assignment.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{schoolClass ? className(schoolClass) : "Unknown class"}</p>
                  <p className="truncate text-xs text-muted">{subjectList || assignmentRoleLabel(assignment.assignmentType)}</p>
                </div>
                <Button variant="outline" className="min-h-9 shrink-0 px-3" onClick={() => onRemove(assignment)}>
                  Remove
                </Button>
              </div>
            );
          })
        ) : (
          <p className="py-8 text-center text-sm text-muted">{empty}</p>
        )}
      </div>
    </SectionCard>
  );
}
