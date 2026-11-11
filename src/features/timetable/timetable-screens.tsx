"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { getAccessibleClassesForTeacher, getClassById, getTeacherByUserId } from "@/features/academics/academics.selectors";
import { resolveStudentSession } from "@/features/academics/student-session";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { academicTermLabel } from "@/features/academic-period/academic-period.types";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { readStoredToken } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
import { timetableRepository } from "./timetable.repository";
import { TIMETABLE_STORAGE_KEY } from "./timetable.storage";
import { visibleTimetableEntries } from "./timetable-period-utils";
import type { AcademicsState, Student } from "@/features/academics/academics.types";
import type { TimetableDay, TimetableEntry, TimetableInput } from "./timetable.types";

const days: TimetableDay[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const fallbackTeacherId = "teacher-user-001";
const fallbackStudentId = "student-yusuf";
const fallbackGuardianId = "guardian-001";

const dayLabel = (day: TimetableDay) => day.charAt(0) + day.slice(1).toLowerCase();
const timeRange = (entry: TimetableEntry) => `${entry.startTime} - ${entry.endTime}`;
const hasBackendSession = () => Boolean(readStoredToken());

function currentUserId() {
  return readStoredUser()?.id ?? fallbackTeacherId;
}

function currentStudentClassId(academics: AcademicsState) {
  return resolveStudentSession(academics, readStoredUser(), fallbackStudentId).classId;
}

function currentParentChildren(academics: AcademicsState) {
  const user = readStoredUser();
  const linked = new Set([...(user?.childStudentIds ?? [])]);
  const guardianId = user?.guardianId ?? academics.guardians.find((guardian) => guardian.userId === user?.id)?.id ?? fallbackGuardianId;
  return academics.students.filter((student) => linked.has(student.id) || student.guardianIds.includes(guardianId));
}

function teacherSubjectAccess(academics: AcademicsState, teacherUserId: string, classId?: string) {
  const ids = new Set<string>();
  const assignments = academics.teacherAssignments.filter(
    (assignment) =>
      assignment.teacherUserId === teacherUserId &&
      (!classId || assignment.classId === classId),
  );
  assignments.forEach((assignment) => assignment.subjectIds.forEach((subjectId) => ids.add(subjectId)));
  if (classId && assignments.length) {
    return {
      ids,
      restricted: assignments.every((assignment) => assignment.subjectIds.length > 0),
    };
  }
  academics.staff
    .find((person) => person.userId === teacherUserId || person.id === teacherUserId)
    ?.subjectIds.forEach((subjectId) => ids.add(subjectId));
  academics.teachers
    .find((teacher) => teacher.userId === teacherUserId || teacher.id === teacherUserId)
    ?.subjectIds.forEach((subjectId) => ids.add(subjectId));
  readStoredUser()?.assignedSubjectIds?.forEach((subjectId) => ids.add(subjectId));
  return { ids, restricted: ids.size > 0 };
}

function subjectOptions(academics: AcademicsState, classId?: string, teacherUserId?: string) {
  const schoolClass = classId ? getClassById(academics, classId) : undefined;
  const subjectAccess = teacherUserId ? teacherSubjectAccess(academics, teacherUserId, classId) : undefined;
  return academics.subjects
    .filter((subject) =>
      subject.status === "ACTIVE" &&
      (!schoolClass || subject.level === schoolClass.level) &&
      (!subjectAccess?.restricted || subjectAccess.ids.has(subject.id)))
    .map((subject) => ({ value: subject.id, label: subject.name, description: subject.code }));
}

function subjectName(academics: AcademicsState, subjectId: string) {
  return academics.subjects.find((subject) => subject.id === subjectId)?.name ?? subjectId;
}

function teacherName(academics: AcademicsState, teacherUserId: string) {
  const teacher = getTeacherByUserId(academics, teacherUserId) ?? academics.staff.find((person) => person.userId === teacherUserId);
  return teacher ? `${teacher.firstName} ${teacher.lastName}` : "Teacher";
}

function useTimetableEntries() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = async () => {
    try {
      setEntries(await timetableRepository.list());
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Timetable could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    void timetableRepository.list()
      .then((items) => { if (active) { setEntries(items); setError(""); } })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Timetable could not be loaded."); })
      .finally(() => { if (active) setIsLoading(false); });
    const sync = (event: StorageEvent) => {
      if (event.key === TIMETABLE_STORAGE_KEY) void refresh();
    };
    window.addEventListener("storage", sync);
    return () => { active = false; window.removeEventListener("storage", sync); };
  }, []);
  return { entries, refresh, isLoading, error };
}

