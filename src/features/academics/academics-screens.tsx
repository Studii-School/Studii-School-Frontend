"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Eye, GraduationCap, Pencil, Plus, ShieldX, Trash2, UserRoundCog, Users } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MultiSelect, Select } from "@/components/ui/select";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { readStoredUser } from "@/lib/auth";
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
import type { ClassStatus, SchoolClass, SchoolLevel, TeacherClassAssignmentType } from "./academics.types";

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
    { title: "Teacher assignments", description: "Class and subject access", href: "/admin/staff/assignments", icon: UserRoundCog, value: state.teacherAssignments.length },
    { title: "Students by class", description: "Open class cards before student lists", href: "/admin/students", icon: Users, value: state.students.length },
    { title: "Subjects", description: "Subjects and teaching coverage", href: "/admin/settings", icon: BookOpen, value: state.subjects.filter((item) => item.status === "ACTIVE").length },
  ];
  return (
    <>
      <PageHeader title="Academics" description="Choose an academic area, then work inside its focused view." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, description, href, icon: Icon, value }) => (
          <Link key={title} href={href} className="min-h-40 rounded-[8px] border bg-surface p-4 transition hover:border-[var(--school-primary)] hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted">{description}</p></div>
              <span className="rounded-[8px] bg-surface-muted p-2 text-[var(--school-primary)]"><Icon size={18} /></span>
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
  const { state, createClass, updateClass } = useAcademics();
  const { toast } = useActionFeedback();
  const [level, setLevel] = useState<SchoolLevel>(existing?.level ?? settings.schoolLevels[0] ?? "SECONDARY");
  const templates = (level === "PRIMARY" ? primaryClassTemplates : secondaryClassTemplates).map((item) => item.defaultName);
  const [baseName, setBaseName] = useState(existing?.baseName ?? templates[0] ?? "");
  const [arm, setArm] = useState(existing?.suffix ?? existing?.arm ?? "");
  const [displayName, setDisplayName] = useState(existing?.displayName ?? baseName);
  const [academicYear, setAcademicYear] = useState(existing?.academicYear ?? settings.currentAcademicSession ?? "2026/2027");
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
      const input = { level, baseName, arm: arm || undefined, suffix: arm || undefined, displayName, academicYear: academicYear || settings.currentAcademicSession || "2026/2027", capacity: classCapacity, classTeacherUserId: classTeacher || undefined, assignedTeacherUserIds: teachers, status };
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
  return <><PageHeader title="Classes" description="Manage class structures, arms, capacity and teacher access." action={<Button onClick={() => setForm(true)}><Plus size={16}/>Create Class</Button>}/>{form && <Card className="mb-6 p-5"><h2 className="mb-4 font-semibold">Create class</h2><ClassForm onDone={() => setForm(false)}/></Card>}<div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><SearchInput value={query} onChange={setQuery} placeholder="Search class or teacher"/><Select clearable label="Filter school level" value={level} onChange={setLevel} placeholder="All school levels" options={levelOptions.filter((item) => settings.schoolLevels.includes(item.value as SchoolLevel))}/><Select clearable label="Filter class status" value={status} onChange={setStatus} placeholder="All statuses" options={statusOptions}/><Select searchable clearable label="Filter class teacher" value={teacher} onChange={setTeacher} placeholder="All class teachers" options={state.teachers.map((item) => ({ value: item.userId, label: teacherName(item.firstName, item.lastName) }))}/></div><SectionCard title="School classes" description={`${visible.length} result(s)`}><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Class", "Level", "Arm", "Students", "Capacity", "Class teacher", "Assigned teachers", "Status", "Actions"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y">{visible.map((item) => { const classTeacher = getTeacherByUserId(state, item.classTeacherUserId ?? ""); return <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.displayName}</td><td className="px-4 py-3">{item.level}</td><td className="px-4 py-3">{item.arm ?? "—"}</td><td className="px-4 py-3">{item.studentIds.length}</td><td className="px-4 py-3">{item.capacity ?? "—"}</td><td className="px-4 py-3">{classTeacher ? teacherName(classTeacher.firstName, classTeacher.lastName) : "Unassigned"}</td><td className="px-4 py-3">{getTeachersByClass(state, item.id).length}</td><td className="px-4 py-3"><Badge tone={item.status === "ACTIVE" ? "success" : item.status === "INACTIVE" ? "warning" : "neutral"}>{item.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><Link href={`/admin/academics/classes/${item.id}`} className="inline-flex items-center gap-1 font-semibold text-[var(--school-primary)]"><Eye size={14}/>View</Link><button className="inline-flex items-center gap-1 text-muted" onClick={() => deleteClass(item.id, item.displayName, item.studentIds.length)}><Trash2 size={14}/>Delete</button></div></td></tr>; })}</tbody></table>{!visible.length && <p className="p-8 text-center text-sm text-muted">No classes match the current filters.</p>}</div></SectionCard></>;
}

