"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Eye, GraduationCap, Pencil, Plus, ShieldX, Trash2, UserRoundCog, Users } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { BrandIcon } from "@/components/ui/brand-icon";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { RowActionSelect } from "@/components/ui/row-action-select";
import { TablePagination, usePaginatedRows } from "@/components/ui/table-pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MultiSelect, Select } from "@/components/ui/select";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { PersonNameLink } from "@/features/people/person-name-link";
import { readStoredUser } from "@/lib/auth";
import { useTeacherStudentFees } from "@/features/finance/use-teacher-student-fees";
import { matchesSearch } from "@/lib/search";
import { useAcademics } from "./academics-context";
import {
  getClassById,
  getClassesForTeacher,
  getStudentsByClass,
  getTeacherByUserId,
  getTeachersByClass,
} from "./academics.selectors";
import { primaryClassTemplates, secondaryClassTemplates } from "./academics.class-templates";
import type { ClassStatus, SchoolClass, SchoolLevel, TeacherClassAssignment, TeacherClassAssignmentType } from "./academics.types";

const teacherName = (first: string, last: string) => `${first} ${last}`;
const levelOptions = [
  { value: "PRIMARY", label: "Primary School" },
  { value: "SECONDARY", label: "Secondary School" },
];
const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

export function AdminAcademicsLanding() {
  const { state } = useAcademics();
  const activeClasses = state.classes.filter((item) => item.status === "ACTIVE");
  const cards = [
    { title: "Classes", description: "Class arms, capacity and teachers", href: "/admin/academics/classes", icon: GraduationCap, value: activeClasses.length },
    { title: "Students by class", description: "Open class cards before student lists", href: "/admin/students", icon: Users, value: state.students.length },
    { title: "Subjects", description: "Subjects and teaching coverage", href: "/admin/settings", icon: BookOpen, value: state.subjects.filter((item) => item.status === "ACTIVE").length },
  ];
  return (
    <>
      <PageHeader title="Academics" description="Choose an academic area, then work inside its focused view." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ title, description, href, icon: Icon, value }, index) => (
          <Link key={title} href={href} className="min-h-40 rounded-[8px] border bg-surface p-4 transition hover:border-[var(--school-primary)] hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted">{description}</p></div>
              <BrandIcon tone={(["primary", "secondary", "accent", "secondary"] as const)[index]} className="size-10"><Icon size={18} /></BrandIcon>
            </div>
            <p className="mt-6 text-2xl font-bold">{value}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

function ClassForm({ existing, onDone }: { existing?: SchoolClass; onDone: () => void }) {
  const { settings } = useSchoolSettings();
  const { selectedSession } = useAcademicPeriod();
  const { state, createClass, updateClass } = useAcademics();
  const { toast } = useActionFeedback();
  const [level, setLevel] = useState<SchoolLevel>(existing?.level ?? settings.schoolLevels[0] ?? "SECONDARY");
  const templates = (level === "PRIMARY" ? primaryClassTemplates : secondaryClassTemplates).map((item) => item.defaultName);
  const [baseName, setBaseName] = useState(existing?.baseName ?? templates[0] ?? "");
  const [arm, setArm] = useState(existing?.suffix ?? existing?.arm ?? "");
  const [displayName, setDisplayName] = useState(existing?.displayName ?? baseName);
  const [academicYear, setAcademicYear] = useState(existing?.academicYear ?? selectedSession?.name ?? settings.currentAcademicSession ?? "2026/2027");
  const [capacity, setCapacity] = useState(existing?.capacity ?? 40);
  const [classTeacher, setClassTeacher] = useState(existing?.classTeacherUserId ?? "");
  const [teachers, setTeachers] = useState<string[]>(existing?.assignedTeacherUserIds ?? []);
  const [status, setStatus] = useState<ClassStatus>(existing?.status ?? "ACTIVE");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const teacherOptions = state.teachers.map((item) => ({ value: item.userId, label: teacherName(item.firstName, item.lastName), description: item.staffId }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const classCapacity = Number(capacity);
    if (!baseName.trim() || !displayName.trim() || !Number.isInteger(classCapacity) || classCapacity <= 0) return setError("School level, base name, display name and a positive whole-number capacity are required.");
    setSaving(true);
    try {
      const input = { level, baseName, arm: arm || undefined, suffix: arm || undefined, displayName, academicYear: academicYear || selectedSession?.name || settings.currentAcademicSession || "2026/2027", capacity: classCapacity, classTeacherUserId: classTeacher || undefined, assignedTeacherUserIds: teachers, status };
      if (existing) {
        await updateClass(existing.id, input);
        toast(`${displayName} updated.`, "success");
      } else {
        await createClass(input);
        toast(`${displayName} created.`, "success");
      }
      onDone();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Class could not be saved."); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">School level<Select className="mt-2" label="School level" value={level} onChange={(value) => { const next = value as SchoolLevel; setLevel(next); const name = (next === "PRIMARY" ? primaryClassTemplates : secondaryClassTemplates)[0]?.defaultName ?? ""; setBaseName(name); setDisplayName([name, arm].filter(Boolean).join(" ")); }} options={levelOptions.filter((item) => settings.schoolLevels.includes(item.value as SchoolLevel))}/></label><label className="text-sm font-medium">Base class name<Select className="mt-2" searchable label="Base class name" value={baseName} onChange={(value) => { setBaseName(value); setDisplayName([value, arm].filter(Boolean).join(" ")); }} options={templates.map((item) => ({ value: item, label: item }))}/></label><label className="text-sm font-medium">Class arm<Input className="mt-2" value={arm} onChange={(event) => { setArm(event.target.value); setDisplayName([baseName, event.target.value].filter(Boolean).join(" ")); }} placeholder="Gold, Blue, A, Science..."/></label><label className="text-sm font-medium">Display name<Input className="mt-2" value={displayName} onChange={(event) => setDisplayName(event.target.value)}/></label><label className="text-sm font-medium">Academic year<Input className="mt-2" value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} placeholder="2026/2027"/></label><label className="text-sm font-medium">Capacity<Input className="mt-2" type="number" min="1" step="1" value={capacity} onChange={(event) => setCapacity(Number(event.target.value))}/></label><label className="text-sm font-medium">Class teacher<Select className="mt-2" searchable clearable label="Class teacher" value={classTeacher} onChange={setClassTeacher} options={teacherOptions}/></label><label className="text-sm font-medium">Status<Select className="mt-2" label="Class status" value={status} onChange={(value) => setStatus(value as ClassStatus)} options={statusOptions}/></label><label className="text-sm font-medium sm:col-span-2">Additional teachers<MultiSelect label="Additional teachers" values={teachers} onChange={setTeachers} options={teacherOptions}/></label>{error && <p role="alert" className="text-sm text-danger sm:col-span-2">{error}</p>}<div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onDone}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? existing ? "Saving changes..." : "Creating class..." : existing ? "Save changes" : "Create class"}</Button></div></form>;
}

function LegacyAdminClassesScreen() {
  const { settings } = useSchoolSettings();
  const { state, removeClass } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const [form, setForm] = useState(false);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [teacher, setTeacher] = useState("");
  const visible = state.classes.filter((item) => settings.schoolLevels.includes(item.level) && (!level || item.level === level) && (!status || item.status === status) && (!teacher || item.classTeacherUserId === teacher) && matchesSearch(query, item.displayName, item.arm, getTeacherByUserId(state, item.classTeacherUserId ?? "")?.firstName, ...getTeachersByClass(state, item.id).map((person) => teacherName(person.firstName, person.lastName))));
  const deleteClass = (id: string, name: string, studentCount: number) => confirm({ title: `Delete ${name}?`, description: studentCount > 0 ? `This class has ${studentCount} student(s). The backend will decide whether deletion is allowed; local fallback archives classes with linked records.` : "This removes the class from the school class list.", confirmLabel: "Delete class", destructive: true, onConfirm: async () => { const result = await removeClass(id); toast(result === "REMOVED" ? `${name} deleted.` : `${name} has linked records, so it was archived.`, result === "REMOVED" ? "success" : "warning"); } });
  return <><PageHeader title="Classes" description="Manage class structures, arms, capacity and teacher access." action={<Button onClick={() => setForm(true)}><Plus size={16}/>Create Class</Button>}/>{form && <Card className="mb-6 p-5"><h2 className="mb-4 font-semibold">Create class</h2><ClassForm onDone={() => setForm(false)}/></Card>}<div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><SearchInput value={query} onChange={setQuery} placeholder="Search class or teacher"/><Select clearable label="Filter school level" value={level} onChange={setLevel} placeholder="All school levels" options={levelOptions.filter((item) => settings.schoolLevels.includes(item.value as SchoolLevel))}/><Select clearable label="Filter class status" value={status} onChange={setStatus} placeholder="All statuses" options={statusOptions}/><Select searchable clearable label="Filter class teacher" value={teacher} onChange={setTeacher} placeholder="All class teachers" options={state.teachers.map((item) => ({ value: item.userId, label: teacherName(item.firstName, item.lastName) }))}/></div><SectionCard title="School classes" description={`${visible.length} result(s)`}><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Class", "Level", "Arm", "Students", "Capacity", "Class teacher", "Assigned teachers", "Status", "Actions"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y">{visible.map((item) => { const classTeacher = getTeacherByUserId(state, item.classTeacherUserId ?? ""); return <ClickableTableRow key={item.id} href={`/admin/academics/classes/${item.id}`} label={item.displayName}><td className="px-4 py-3 font-semibold">{item.displayName}</td><td className="px-4 py-3">{item.level}</td><td className="px-4 py-3">{item.arm ?? "—"}</td><td className="px-4 py-3">{item.studentIds.length}</td><td className="px-4 py-3">{item.capacity ?? "—"}</td><td className="px-4 py-3">{classTeacher ? <PersonNameLink kind="staff" id={classTeacher.userId}>{teacherName(classTeacher.firstName, classTeacher.lastName)}</PersonNameLink> : "Unassigned"}</td><td className="px-4 py-3">{getTeachersByClass(state, item.id).length}</td><td className="px-4 py-3"><Badge tone={item.status === "ACTIVE" ? "success" : item.status === "INACTIVE" ? "warning" : "neutral"}>{item.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><Link href={`/admin/academics/classes/${item.id}`} className="inline-flex items-center gap-1 font-semibold text-[var(--school-primary)]"><Eye size={14}/>View</Link><button className="inline-flex items-center gap-1 text-muted" onClick={() => deleteClass(item.id, item.displayName, item.studentIds.length)}><Trash2 size={14}/>Delete</button></div></td></ClickableTableRow>; })}</tbody></table>{!visible.length && <p className="p-8 text-center text-sm text-muted">No classes match the current filters.</p>}</div></SectionCard></>;
}

export function AdminClassesScreen() {
  const { settings } = useSchoolSettings();
  const { state, isLoading, removeClass } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const [form, setForm] = useState(false);
  const [editingClassId, setEditingClassId] = useState("");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [teacher, setTeacher] = useState("");
  const visible = state.classes.filter((item) => settings.schoolLevels.includes(item.level) && (!level || item.level === level) && (!status || item.status === status) && (!teacher || item.classTeacherUserId === teacher) && matchesSearch(query, item.displayName, item.arm, getTeacherByUserId(state, item.classTeacherUserId ?? "")?.firstName, ...getTeachersByClass(state, item.id).map((person) => teacherName(person.firstName, person.lastName))));
  const pagination = usePaginatedRows(visible, `${query}|${level}|${status}|${teacher}`);
  useEffect(() => {
    const classId = new URLSearchParams(window.location.search).get("class");
    if (classId) setEditingClassId(classId);
  }, []);
  const editingClass = state.classes.find((item) => item.id === editingClassId);
  const closeForm = () => { setForm(false); setEditingClassId(""); };
  const openCreateForm = () => { setEditingClassId(""); setForm(true); };
  const openEditForm = (id: string) => { setEditingClassId(id); setForm(true); };
  const deleteClass = (id: string, name: string, studentCount: number) => confirm({ title: `Delete ${name}?`, description: studentCount > 0 ? `This class has ${studentCount} student(s). The backend will decide whether deletion is allowed; local fallback archives classes with linked records.` : "This removes the class from the school class list.", confirmLabel: "Delete class", destructive: true, onConfirm: async () => { const result = await removeClass(id); toast(result === "REMOVED" ? `${name} deleted.` : `${name} has linked records, so it was archived.`, result === "REMOVED" ? "success" : "warning"); } });
  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-surface-muted" aria-label="Loading classes" />;
  return <><PageHeader title="Classes" description="Manage class structures, arms, capacity and teacher access." action={<Button onClick={openCreateForm}><Plus size={16}/>Create Class</Button>}/><Modal open={form || Boolean(editingClass)} title={editingClass ? `Edit ${editingClass.displayName}` : "Create class"} description="Set the class structure, capacity and teacher access." maxWidth="xl" onClose={closeForm}><ClassForm key={editingClass?.id ?? "new"} existing={editingClass} onDone={closeForm}/></Modal><div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><SearchInput value={query} onChange={setQuery} placeholder="Search class or teacher"/><Select clearable label="Filter school level" value={level} onChange={setLevel} placeholder="All school levels" options={levelOptions.filter((item) => settings.schoolLevels.includes(item.value as SchoolLevel))}/><Select clearable label="Filter class status" value={status} onChange={setStatus} placeholder="All statuses" options={statusOptions}/><Select searchable clearable label="Filter class teacher" value={teacher} onChange={setTeacher} placeholder="All class teachers" options={state.teachers.map((item) => ({ value: item.userId, label: teacherName(item.firstName, item.lastName) }))}/></div><SectionCard title="School classes" description={`${visible.length} result(s)`}><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Class", "Level", "Arm", "Students", "Capacity", "Class teacher", "Assigned teachers", "Status", "Actions"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y">{pagination.rows.map((item) => { const classTeacher = getTeacherByUserId(state, item.classTeacherUserId ?? ""); return <ClickableTableRow key={item.id} href={`/admin/academics/classes/${item.id}`} label={item.displayName}><td className="px-4 py-3 font-semibold">{item.displayName}</td><td className="px-4 py-3">{item.level}</td><td className="px-4 py-3">{item.arm ?? "-"}</td><td className="px-4 py-3">{item.studentIds.length}</td><td className="px-4 py-3">{item.capacity ?? "-"}</td><td className="px-4 py-3">{classTeacher ? <PersonNameLink kind="staff" id={classTeacher.userId}>{teacherName(classTeacher.firstName, classTeacher.lastName)}</PersonNameLink> : "Unassigned"}</td><td className="px-4 py-3">{getTeachersByClass(state, item.id).length}</td><td className="px-4 py-3"><Badge tone={item.status === "ACTIVE" ? "success" : item.status === "INACTIVE" ? "warning" : "neutral"}>{item.status}</Badge></td><td className="px-4 py-3"><RowActionSelect label={`Actions for ${item.displayName}`} actions={[{ label: "Edit", onSelect: () => openEditForm(item.id) }, { label: "Delete", onSelect: () => deleteClass(item.id, item.displayName, item.studentIds.length) }]} /></td></ClickableTableRow>; })}</tbody></table>{!visible.length && <p className="p-8 text-center text-sm text-muted">No classes match the current filters.</p>}</div></SectionCard><TablePagination label="Classes" total={pagination.total} page={pagination.page} pageCount={pagination.pageCount} pageSize={pagination.pageSize} start={pagination.start} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} /></>;
}

export function AdminStudentsScreen() {
  const { settings } = useSchoolSettings();
  const { state, isLoading, moveStudents } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const [query, setQuery] = useState(""); const [level, setLevel] = useState(""); const [classId, setClassId] = useState(""); const [status, setStatus] = useState(""); const [sort, setSort] = useState("name"); const [selected, setSelected] = useState<string[]>([]); const [destination, setDestination] = useState("");
  const classes = state.classes.filter((item) => item.status === "ACTIVE" && settings.schoolLevels.includes(item.level));
  const visible = useMemo(() => state.students.filter((item) => settings.schoolLevels.includes(item.schoolLevel) && (!level || item.schoolLevel === level) && (!classId || item.classId === classId) && (!status || item.status === status) && matchesSearch(query, item.firstName, item.middleName, item.lastName, item.admissionNumber, item.guardianName, item.guardianPhone, getClassById(state, item.classId)?.displayName)).sort((a, b) => sort === "admission" ? a.admissionNumber.localeCompare(b.admissionNumber) : `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)), [state, settings.schoolLevels, query, level, classId, status, sort]);
  const move = () => { const target = getClassById(state, destination); if (!target) return; confirm({ title: `Move ${selected.length} student(s)?`, description: `Their active class membership will change to ${target.displayName}. Existing historical records are retained.`, confirmLabel: "Move students", onConfirm: async () => { await moveStudents(selected, destination); setSelected([]); toast(`${selected.length} student(s) moved to ${target.displayName}.`, "success"); } }); };
  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-surface-muted" aria-label="Loading students" />;
  return <><PageHeader title="Students" description="Active students carry into the active session automatically; assign each to a class after their promotion or placement decision."/><div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><SearchInput value={query} onChange={setQuery} placeholder="Search student, parent or class"/><Select clearable label="School level" value={level} onChange={setLevel} placeholder="All levels" options={levelOptions.filter((item) => settings.schoolLevels.includes(item.value as SchoolLevel))}/><Select searchable clearable label="Class" value={classId} onChange={setClassId} placeholder="All classes" options={classes.map((item) => ({ value: item.id, label: item.displayName }))}/><Select clearable label="Student status" value={status} onChange={setStatus} placeholder="All statuses" options={["ACTIVE", "INACTIVE", "GRADUATED", "WITHDRAWN"].map((item) => ({ value: item, label: item }))}/><Select label="Sort students" value={sort} onChange={setSort} options={[{ value: "name", label: "Sort by name" }, { value: "admission", label: "Sort by admission number" }]}/></div>{selected.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-surface p-3"><b className="text-sm">{selected.length} selected</b><Select className="min-w-56" searchable label="Destination class" value={destination} onChange={setDestination} placeholder="Assign to class" options={classes.map((item) => ({ value: item.id, label: item.displayName }))}/><Button disabled={!destination} onClick={move}>Move students</Button></div>}<SectionCard title="Student records" description={`${visible.length} student(s) shown`}><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-surface-muted"><tr><th className="px-4 py-3"><input type="checkbox" aria-label="Select all visible students" checked={visible.length > 0 && visible.every((item) => selected.includes(item.id))} onChange={(event) => setSelected(event.target.checked ? [...new Set([...selected, ...visible.map((item) => item.id)])] : selected.filter((id) => !visible.some((item) => item.id === id)))}/></th>{["Student", "Admission no.", "Level", "Class", "Guardian", "Phone", "Status"].map((item) => <th key={item} className="px-4 py-3 text-xs uppercase text-muted">{item}</th>)}</tr></thead><tbody className="divide-y">{visible.map((student) => <ClickableTableRow key={student.id} href={`/admin/students/${student.id}`} label={`${student.firstName} ${student.lastName}`} ><td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${student.firstName} ${student.lastName}`} checked={selected.includes(student.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))}/></td><td className="px-4 py-3 font-semibold"><PersonNameLink kind="student" id={student.id}>{student.firstName} {student.lastName}</PersonNameLink></td><td className="px-4 py-3">{student.admissionNumber}</td><td className="px-4 py-3">{student.schoolLevel}</td><td className="px-4 py-3">{getClassById(state, student.classId)?.displayName ?? "Unassigned"}</td><td className="px-4 py-3"><PersonNameLink kind="guardian" id={state.guardians.find((guardian) => student.guardianIds.includes(guardian.id) && guardian.fullName === student.guardianName)?.id}>{student.guardianName}</PersonNameLink></td><td className="px-4 py-3">{student.guardianPhone}</td><td className="px-4 py-3"><Badge tone={student.status === "ACTIVE" ? "success" : "neutral"}>{student.status}</Badge></td></ClickableTableRow>)}</tbody></table>{!visible.length && <EmptyState title="No students match the current filters." description="Clear the search or change the active filters."/>}</div></SectionCard></>;
}