function TimetableGrid({ entries, academics, title }: { entries: TimetableEntry[]; academics: AcademicsState; title?: string }) {
  const rows = useMemo(() => [...entries].sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || a.startTime.localeCompare(b.startTime)), [entries]);
  return <SectionCard title={title ?? "Weekly timetable"} description={`${rows.length} scheduled period(s)`}>
    <div className="grid gap-4 lg:grid-cols-5">
      {days.map((day) => {
        const dayRows = rows.filter((entry) => entry.day === day);
        return <Card key={day} className="p-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold">{dayLabel(day)}</h2><Badge>{dayRows.length}</Badge></div>
          <div className="mt-4 space-y-3">
            {dayRows.map((entry) => <div key={entry.id} className="rounded-lg border p-3">
              <p className="text-xs font-semibold text-[var(--school-primary)]">{timeRange(entry)}</p>
              <p className="mt-1 font-semibold">{subjectName(academics, entry.subjectId)}</p>
              <p className="text-xs text-muted">{getClassById(academics, entry.classId)?.displayName ?? entry.classId}</p>
              <p className="text-xs text-muted">{teacherName(academics, entry.teacherUserId)}{entry.room ? ` - ${entry.room}` : ""}</p>
              {entry.note && <p className="mt-2 text-xs text-muted">{entry.note}</p>}
            </div>)}
            {!dayRows.length && <p className="py-8 text-center text-xs text-muted">No periods</p>}
          </div>
        </Card>;
      })}
    </div>
  </SectionCard>;
}