export function AdminClassesScreen() {
  const { settings } = useSchoolSettings();
  const { state, removeClass } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const [form, setForm] = useState(false);
  const [editingClassId, setEditingClassId] = useState("");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [teacher, setTeacher] = useState("");
  const visible = state.classes.filter((item) => settings.schoolLevels.includes(item.level) && (!level || item.level === level) && (!status || item.status === status) && (!teacher || item.classTeacherUserId === teacher) && matchesSearch(query, item.displayName, item.arm, getTeacherByUserId(state, item.classTeacherUserId ?? "")?.firstName, ...getTeachersByClass(state, item.id).map((person) => teacherName(person.firstName, person.lastName))));
  useEffect(() => {
    const classId = new URLSearchParams(window.location.search).get("class");
    if (classId) setEditingClassId(classId);
  }, []);
  const editingClass = state.classes.find((item) => item.id === editingClassId);
  const closeForm = () => { setForm(false); setEditingClassId(""); };
  const openCreateForm = () => { setEditingClassId(""); setForm(true); };
  const openEditForm = (id: string) => { setEditingClassId(id); setForm(true); };
  const deleteClass = (id: string, name: string, studentCount: number) => confirm({ title: `Delete ${name}?`, description: studentCount > 0 ? `This class has ${studentCount} student(s). The backend will decide whether deletion is allowed; local fallback archives classes with linked records.` : "This removes the class from the school class list.", confirmLabel: "Delete class", destructive: true, onConfirm: async () => { const result = await removeClass(id); toast(result === "REMOVED" ? `${name} deleted.` : `${name} has linked records, so it was archived.`, result === "REMOVED" ? "success" : "warning"); } });
  return <><PageHeader title="Classes" description="Manage class structures, arms, capacity and teacher access." action={<Button onClick={openCreateForm}><Plus size={16}/>Create Class</Button>}/>{(form || editingClass) && <Card className="mb-6 p-5"><h2 className="mb-4 font-semibold">{editingClass ? `Edit ${editingClass.displayName}` : "Create class"}</h2><ClassForm key={editingClass?.id ?? "new"} existing={editingClass} onDone={closeForm}/></Card>}<div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><SearchInput value={query} onChange={setQuery} placeholder="Search class or teacher"/><Select clearable label="Filter school level" value={level} onChange={setLevel} placeholder="All school levels" options={levelOptions.filter((item) => settings.schoolLevels.includes(item.value as SchoolLevel))}/><Select clearable label="Filter class status" value={status} onChange={setStatus} placeholder="All statuses" options={statusOptions}/><Select searchable clearable label="Filter class teacher" value={teacher} onChange={setTeacher} placeholder="All class teachers" options={state.teachers.map((item) => ({ value: item.userId, label: teacherName(item.firstName, item.lastName) }))}/></div><SectionCard title="School classes" description={`${visible.length} result(s)`}><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Class", "Level", "Arm", "Students", "Capacity", "Class teacher", "Assigned teachers", "Status", "Actions"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y">{visible.map((item) => { const classTeacher = getTeacherByUserId(state, item.classTeacherUserId ?? ""); return <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.displayName}</td><td className="px-4 py-3">{item.level}</td><td className="px-4 py-3">{item.arm ?? "-"}</td><td className="px-4 py-3">{item.studentIds.length}</td><td className="px-4 py-3">{item.capacity ?? "-"}</td><td className="px-4 py-3">{classTeacher ? teacherName(classTeacher.firstName, classTeacher.lastName) : "Unassigned"}</td><td className="px-4 py-3">{getTeachersByClass(state, item.id).length}</td><td className="px-4 py-3"><Badge tone={item.status === "ACTIVE" ? "success" : item.status === "INACTIVE" ? "warning" : "neutral"}>{item.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-2"><Link href={`/admin/academics/classes/${item.id}`} className="inline-flex items-center gap-1 font-semibold text-[var(--school-primary)]"><Eye size={14}/>View</Link><button className="inline-flex items-center gap-1 text-muted" onClick={() => openEditForm(item.id)}><Pencil size={14}/>Edit</button><button className="inline-flex items-center gap-1 text-muted" onClick={() => deleteClass(item.id, item.displayName, item.studentIds.length)}><Trash2 size={14}/>Delete</button></div></td></tr>; })}</tbody></table>{!visible.length && <p className="p-8 text-center text-sm text-muted">No classes match the current filters.</p>}</div></SectionCard></>;
}

export function AdminStudentsScreen() {
  const { settings } = useSchoolSettings();
  const { state, moveStudents } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const [query, setQuery] = useState(""); const [level, setLevel] = useState(""); const [classId, setClassId] = useState(""); const [status, setStatus] = useState(""); const [sort, setSort] = useState("name"); const [selected, setSelected] = useState<string[]>([]); const [destination, setDestination] = useState("");
  const classes = state.classes.filter((item) => item.status === "ACTIVE" && settings.schoolLevels.includes(item.level));
  const visible = useMemo(() => state.students.filter((item) => settings.schoolLevels.includes(item.schoolLevel) && (!level || item.schoolLevel === level) && (!classId || item.classId === classId) && (!status || item.status === status) && matchesSearch(query, item.firstName, item.middleName, item.lastName, item.admissionNumber, item.guardianName, item.guardianPhone, getClassById(state, item.classId)?.displayName)).sort((a, b) => sort === "admission" ? a.admissionNumber.localeCompare(b.admissionNumber) : `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)), [state, settings.schoolLevels, query, level, classId, status, sort]);
  const move = () => { const target = getClassById(state, destination); if (!target) return; confirm({ title: `Move ${selected.length} student(s)?`, description: `Their active class membership will change to ${target.displayName}. Existing historical records are retained.`, confirmLabel: "Move students", onConfirm: async () => { await moveStudents(selected, destination); setSelected([]); toast(`${selected.length} student(s) moved to ${target.displayName}.`, "success"); } }); };
  return <><PageHeader title="Students" description="Search, filter and move students using shared class membership records."/><div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5"><SearchInput value={query} onChange={setQuery} placeholder="Search student, parent or class"/><Select clearable label="School level" value={level} onChange={setLevel} placeholder="All levels" options={levelOptions.filter((item) => settings.schoolLevels.includes(item.value as SchoolLevel))}/><Select searchable clearable label="Class" value={classId} onChange={setClassId} placeholder="All classes" options={classes.map((item) => ({ value: item.id, label: item.displayName }))}/><Select clearable label="Student status" value={status} onChange={setStatus} placeholder="All statuses" options={["ACTIVE", "INACTIVE", "GRADUATED", "WITHDRAWN"].map((item) => ({ value: item, label: item }))}/><Select label="Sort students" value={sort} onChange={setSort} options={[{ value: "name", label: "Sort by name" }, { value: "admission", label: "Sort by admission number" }]}/></div>{selected.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-surface p-3"><b className="text-sm">{selected.length} selected</b><Select className="min-w-56" searchable label="Destination class" value={destination} onChange={setDestination} placeholder="Assign to class" options={classes.map((item) => ({ value: item.id, label: item.displayName }))}/><Button disabled={!destination} onClick={move}>Move students</Button></div>}<SectionCard title="Student records" description={`${visible.length} student(s) shown`}><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-surface-muted"><tr><th className="px-4 py-3"><input type="checkbox" aria-label="Select all visible students" checked={visible.length > 0 && visible.every((item) => selected.includes(item.id))} onChange={(event) => setSelected(event.target.checked ? [...new Set([...selected, ...visible.map((item) => item.id)])] : selected.filter((id) => !visible.some((item) => item.id === id)))}/></th>{["Student", "Admission no.", "Level", "Class", "Guardian", "Phone", "Status"].map((item) => <th key={item} className="px-4 py-3 text-xs uppercase text-muted">{item}</th>)}</tr></thead><tbody className="divide-y">{visible.map((student) => <tr key={student.id}><td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${student.firstName} ${student.lastName}`} checked={selected.includes(student.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))}/></td><td className="px-4 py-3 font-semibold">{student.firstName} {student.lastName}</td><td className="px-4 py-3">{student.admissionNumber}</td><td className="px-4 py-3">{student.schoolLevel}</td><td className="px-4 py-3">{getClassById(state, student.classId)?.displayName}</td><td className="px-4 py-3">{student.guardianName}</td><td className="px-4 py-3">{student.guardianPhone}</td><td className="px-4 py-3"><Badge tone={student.status === "ACTIVE" ? "success" : "neutral"}>{student.status}</Badge></td></tr>)}</tbody></table>{!visible.length && <EmptyState title="No students match the current filters." description="Clear the search or change the active filters."/>}</div></SectionCard></>;
}

export function TeacherAssignmentAdminScreen({ initialTeacherUserId = "" }: { initialTeacherUserId?: string }) {
  const { state, saveTeacherAssignments } = useAcademics();
  const { toast } = useActionFeedback();
  const [teacherId, setTeacherId] = useState(initialTeacherUserId); const [classId, setClassId] = useState(""); const [classTeacher, setClassTeacher] = useState(false); const [subjects, setSubjects] = useState<string[]>([]);
  const selectedClass = getClassById(state, classId);
  const existingForClass = state.teacherAssignments.filter((item) => item.teacherUserId === teacherId && item.classId === classId);
  const subjectOptions = state.subjects
    .filter((item) => item.status === "ACTIVE")
    .filter((item) => !selectedClass || item.level === selectedClass.level)
    .map((item) => ({ value: item.id, label: item.name, description: item.code ? `${item.level} · ${item.code}` : item.level }));
  const updateClass = (value: string) => { setClassId(value); const assignments = state.teacherAssignments.filter((item) => item.teacherUserId === teacherId && item.classId === value); setClassTeacher(assignments.some((item) => item.assignmentType === "CLASS_TEACHER")); setSubjects([...new Set(assignments.flatMap((item) => item.subjectIds))]); };
  const updateTeacher = (value: string) => { setTeacherId(value); setClassId(""); setClassTeacher(false); setSubjects([]); };
  const save = async () => { try { const assignmentType: TeacherClassAssignmentType = classTeacher ? "CLASS_TEACHER" : subjects.length ? "SUBJECT_TEACHER" : "GENERAL_ACCESS"; const count = await saveTeacherAssignments({ teacherUserId: teacherId, classIds: [classId], assignmentType, subjectIds: subjects, subjectAssignments: [{ classId, subjectIds: subjects }] }); toast(`${count} teacher assignment(s) saved.`, "success"); } catch (caught) { toast(caught instanceof Error ? caught.message : "Assignments could not be saved.", "error"); } };
  return <><PageHeader title="Teacher Class Assignments" description="Assign one class and its subjects in one save."/><Card className="mb-6 p-5"><div className="grid gap-4 sm:grid-cols-2"><Select searchable label="Teacher" value={teacherId} onChange={updateTeacher} options={state.teachers.map((item) => ({ value: item.userId, label: teacherName(item.firstName, item.lastName), description: item.staffId }))}/><Select searchable label="Class" value={classId} onChange={updateClass} placeholder="Select class" options={state.classes.filter((item) => item.status === "ACTIVE").map((item) => ({ value: item.id, label: item.displayName }))}/><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={classTeacher} onChange={(event) => setClassTeacher(event.target.checked)} />Class teacher</label><div className="sm:col-span-2"><MultiSelect label="Subjects for selected class" values={subjects} onChange={setSubjects} options={subjectOptions}/></div></div><Button className="mt-4" disabled={!teacherId || !classId} onClick={() => void save()}><UserRoundCog size={16}/>Save assignment</Button>{classId && <p className="mt-3 text-xs text-muted">{existingForClass.length ? "Existing assignments for this class will be replaced by this save." : "Leave subjects empty to assign class access only."}</p>}</Card></>;
}

function currentTeacherUserId() {
  return readStoredUser()?.id ?? "teacher-user-001";
}

export function TeacherClassesScreen() { const { state } = useAcademics(); const classes = getClassesForTeacher(state, currentTeacherUserId()); return <><PageHeader title="My Classes" description="Only classes granted through your teacher assignments are shown."/><div className="grid gap-4 sm:grid-cols-2">{classes.map((item) => <Card key={item.id} className="p-5"><div className="flex justify-between"><div><h2 className="font-semibold">{item.displayName}</h2><p className="mt-1 text-sm text-muted">{getStudentsByClass(state, item.id).length} students · capacity {item.capacity ?? "—"}</p></div><Users className="text-[var(--school-primary)]" size={20}/></div><Link className="mt-4 inline-flex font-semibold text-[var(--school-primary)]" href={`/teacher/classes/${item.id}`}>Open class</Link></Card>)}</div>{!classes.length && <EmptyState title="No assigned classes" description="Assigned classes will appear here once the backend returns them."/>}</>; }
export function TeacherClassDetailScreen({ classId }: { classId: string }) { const { state } = useAcademics(); const teacherId = currentTeacherUserId(); const item = getClassesForTeacher(state, teacherId).find((entry) => entry.id === classId); const subjects = [...new Set(state.teacherAssignments.filter((assignment) => assignment.teacherUserId === teacherId && assignment.classId === classId).flatMap((assignment) => assignment.subjectIds))].map((subjectId) => state.subjects.find((subject) => subject.id === subjectId)).filter((subject): subject is NonNullable<typeof subject> => Boolean(subject)); if (!item) return <div className="py-20 text-center"><ShieldX className="mx-auto text-danger" size={38}/><h1 className="mt-4 text-xl font-bold">Access Denied</h1><p className="mt-2 text-sm text-muted">This class is not assigned to your teacher account.</p></div>; return <><PageHeader title={item.displayName} description="Assigned class summary and student list."/><SectionCard title="Subjects taught" description={subjects.length ? `${subjects.length} assigned subject(s)` : "No subjects assigned for this class."}><div className="flex flex-wrap gap-2 p-5">{subjects.map((subject) => <Badge key={subject.id} tone="primary">{subject.code ? `${subject.name} (${subject.code})` : subject.name}</Badge>)}{!subjects.length && <p className="text-sm text-muted">Class access is assigned, but no subject has been selected for this class.</p>}</div></SectionCard><div className="mt-5"><TeacherStudentsScreen fixedClassId={classId}/></div></>; }
export function TeacherStudentsScreen({ fixedClassId }: { fixedClassId?: string }) { const { state } = useAcademics(); const classes = getClassesForTeacher(state, currentTeacherUserId()); const accessibleClassIds = new Set(classes.map((item) => item.id)); const [classId, setClassId] = useState(fixedClassId ?? ""); const [query, setQuery] = useState(""); const students = state.students.filter((item) => accessibleClassIds.has(item.classId) && (!classId || item.classId === classId) && matchesSearch(query, item.firstName, item.lastName, item.admissionNumber, getClassById(state, item.classId)?.displayName)); return <><PageHeader title="Students" description={`${students.length} student(s) from your assigned classes.`}/>{!fixedClassId && <div className="mb-5 grid gap-3 sm:grid-cols-2"><SearchInput value={query} onChange={setQuery} placeholder="Search assigned students"/><Select clearable label="Assigned class" value={classId} onChange={setClassId} placeholder="All assigned classes" options={classes.map((item) => ({ value: item.id, label: item.displayName }))}/></div>}<SectionCard title="Accessible students"><div className="divide-y px-5">{students.map((student) => <div key={student.id} className="py-4"><p className="font-semibold">{student.firstName} {student.lastName}</p><p className="text-sm text-muted">{student.admissionNumber} · {getClassById(state, student.classId)?.displayName}</p></div>)}</div>{!students.length && <EmptyState title="No assigned students" description="Assigned students will appear here once the backend returns them."/>}</SectionCard></>; }
