"use client";

import Link from "@/features/navigation-progress/navigation-progress-link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileImageField } from "@/components/shared/profile-image-field";
import { SectionCard } from "@/components/dashboard/section-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/number-input";
import { MultiSelect, Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { TeacherTimetableModal } from "@/features/timetable/timetable-screens";
import { formatNaira } from "@/lib/currency";
import { useAcademics } from "./academics-context";
import { PersonNameLink } from "@/features/people/person-name-link";
import {
  getClassById,
  getStudentsByClass,
  getTeacherByUserId,
  getTeachersByClass,
} from "./academics.selectors";
import type { SchoolClass, Subject, TeacherClassAssignment } from "./academics.types";
import type { StaffInput, StaffMember } from "./academics.types";

const commonStaffRoles = [
  "Teacher",
  "Head Teacher",
  "Cleaner",
  "Gateman",
  "Accountant",
  "Bursar",
  "Secretary",
  "Librarian",
  "Nurse",
  "Driver",
];

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
        <Card className="p-4"><p className="text-xs text-muted">Class teacher</p><b>{classTeacher ? <PersonNameLink kind="staff" id={classTeacher.userId}>{classTeacher.firstName} {classTeacher.lastName}</PersonNameLink> : "Unassigned"}</b></Card>
        <Card className="p-4"><p className="text-xs text-muted">Status</p><Badge tone={item.status === "ACTIVE" ? "success" : "neutral"}>{item.status}</Badge></Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Students">
          <div className="divide-y px-5">
            {students.map((student) => (
              <div key={student.id} className="py-3">
                <b className="text-sm"><PersonNameLink kind="student" id={student.id}>{student.firstName} {student.lastName}</PersonNameLink></b>
                <p className="text-xs text-muted">{student.admissionNumber}</p>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Assigned teachers">
          <div className="divide-y px-5">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="py-3">
                <b className="text-sm"><PersonNameLink kind="staff" id={teacher.userId}>{teacher.firstName} {teacher.lastName}</PersonNameLink></b>
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
  const { state, isLoading, removeTeacherAssignment, removeStaff } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [timetableOpen, setTimetableOpen] = useState(false);
  const staff =
    state.staff.find((item) => item.userId === teacherId || item.id === teacherId) ??
    state.staff.find((item) => item.email === teacherId);

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-surface-muted" aria-label="Loading staff profile" />;
  }

  if (!staff) {
    return (
      <EmptyState
        title="Staff member not found"
        description="Choose a staff member from the Staff & HR directory."
      />
    );
  }

  const teacherAssignments = state.teacherAssignments.filter((item) => item.teacherUserId === staff.userId);
  const classOwnerAssignments = teacherAssignments.filter((item) => item.assignmentType === "CLASS_TEACHER" && item.assignmentRole !== "CO");
  const classCoOwnerAssignments = teacherAssignments.filter((item) => item.assignmentType === "CLASS_TEACHER" && item.assignmentRole === "CO");
  const classCoOwnerIds = new Set(classCoOwnerAssignments.map((item) => item.classId));
  const classOwnerIds = [...new Set([
    ...classOwnerAssignments.map((item) => item.classId),
    ...state.classes
      .filter((item) => item.classTeacherUserId === staff.userId || staff.classTeacherClassIds.includes(item.id))
      .map((item) => item.id),
  ])].filter((classId) => !classCoOwnerIds.has(classId));
  const subjectAssignments = [
    ...teacherAssignments.flatMap((assignment) => assignment.subjectIds.map((subjectId) => ({ classId: assignment.classId, className: assignment.className, subjectId }))),
    ...(staff.teachingAssignments ?? []).map((assignment) => ({ classId: assignment.classId, className: undefined, subjectId: assignment.subjectId })),
  ];
  const assignedClassIds = [...new Set([
    ...teacherAssignments.map((item) => item.classId),
    ...classOwnerIds,
    ...staff.assignedClassIds,
    ...(staff.teachingAssignments ?? []).map((assignment) => assignment.classId),
  ])];
  const assignedClasses = resolveClasses(
    [...(staff.assignedClasses ?? []), ...(staff.classTeacherClasses ?? [])],
    assignedClassIds,
    state.classes,
  );
  const subjectIds = [...new Set([
    ...teacherAssignments.flatMap((item) => item.subjectIds),
    ...staff.subjectIds,
    ...(staff.teachingAssignments ?? []).map((assignment) => assignment.subjectId),
  ])];
  const subjects = resolveSubjects(staff.subjects, subjectIds, state.subjects);
  const assignedAccessAssignments = teacherAssignments.filter((item) => item.assignmentType !== "CLASS_TEACHER");
  const assignedAccessClassIds = [...new Set([
    ...assignedAccessAssignments.map((item) => item.classId),
    ...staff.assignedClassIds,
    ...(staff.teachingAssignments ?? []).map((assignment) => assignment.classId),
  ])];
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
        await removeTeacherAssignment(assignment.id, teacherAssignments.filter((item) => item.classId === assignment.classId));
        toast("Teacher assignment removed.", "success");
      },
    });
  };
  const deleteTeacher = () => {
    const label = staff.isTeachingStaff ? "teacher" : "staff member";
    confirm({
      title: `Delete ${label}?`,
      description: `${staff.fullName} will be removed from active staff and moved to Trash for 3 months.`,
      confirmLabel: `Delete ${staff.isTeachingStaff ? "teacher" : "staff"}`,
      destructive: true,
      onConfirm: async () => {
        await removeStaff(staff.userId);
        toast("Staff member moved to Trash.", "success");
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={15} />Edit details
            </Button>
            {staff.isTeachingStaff && (
              <>
                <Button variant="outline" onClick={() => setTimetableOpen(true)}>View timetable</Button>
                <Link className={buttonStyles("outline")} href={`/admin/staff/assignments?teacher=${staff.userId}`}>
                  Assign classes
                </Link>
              </>
            )}
            <Button variant="danger" onClick={deleteTeacher}><Trash2 size={15} />Delete {staff.isTeachingStaff ? "teacher" : "staff"}</Button>
          </div>
        }
      />

      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar
            initials={`${staff.firstName[0] ?? ""}${staff.lastName[0] ?? ""}`}
            src={staff.photoUrl}
            alt={`${staff.fullName} profile`}
            className="size-20 border-2 text-xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-xl font-bold">{staff.fullName}</h2>
              <Badge tone={staff.isTeachingStaff ? "primary" : "neutral"}>
                {staff.isTeachingStaff ? "Teaching staff" : "Non-teaching staff"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              {staff.jobTitle} &middot; {staff.department ?? "No department"} &middot; {staff.email}
            </p>
          </div>
        </div>
      </Card>

      {editing && <StaffEditModal staff={staff} onClose={() => setEditing(false)} />}
      {timetableOpen && <TeacherTimetableModal teacherUserId={staff.userId} teacherName={staff.fullName} onClose={() => setTimetableOpen(false)} />}

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
                ["Monthly salary", typeof staff.salaryAmount === "number" ? formatNaira(staff.salaryAmount) : "Not provided"],
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
            <StaffPhotoEditor staffId={staff.id} name={staff.fullName} initialValue={staff.photoUrl} />
            <DetailGrid
              rows={[
                ["Account status", staff.status],
                ["Job title", staff.jobTitle],
                ["Last updated", displayDate(staff.updatedAt)],
              ]}
            />
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <ClassOwnershipSection
          title="Class owner for"
          classIds={classOwnerIds}
          assignments={classOwnerAssignments}
          classes={assignedClasses}
          empty="No class ownership."
          onRemove={removeAssignment}
        />
        <ClassOwnershipSection
          title="Class co-owner for"
          classIds={classCoOwnerAssignments.map((item) => item.classId)}
          assignments={classCoOwnerAssignments}
          classes={assignedClasses}
          empty="No class co-ownership."
          onRemove={removeAssignment}
        />
        <ClassOwnershipSection
          title="Assigned classes"
          classIds={assignedAccessClassIds}
          assignments={assignedAccessAssignments}
          classes={assignedClasses}
          empty="No assigned classes."
          onRemove={removeAssignment}
        />
        <SectionCard title="Subjects taught">
          <div className="divide-y px-5">
            {subjects.length ? (
              subjects.map((subject) => {
                const assignedClassNames = [...new Set(
                  subjectAssignments
                    .filter((assignment) => assignment.subjectId === subject.id)
                    .map((assignment) => {
                      const schoolClass = assignedClasses.find((item) => item.id === assignment.classId);
                      return schoolClass ? className(schoolClass) : assignment.className;
                    })
                    .filter((name): name is string => Boolean(name)),
                )];
                return (
                  <div key={subject.id} className="py-3">
                    <p className="text-sm font-semibold">{subjectName(subject)}</p>
                    <p className="mt-1 text-xs text-muted">
                      {assignedClassNames.length ? assignedClassNames.join(", ") : "No class assignment details"}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-muted">No assigned subjects.</p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 flex justify-end">
        <Link href="/admin/staff">
          <Button variant="outline">Back to staff</Button>
        </Link>
      </div>
    </>
  );
}

function StaffEditModal({ staff, onClose }: { staff: StaffMember; onClose: () => void }) {
  return (
    <SidePanel open title="Edit staff details" description={staff.fullName} onClose={onClose} maxWidth="xl">
          <StaffDetailEditForm staff={staff} onSaved={onClose} />
    </SidePanel>
  );
}

function StaffDetailEditForm({ staff, onSaved }: { staff: StaffMember; onSaved: () => void }) {
  const { state, updateStaff, assignStaffClasses } = useAcademics();
  const { toast } = useActionFeedback();
  const [form, setForm] = useState<StaffInput>({
    name: staff.fullName,
    email: staff.email,
    jobTitle: staff.jobTitle,
    isTeachingStaff: staff.isTeachingStaff,
    employeeNumber: staff.employeeNumber ?? staff.staffId ?? "",
    department: staff.department ?? "",
    phone: staff.phone ?? "",
    salaryAmount: staff.salaryAmount,
    gender: staff.gender ?? undefined,
    dateOfBirth: staff.dateOfBirth ?? undefined,
    address: staff.address ?? undefined,
    photoUrl: staff.photoUrl ?? "",
    assignedClassIds: staff.assignedClassIds,
    classTeacherClassIds: staff.classTeacherClassIds,
    subjectIds: staff.subjectIds,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const patch = <K extends keyof StaffInput>(key: K, value: StaffInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const classOptions = state.classes
    .filter((item) => item.status === "ACTIVE")
    .map((item) => ({ value: item.id, label: item.displayName, description: item.level }));
  const selectedClassLevels = new Set(
    state.classes
      .filter((item) => (form.assignedClassIds ?? []).includes(item.id))
      .map((item) => item.level),
  );
  const subjectOptions = state.subjects
    .filter((item) => item.status === "ACTIVE")
    .filter((item) => selectedClassLevels.size === 0 || selectedClassLevels.has(item.level))
    .map((item) => ({ value: item.id, label: item.name, description: item.code ? `${item.level} - ${item.code}` : item.level }));
  const roleOptions = [...new Set([...commonStaffRoles, ...state.staff.map((item) => item.jobTitle), form.jobTitle])]
    .filter(Boolean)
    .map((value) => ({ value, label: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.jobTitle.trim()) {
      setError("Name, email and role are required.");
      return;
    }
    const profilePayload: Partial<StaffInput> = {
      name: form.name,
      email: form.email,
      jobTitle: form.jobTitle,
      isTeachingStaff: form.isTeachingStaff,
      employeeNumber: form.employeeNumber,
      department: form.department,
      phone: form.phone,
      salaryAmount: form.salaryAmount,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      address: form.address,
      photoUrl: form.photoUrl,
    };
    const assignmentPayload = {
      assignedClassIds: form.isTeachingStaff ? form.assignedClassIds ?? [] : [],
      classTeacherClassIds: form.isTeachingStaff ? form.classTeacherClassIds ?? [] : [],
      subjectIds: form.isTeachingStaff ? form.subjectIds ?? [] : [],
    };
    setSaving(true);
    try {
      await updateStaff(staff.id, profilePayload);
      if (form.isTeachingStaff) {
        await assignStaffClasses(staff.id, assignmentPayload);
      }
      toast("Staff details updated.", "success");
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Staff details could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-3 sm:col-span-2 md:grid-cols-2">
          <button type="button" onClick={() => { patch("isTeachingStaff", true); patch("jobTitle", form.jobTitle === "Staff" ? "Teacher" : form.jobTitle); }} className={`rounded-[8px] border p-4 text-left transition ${form.isTeachingStaff ? "border-[var(--school-primary)] bg-primary-light text-[var(--school-primary)]" : "bg-surface hover:bg-surface-muted"}`}>
            <p className="font-semibold">Teaching staff</p>
            <p className="mt-1 text-xs text-muted">Can be assigned classes and subjects.</p>
          </button>
          <button type="button" onClick={() => { patch("isTeachingStaff", false); patch("jobTitle", form.jobTitle === "Teacher" ? "Staff" : form.jobTitle); }} className={`rounded-[8px] border p-4 text-left transition ${!form.isTeachingStaff ? "border-[var(--school-primary)] bg-primary-light text-[var(--school-primary)]" : "bg-surface hover:bg-surface-muted"}`}>
            <p className="font-semibold">Non-teaching staff</p>
            <p className="mt-1 text-xs text-muted">Removes class and subject access.</p>
          </button>
        </div>
        <label className="text-sm font-medium">Full name<Input className="mt-2" value={form.name} onChange={(event) => patch("name", event.target.value)} /></label>
        <label className="text-sm font-medium">Email<Input className="mt-2" type="email" value={form.email} onChange={(event) => patch("email", event.target.value)} /></label>
        <label className="text-sm font-medium">Staff ID<Input className="mt-2" value={form.employeeNumber ?? ""} onChange={(event) => patch("employeeNumber", event.target.value)} /></label>
        <label className="text-sm font-medium">Monthly salary<MoneyInput className="mt-2" min="0" value={form.salaryAmount ?? 0} onValueChange={(value) => patch("salaryAmount", value || undefined)} /></label>
        <label className="text-sm font-medium">Role<Select className="mt-2" searchable label="Role" value={form.jobTitle} onChange={(value) => patch("jobTitle", value)} options={roleOptions} /></label>
        <label className="text-sm font-medium">Custom role name<Input className="mt-2" value={form.jobTitle} onChange={(event) => patch("jobTitle", event.target.value)} /></label>
        <label className="text-sm font-medium">Department<Input className="mt-2" value={form.department ?? ""} onChange={(event) => patch("department", event.target.value)} /></label>
        <label className="text-sm font-medium">Phone<Input className="mt-2" value={form.phone ?? ""} onChange={(event) => patch("phone", event.target.value)} /></label>
        <label className="text-sm font-medium">Gender<Select className="mt-2" clearable label="Gender" value={form.gender ?? ""} onChange={(value) => patch("gender", (value || undefined) as StaffInput["gender"])} options={["MALE", "FEMALE", "OTHER"].map((value) => ({ value, label: value }))} /></label>
        <label className="text-sm font-medium">Date of birth<Input className="mt-2" type="date" value={form.dateOfBirth ?? ""} onChange={(event) => patch("dateOfBirth", event.target.value)} /></label>
        <label className="text-sm font-medium sm:col-span-2">Address<Input className="mt-2" value={form.address ?? ""} onChange={(event) => patch("address", event.target.value)} /></label>
        <div className="sm:col-span-2"><ProfileImageField value={form.photoUrl} onChange={(value) => patch("photoUrl", value)} name={form.name || "Staff member"} /></div>
        {form.isTeachingStaff ? (
          <>
            <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Assigned classes</p><MultiSelect searchable label="Assigned classes" placeholder="Select classes" values={form.assignedClassIds ?? []} onChange={(values) => patch("assignedClassIds", values)} options={classOptions} /></div>
            <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Subjects taught</p><MultiSelect searchable label="Subjects taught" placeholder="Select subjects" values={form.subjectIds ?? []} onChange={(values) => patch("subjectIds", values)} options={subjectOptions} /></div>
          </>
        ) : (
          <div className="rounded-[8px] border bg-surface-muted p-4 text-sm text-muted sm:col-span-2">
            Saving as non-teaching staff clears teacher class and subject access.
          </div>
        )}
        {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={onSaved}>Cancel</Button>
          <Button disabled={saving}>{saving ? "Saving changes..." : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}

function StaffPhotoEditor({ staffId, name, initialValue }: { staffId: string; name: string; initialValue?: string }) {
  const { updateStaff } = useAcademics();
  const { toast } = useActionFeedback();
  const [value, setValue] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  return <div className="mb-5"><ProfileImageField value={value} onChange={setValue} name={name} /><Button className="mt-3" disabled={saving || value === (initialValue ?? "")} onClick={() => { setSaving(true); void updateStaff(staffId, { photoUrl: value }).then(() => toast("Profile image updated.", "success")).catch((caught) => toast(caught instanceof Error ? caught.message : "Profile image could not be updated.", "error")).finally(() => setSaving(false)); }}>{saving ? "Saving image..." : "Save profile image"}</Button></div>;
}

function resolveClasses(
  embedded: SchoolClass[] | undefined,
  ids: string[],
  allClasses: SchoolClass[],
) {
  const resolved = [
    ...(embedded ?? []),
    ...ids.map((id) => allClasses.find((item) => item.id === id)).filter((item): item is SchoolClass => Boolean(item)),
  ];
  return [...new Map(resolved.map((item) => [item.id, item])).values()];
}

function resolveSubjects(
  embedded: Subject[] | undefined,
  ids: string[],
  allSubjects: Subject[],
) {
  const resolved = [
    ...(embedded ?? []),
    ...ids.map((id) => allSubjects.find((item) => item.id === id)).filter((item): item is Subject => Boolean(item)),
  ];
  return [...new Map(resolved.map((item) => [item.id, item])).values()];
}

function ClassOwnershipSection({
  title,
  classIds,
  assignments,
  classes,
  empty,
  onRemove,
}: {
  title: string;
  classIds: string[];
  assignments: TeacherClassAssignment[];
  classes: SchoolClass[];
  empty: string;
  onRemove: (assignment: TeacherClassAssignment) => void;
}) {
  const uniqueClassIds = [...new Set(classIds)];
  return (
    <SectionCard title={title}>
      <div className="divide-y px-5">
        {uniqueClassIds.length ? (
          uniqueClassIds.map((classId) => {
            const schoolClass = classes.find((item) => item.id === classId);
            const assignment = assignments.find((item) => item.classId === classId);
            return (
              <div key={classId} className="flex items-center justify-between gap-3 py-3">
                <p className="truncate text-sm font-semibold">{schoolClass ? className(schoolClass) : assignment?.className ?? "Unknown class"}</p>
                {assignment && <Button variant="outline" className="min-h-9 shrink-0 px-3" onClick={() => onRemove(assignment)}>Remove</Button>}
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