export function TeacherTimetableScreen() {
  const { state: academics } = useAcademics();
  const { selectedSession, selectedTerm, scope } = useAcademicPeriod();
  const { settings } = useSchoolSettings();
  const { toast, confirm } = useActionFeedback();
  const { entries, refresh, isLoading, error } = useTimetableEntries();
  const academicSession = selectedSession?.name || settings.currentAcademicSession;
  const term = selectedTerm ? academicTermLabel(selectedTerm.name) : settings.currentTerm;
  const academicSessionId = selectedSession?.id;
  const termId = selectedTerm?.id;
  const periodEntries = visibleTimetableEntries(entries, { academicSessionId, termId, academicSession, term, isCurrentPeriod: scope.isCurrentPeriod }, hasBackendSession());
  const teacherId = currentUserId();
  const classes = getAccessibleClassesForTeacher(academics, teacherId);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const activeClassId = classes.some((item) => item.id === selectedClassId) ? selectedClassId : classes[0]?.id ?? "";
  const selectedClass = getClassById(academics, activeClassId);
  const subjects = subjectOptions(academics, activeClassId, teacherId);
  const [form, setForm] = useState<TimetableInput>({ classId: selectedClassId, subjectId: subjects[0]?.value ?? "", day: "MONDAY", startTime: "08:00", endTime: "08:40", room: "", note: "" });
  const activeSubjectId = subjects.some((item) => item.value === form.subjectId) ? form.subjectId : subjects[0]?.value ?? "";
  const classEntries = periodEntries.filter((entry) => entry.classId === activeClassId);
  const myEntries = periodEntries.filter((entry) => entry.teacherUserId === teacherId);

  const patch = <K extends keyof TimetableInput>(key: K, value: TimetableInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    try {
      await timetableRepository.save(teacherId, { ...form, classId: activeClassId, subjectId: activeSubjectId, academicSessionId, termId, academicSession, term }, undefined, scope.isCurrentPeriod);
      await refresh();
      toast("Timetable entry saved.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Timetable entry could not be saved.", "error");
    }
  };
  const remove = (entry: TimetableEntry) => confirm({
    title: "Delete timetable entry?",
    description: `${subjectName(academics, entry.subjectId)} on ${dayLabel(entry.day)} will be removed.`,
    confirmLabel: "Delete Entry",
    destructive: true,
    onConfirm: async () => {
      await timetableRepository.remove(teacherId, entry.id);
      await refresh();
      toast("Timetable entry removed.", "success");
    },
  });

  return <>
    <PageHeader title="Timetable" description="Manage the school weekly schedule for classes assigned to you." />
    {error && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!classes.length ? <EmptyState title="No assigned classes" description="Ask admin to assign this teacher to a class before creating timetables." /> : <>
      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card className="p-5">
          <h2 className="font-semibold">Create period</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Select label="Class" value={activeClassId} onChange={setSelectedClassId} options={classes.map((item) => ({ value: item.id, label: item.displayName }))} />
            <Select label="Subject" value={activeSubjectId} onChange={(value) => patch("subjectId", value)} options={subjects} />
            <Select label="Day" value={form.day} onChange={(value) => patch("day", value as TimetableDay)} options={days.map((day) => ({ value: day, label: dayLabel(day) }))} />
            <label className="text-sm font-medium">Room<Input className="mt-2" value={form.room ?? ""} onChange={(event) => patch("room", event.target.value)} placeholder="Lab 1, Room 4..." /></label>
            <label className="text-sm font-medium">Start time<Input className="mt-2" type="time" value={form.startTime} onChange={(event) => patch("startTime", event.target.value)} /></label>
            <label className="text-sm font-medium">End time<Input className="mt-2" type="time" value={form.endTime} onChange={(event) => patch("endTime", event.target.value)} /></label>
            <label className="text-sm font-medium sm:col-span-2">Note<Input className="mt-2" value={form.note ?? ""} onChange={(event) => patch("note", event.target.value)} placeholder="Optional note" /></label>
          </div>
          <Button className="mt-4" onClick={() => void save()}><Plus size={16} />Add to timetable</Button>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">{selectedClass?.displayName ?? "Class"} periods</h2>
          <div className="mt-4 divide-y">
            {[...classEntries].sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || a.startTime.localeCompare(b.startTime)).map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
              <div><p className="font-semibold">{subjectName(academics, entry.subjectId)}</p><p className="text-sm text-muted">{dayLabel(entry.day)} - {timeRange(entry)}{entry.room ? ` - ${entry.room}` : ""}</p></div>
              {entry.teacherUserId === teacherId && <Button variant="ghost" onClick={() => remove(entry)}><Trash2 size={15} /></Button>}
            </div>)}
            {!classEntries.length && <p className="py-8 text-center text-sm text-muted">No periods have been added for this class.</p>}
          </div>
        </Card>
      </div>
      {isLoading ? <p className="py-8 text-center text-sm text-muted">Loading timetable...</p> : <TimetableGrid entries={myEntries} academics={academics} title="My teaching week" />}
    </>}
  </>;
}