export function TeacherAssignmentAdminScreen({ initialTeacherUserId = "" }: { initialTeacherUserId?: string }) {
  const { state, saveTeacherAssignments } = useAcademics();
  const { toast } = useActionFeedback();
  const [teacherId, setTeacherId] = useState(initialTeacherUserId); const [classId, setClassId] = useState(""); const [classTeacher, setClassTeacher] = useState(false); const [subjects, setSubjects] = useState<string[]>([]); const [query, setQuery] = useState(""); const [assignmentPanel, setAssignmentPanel] = useState<"new" | "edit" | null>(null); const [assignmentPolicy, setAssignmentPolicy] = useState<"CO" | "MAIN" | "REPLACE">("CO");
  const selectedClass = getClassById(state, classId);
  const existingForClass = state.teacherAssignments.filter((item) => item.classId === classId && item.teacherUserId !== teacherId);
  const conflicts = existingForClass.filter((item) =>
    (classTeacher && item.assignmentType === "CLASS_TEACHER") ||
    (item.assignmentType === "SUBJECT_TEACHER" && item.subjectIds.some((subjectId) => subjects.includes(subjectId))),
  );
  const subjectOptions = state.subjects
    .filter((item) => item.status === "ACTIVE")
    .filter((item) => !selectedClass || item.level === selectedClass.level)
    .map((item) => ({ value: item.id, label: item.name, description: item.code ? `${item.level} · ${item.code}` : item.level }));
  const updateClass = (value: string) => { setClassId(value); const assignments = state.teacherAssignments.filter((item) => item.teacherUserId === teacherId && item.classId === value); setClassTeacher(assignments.some((item) => item.assignmentType === "CLASS_TEACHER")); setSubjects([...new Set(assignments.flatMap((item) => item.subjectIds))]); };
  const updateTeacher = (value: string) => { setTeacherId(value); setClassId(""); setClassTeacher(false); setSubjects([]); };
  const save = async () => { try { const assignmentType: TeacherClassAssignmentType = classTeacher ? "CLASS_TEACHER" : subjects.length ? "SUBJECT_TEACHER" : "GENERAL_ACCESS"; const count = await saveTeacherAssignments({ teacherUserId: teacherId, classIds: [classId], assignmentType, subjectIds: subjects, subjectAssignments: [{ classId, subjectIds: subjects }], assignmentPolicy, assignmentSnapshot: state.teacherAssignments.filter((item) => item.classId === classId && !item.isRemoved) }); toast(`${count} teacher assignment(s) saved.`, "success"); setAssignmentPanel(null); } catch (caught) { toast(caught instanceof Error ? caught.message : "Assignments could not be saved.", "error"); } };
  const teacherLabel = (userId: string) => { const item = getTeacherByUserId(state, userId); return item ? teacherName(item.firstName, item.lastName) : "Teacher"; };
  const existingAssignmentSummary = (assignment: TeacherClassAssignment) => {
    const role = assignment.assignmentType === "CLASS_TEACHER" ? "Class owner" : assignment.assignmentType === "SUBJECT_TEACHER" ? assignment.subjectIds.map((subjectId) => state.subjects.find((item) => item.id === subjectId)?.name).filter(Boolean).join(", ") : "Class access";
    return `${teacherLabel(assignment.teacherUserId)} · ${role}${assignment.assignmentRole === "CO" ? " · Co-teacher" : assignment.assignmentRole === "MAIN" ? " · Main" : ""}`;
  };
  const assignmentRows = useMemo(() => {
    const rows = new Map<string, { teacherUserId: string; classId: string; assignmentTypes: TeacherClassAssignmentType[]; subjectIds: string[]; hasCoRole: boolean; hasMainRole: boolean }>();
    for (const assignment of state.teacherAssignments) {
      const key = `${assignment.teacherUserId}:${assignment.classId}`;
      const existing = rows.get(key) ?? { teacherUserId: assignment.teacherUserId, classId: assignment.classId, assignmentTypes: [], subjectIds: [], hasCoRole: false, hasMainRole: false };
      if (!existing.assignmentTypes.includes(assignment.assignmentType)) existing.assignmentTypes.push(assignment.assignmentType);
      existing.hasCoRole ||= assignment.assignmentRole === "CO";
      existing.hasMainRole ||= assignment.assignmentRole === "MAIN" || !assignment.assignmentRole;
      existing.subjectIds = [...new Set([...existing.subjectIds, ...assignment.subjectIds])];
      rows.set(key, existing);
    }
    return [...rows.values()]
      .map((row) => ({
        ...row,
        teacher: getTeacherByUserId(state, row.teacherUserId),
        schoolClass: getClassById(state, row.classId),
        subjectNames: row.subjectIds.map((id) => state.subjects.find((subject) => subject.id === id)?.name).filter((name): name is string => Boolean(name)),
      }))
      .filter((row) => matchesSearch(query, row.teacher?.firstName, row.teacher?.lastName, row.teacher?.staffId, row.schoolClass?.displayName, ...row.subjectNames))
      .sort((a, b) => `${a.teacher?.firstName} ${a.teacher?.lastName} ${a.schoolClass?.displayName}`.localeCompare(`${b.teacher?.firstName} ${b.teacher?.lastName} ${b.schoolClass?.displayName}`));
  }, [query, state]);
  const editAssignment = (nextTeacherId: string, nextClassId: string) => {
    updateTeacher(nextTeacherId);
    setClassId(nextClassId);
    const assignments = state.teacherAssignments.filter((item) => item.teacherUserId === nextTeacherId && item.classId === nextClassId);
    setClassTeacher(assignments.some((item) => item.assignmentType === "CLASS_TEACHER"));
    setSubjects([...new Set(assignments.flatMap((item) => item.subjectIds))]);
    setAssignmentPolicy("CO");
    setAssignmentPanel("edit");
  };
  const roleLabel = (types: TeacherClassAssignmentType[]) => {
    if (types.includes("CLASS_TEACHER")) return "Class teacher";
    if (types.includes("SUBJECT_TEACHER")) return "Subject teacher";
    return "Class access";
  };
  return <>
    <PageHeader title="Teacher assignments" description="Manage class teachers, subject teachers and classroom access in one place." action={<Button onClick={() => { setTeacherId(initialTeacherUserId); setClassId(""); setClassTeacher(false); setSubjects([]); setAssignmentPolicy("CO"); setAssignmentPanel("new"); }}><Plus size={16}/>Assign teacher</Button>}/>
    <Modal open={assignmentPanel !== null} title={assignmentPanel === "edit" ? "Edit assignment" : "Assign a teacher"} description="Choose a teacher and class, then set their classroom access." maxWidth="lg" onClose={() => setAssignmentPanel(null)}>
      <div className="mb-5 rounded-xl bg-primary-light p-4 text-sm text-[var(--school-primary)]">Select the teacher and class first. Then choose whether they own the class, teach subjects, or just need class access.</div>
      <div className="grid gap-5">
        <div>
          <p className="mb-2 text-sm font-medium">Teacher</p>
          <Select searchable label="Teacher" value={teacherId} onChange={updateTeacher} placeholder="Select teacher" emptyMessage="No teachers found." options={state.teachers.map((item) => ({ value: item.userId, label: teacherName(item.firstName, item.lastName), description: item.staffId }))}/>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Class</p>
          <Select searchable label="Class" value={classId} onChange={updateClass} placeholder="Select class" emptyMessage="No active classes found." options={state.classes.filter((item) => item.status === "ACTIVE").map((item) => ({ value: item.id, label: item.displayName }))}/>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-surface-muted p-4 text-sm"><span><span className="block font-semibold">Class teacher</span><span className="mt-1 block text-xs text-muted">Give this teacher responsibility for the class.</span></span><input type="checkbox" className="size-5 shrink-0 accent-[var(--school-primary)]" checked={classTeacher} onChange={(event) => setClassTeacher(event.target.checked)} /></label>
        <div>
          <p className="mb-2 text-sm font-medium">Subjects for selected class</p>
          <MultiSelect searchable label="Subjects for selected class" placeholder="Select subjects" emptyMessage={classId ? "No subjects found for this class." : "Select a class first."} values={subjects} onChange={setSubjects} options={subjectOptions}/>
        </div>
      </div>
      {conflicts.length > 0 && <div className="mt-4 rounded-xl border bg-surface-muted p-4 sm:col-span-2"><p className="text-sm font-semibold">Already assigned to this class or subject</p><ul className="mt-2 space-y-1 text-sm text-muted">{conflicts.map((item) => <li key={item.id}>{existingAssignmentSummary(item)}</li>)}</ul><label className="mt-4 block text-sm font-medium">How should the new assignment work?<Select className="mt-2" label="Assignment change" value={assignmentPolicy} onChange={(value) => setAssignmentPolicy(value as "CO" | "MAIN" | "REPLACE")} options={[{ value: "CO", label: classTeacher && conflicts.some((item) => item.assignmentType === "CLASS_TEACHER") ? "Add as co-class owner / co-teacher" : "Add as co-teacher" }, { value: "MAIN", label: "Make this teacher the main teacher" }, { value: "REPLACE", label: "Replace the currently assigned teacher" }]}/></label></div>}
      {classId && conflicts.length === 0 && <p className="mt-4 text-xs text-muted">Leave subjects empty to grant class access only.</p>}
      <div className="mt-6 flex justify-end gap-2 border-t pt-5"><Button type="button" variant="outline" onClick={() => setAssignmentPanel(null)}>Cancel</Button><Button disabled={!teacherId || !classId} onClick={() => void save()}><UserRoundCog size={16}/>Save assignment</Button></div>
    </Modal>
    <div className="mb-4 max-w-md"><SearchInput value={query} onChange={setQuery} placeholder="Search teacher, class or subject"/></div>
    <SectionCard title="Teacher assignments" description={`${assignmentRows.length} teacher-class assignment${assignmentRows.length === 1 ? "" : "s"} shown`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Teacher", "Class", "Access", "Subjects", "Action"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y">{assignmentRows.map((row) => <ClickableTableRow key={`${row.teacherUserId}:${row.classId}`} href={`/admin/staff/${row.teacherUserId}`} label={row.teacher ? teacherName(row.teacher.firstName, row.teacher.lastName) : "teacher assignment"}>
            <td data-column-label="Teacher" className="px-4 py-3"><Link className="font-semibold text-[var(--school-primary)]" href={`/admin/staff/${row.teacherUserId}`}>{row.teacher ? teacherName(row.teacher.firstName, row.teacher.lastName) : "Unknown teacher"}</Link><p className="mt-0.5 text-xs text-muted">{row.teacher?.staffId ?? row.teacherUserId}</p></td>
            <td data-column-label="Class" className="px-4 py-3 font-medium">{row.schoolClass?.displayName ?? "Unknown class"}</td>
            <td data-column-label="Access" className="px-4 py-3"><Badge tone={row.assignmentTypes.includes("CLASS_TEACHER") ? "primary" : "neutral"}>{roleLabel(row.assignmentTypes)}{row.hasCoRole ? row.hasMainRole ? " · Main + co" : " · Co" : row.hasMainRole ? " · Main" : ""}</Badge></td>
            <td data-column-label="Subjects" className="max-w-sm px-4 py-3 text-muted">{row.subjectNames.length ? row.subjectNames.join(", ") : "All class access"}</td>
            <td data-column-label="Action" className="px-4 py-3"><Button variant="outline" className="min-h-9 px-3" onClick={() => editAssignment(row.teacherUserId, row.classId)}><Pencil size={14}/>Edit</Button></td>
          </ClickableTableRow>)}</tbody>
        </table>
        {!assignmentRows.length && (
          <EmptyState title={query ? "No assignments match your search" : "No teacher assignments yet"} description={query ? "Try another teacher, class, or subject name." : "Use Assign teacher to grant class or subject access."}/>
        )}
      </div>
    </SectionCard>
  </>;
}

function currentTeacherUserId() {
  return readStoredUser()?.id ?? "teacher-user-001";
}

export function TeacherClassesScreen() { const { state, isLoading } = useAcademics(); const classes = getClassesForTeacher(state, currentTeacherUserId()); if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-surface-muted" aria-label="Loading assigned classes"/>; return <><PageHeader title="My Classes" description="Only classes granted through your teacher assignments are shown."/><div className="grid gap-4 sm:grid-cols-2">{classes.map((item) => <Card key={item.id} className="p-5"><div className="flex justify-between"><div><h2 className="font-semibold">{item.displayName}</h2><p className="mt-1 text-sm text-muted">{getStudentsByClass(state, item.id).length} students · capacity {item.capacity ?? "—"}</p></div><Users className="text-[var(--school-primary)]" size={20}/></div><Link className="mt-4 inline-flex font-semibold text-[var(--school-primary)]" href={`/teacher/classes/${item.id}`}>Open class</Link></Card>)}</div>{!classes.length && <EmptyState title="No assigned classes" description="Assigned classes will appear here once the backend returns them."/>}</>; }
export function TeacherClassDetailScreen({ classId }: { classId: string }) {
  const { state, isLoading } = useAcademics();
  const teacherId = currentTeacherUserId();
  const item = getClassesForTeacher(state, teacherId).find((entry) => entry.id === classId);
  const teacher = state.staff.find((person) => person.userId === teacherId || person.id === teacherId);
  const teacherUserId = teacher?.userId ?? teacherId;
  const subjectIds = [...new Set([
    ...state.teacherAssignments
      .filter((assignment) => assignment.teacherUserId === teacherUserId && assignment.classId === classId)
      .flatMap((assignment) => assignment.subjectIds),
    ...(teacher?.teachingAssignments ?? [])
      .filter((assignment) => assignment.classId === classId)
      .map((assignment) => assignment.subjectId),
  ])];
  const subjects = [...new Map([
    ...subjectIds.map((subjectId) => state.subjects.find((subject) => subject.id === subjectId)),
    ...(teacher?.subjects ?? []).filter((subject) => subjectIds.includes(subject.id)),
  ].filter((subject): subject is NonNullable<typeof subject> => Boolean(subject)).map((subject) => [subject.id, subject])).values()];
  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-surface-muted" aria-label="Loading class"/>;
  if (!item) return <div className="py-20 text-center"><ShieldX className="mx-auto text-danger" size={38}/><h1 className="mt-4 text-xl font-bold">Access Denied</h1><p className="mt-2 text-sm text-muted">This class is not assigned to your teacher account.</p></div>;
  return <><PageHeader title={item.displayName} description="Assigned class summary and student list."/><SectionCard title="Subjects taught" description={subjects.length ? `${subjects.length} assigned subject(s)` : "No subjects assigned for this class."}><div className="flex flex-wrap gap-2 p-5">{subjects.map((subject) => <Badge key={subject.id} tone="primary">{subject.code ? `${subject.name} (${subject.code})` : subject.name}</Badge>)}{!subjects.length && <p className="text-sm text-muted">Class access is assigned, but no subject has been selected for this class.</p>}</div></SectionCard><div className="mt-5"><TeacherStudentsScreen fixedClassId={classId}/></div></>;
}
export function TeacherStudentsScreen({ fixedClassId }: { fixedClassId?: string }) { const { statuses: feeStatuses, error: feeError } = useTeacherStudentFees(); const { state, isLoading } = useAcademics(); const classes = getClassesForTeacher(state, currentTeacherUserId()); const accessibleClassIds = new Set(classes.map((item) => item.id)); const [classId, setClassId] = useState(fixedClassId ?? ""); const [query, setQuery] = useState(""); const students = state.students.filter((item) => accessibleClassIds.has(item.classId) && (!classId || item.classId === classId) && matchesSearch(query, item.firstName, item.lastName, item.admissionNumber, getClassById(state, item.classId)?.displayName)); if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-surface-muted" aria-label="Loading students"/>; return <><PageHeader title="Students" description={`${students.length} student(s) from your assigned classes.`}/>{!fixedClassId && <div className="mb-5 grid gap-3 sm:grid-cols-2"><SearchInput value={query} onChange={setQuery} placeholder="Search assigned students"/><Select clearable label="Assigned class" value={classId} onChange={setClassId} placeholder="All assigned classes" options={classes.map((item) => ({ value: item.id, label: item.displayName }))}/></div>}<SectionCard title="Accessible students" description="Fee status includes all terms."><div className="divide-y px-5">{students.map((student) => <div key={student.id} className="py-4"><p className="font-semibold"><PersonNameLink kind="student" id={student.id}>{student.firstName} {student.lastName}</PersonNameLink></p><p className="text-sm text-muted">{student.admissionNumber} · {getClassById(state, student.classId)?.displayName}</p><div className="mt-2"><Badge tone={feeError ? "warning" : feeStatuses.get(student.id) === "Paid in full" ? "success" : feeStatuses.get(student.id) === "Not paid" ? "danger" : "neutral"}>{feeError ? "Fee status unavailable" : feeStatuses.get(student.id) ?? "Loading fee status..."}</Badge></div></div>)}</div>{!students.length && <EmptyState title="No assigned students" description="Assigned students will appear here once the backend returns them."/>}</SectionCard></>; }