export function StudentTimetableScreen() {
  const { state: academics } = useAcademics();
  const { selectedSession, selectedTerm, scope } = useAcademicPeriod();
  const { settings } = useSchoolSettings();
  const { entries, isLoading, error } = useTimetableEntries();
  const academicSession = selectedSession?.name || settings.currentAcademicSession;
  const term = selectedTerm ? academicTermLabel(selectedTerm.name) : settings.currentTerm;
  const periodEntries = visibleTimetableEntries(entries, { academicSessionId: selectedSession?.id, termId: selectedTerm?.id, academicSession, term, isCurrentPeriod: scope.isCurrentPeriod }, hasBackendSession());
  const studentClassId = currentStudentClassId(academics);
  const rows = hasBackendSession()
    ? periodEntries
    : periodEntries.filter((entry) => entry.classId === studentClassId);
  const schoolClass = studentClassId ? getClassById(academics, studentClassId) : undefined;
  return <>
    <PageHeader title="Timetable" description={schoolClass ? `Weekly timetable for ${schoolClass.displayName}.` : "Your class timetable."} />
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> :
      isLoading ? <p className="py-8 text-center text-sm text-muted">Loading timetable...</p> :
      studentClassId || hasBackendSession() ? <TimetableGrid entries={rows} academics={academics} /> : <EmptyState title="Student class not found" description="Your timetable appears after your student profile is linked to a class." />}
  </>;
}

export function ParentTimetableScreen() {
  const { state: academics } = useAcademics();
  const { selectedSession, selectedTerm, scope } = useAcademicPeriod();
  const { settings } = useSchoolSettings();
  const { entries, isLoading, error } = useTimetableEntries();
  const academicSession = selectedSession?.name || settings.currentAcademicSession;
  const term = selectedTerm ? academicTermLabel(selectedTerm.name) : settings.currentTerm;
  const periodEntries = visibleTimetableEntries(entries, { academicSessionId: selectedSession?.id, termId: selectedTerm?.id, academicSession, term, isCurrentPeriod: scope.isCurrentPeriod }, hasBackendSession());
  const children = currentParentChildren(academics);
  const [selected, setSelected] = useState(children[0]?.id ?? "");
  const child = children.find((item) => item.id === selected) ?? children[0];
  const rows = child?.classId
    ? periodEntries.filter((entry) => entry.classId === child.classId)
    : hasBackendSession() ? periodEntries : [];
  return <>
    <PageHeader title="Children's Timetable" description="View class schedules for linked children." />
    {children.length ? <Select className="mb-5 max-w-sm" label="Child" value={child?.id ?? selected} onChange={setSelected} options={children.map((item: Student) => ({ value: item.id, label: `${item.firstName} ${item.lastName}` }))} /> : !hasBackendSession() && <EmptyState title="No linked children" description="Linked children will appear once parent records are connected." />}
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> :
      isLoading ? <p className="py-8 text-center text-sm text-muted">Loading timetable...</p> :
      (child || hasBackendSession()) && <TimetableGrid entries={rows} academics={academics} title={child ? `${child.firstName}'s week` : "Linked classes"} />}
  </>;
}

export function TeacherTimetableModal({ teacherUserId, teacherName: name, onClose }: {
  teacherUserId: string;
  teacherName: string;
  onClose: () => void;
}) {
  const { state: academics } = useAcademics();
  const { selectedSession, selectedTerm, scope } = useAcademicPeriod();
  const { settings } = useSchoolSettings();
  const { entries, isLoading, error } = useTimetableEntries();
  const academicSession = selectedSession?.name || settings.currentAcademicSession;
  const term = selectedTerm ? academicTermLabel(selectedTerm.name) : settings.currentTerm;
  const rows = visibleTimetableEntries(entries, {
    academicSessionId: selectedSession?.id,
    termId: selectedTerm?.id,
    academicSession,
    term,
    isCurrentPeriod: scope.isCurrentPeriod,
  }, hasBackendSession()).filter((entry) => entry.teacherUserId === teacherUserId);

  return <Modal open title={`${name}'s timetable`} description={hasBackendSession() ? "School weekly timetable" : `${academicSession} · ${term}`} maxWidth="2xl" presentation="modal" onClose={onClose}>
    {isLoading ? <p className="py-8 text-center text-sm text-muted">Loading timetable...</p> :
      error ? <p role="alert" className="py-8 text-center text-sm text-red-600">{error}</p> :
      <TimetableGrid entries={rows} academics={academics} title="Teaching week" />}
  </Modal>;
}
