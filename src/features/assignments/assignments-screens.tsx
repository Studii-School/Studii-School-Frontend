"use client";

import { useMemo, useState } from "react";
import { Copy, FileUp, Plus, Send, Trash2, X } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { getAccessibleClassesForTeacher, getClassById } from "@/features/academics/academics.selectors";
import { resolveStudentSession } from "@/features/academics/student-session";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { assignmentRemovalPolicy } from "@/features/action-feedback/record-action.policy";
import { readStoredToken } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
import { matchesSearch } from "@/lib/search";
import { readAssignmentAsset } from "./assignment-asset.repository";
import { useAssignments } from "./assignments-context";
import type { AcademicsState, Student, Subject } from "@/features/academics/academics.types";
import type { Assignment, AssignmentAsset, AssignmentInput, AssignmentSubmission } from "./assignments.types";

const fallbackTeacherId = "teacher-user-001";
const fallbackStudentId = "student-yusuf";
const fallbackGuardianId = "guardian-001";
const hasBackendSession = () => Boolean(readStoredToken());

function currentUserId() {
  return readStoredUser()?.id ?? fallbackTeacherId;
}

function currentStudentId(academics: AcademicsState) {
  return resolveStudentSession(academics, readStoredUser(), fallbackStudentId).studentId ?? fallbackStudentId;
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

function publishedAssignmentForStudent(assignment: Assignment, classId: string | undefined) {
  return Boolean(classId && assignment.status !== "DRAFT" && assignment.classId === classId);
}

function submissionFor(state: { submissions: AssignmentSubmission[] }, assignmentId: string, studentId: string) {
  return state.submissions.find((entry) => entry.assignmentId === assignmentId && entry.studentId === studentId);
}

function effectiveSubmission(state: { submissions: AssignmentSubmission[] }, assignment: Assignment, studentId: string): AssignmentSubmission {
  return submissionFor(state, assignment.id, studentId) ?? {
    id: `pending-${assignment.id}-${studentId}`,
    assignmentId: assignment.id,
    studentId,
    status: "NOT_SUBMITTED",
    text: "",
    updatedAt: assignment.publishedAt ?? assignment.updatedAt,
  };
}

function subjectName(academics: AcademicsState, id: string) {
  return academics.subjects.find((subject) => subject.id === id)?.name ?? id;
}

function due(value: string) {
  return value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No due date";
}

function tone(status: string) {
  return status === "PUBLISHED" || status === "SUBMITTED" || status === "GRADED"
    ? "success"
    : status === "LATE"
      ? "danger"
      : status === "DRAFT"
        ? "warning"
        : "neutral";
}

function assignmentMeta(academics: AcademicsState, item: Assignment) {
  return `${subjectName(academics, item.subjectId)} - ${getClassById(academics, item.classId)?.displayName ?? "Class"} - Due ${due(item.dueAt)}`;
}

export function TeacherAssignmentsScreen() {
  const { state, publish, close, remove } = useAssignments();
  const { state: academics } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const teacherId = currentUserId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [classId, setClassId] = useState("");
  const classes = getAccessibleClassesForTeacher(academics, teacherId);
  const classIds = new Set(classes.map((item) => item.id));
  const assignments = state.assignments.filter((item) =>
    item.teacherUserId === teacherId &&
    classIds.has(item.classId) &&
    (!status || item.status === status) &&
    (!classId || item.classId === classId) &&
    matchesSearch(query, item.title, item.instructions, subjectName(academics, item.subjectId), getClassById(academics, item.classId)?.displayName),
  );

  const publishItem = (id: string) => confirm({
    title: "Publish assignment?",
    description: "Submission records will be created for every student currently in this class.",
    confirmLabel: "Publish Assignment",
    onConfirm: async () => {
      await publish(id);
      toast("Assignment published successfully.", "success");
    },
  });

  const deleteItem = (item: Assignment) => {
    const submitted = state.submissions.filter((entry) => entry.assignmentId === item.id && entry.status !== "NOT_SUBMITTED").length;
    const policy = assignmentRemovalPolicy(item.status, submitted);
    if (!policy.allowed) {
      toast(policy.reason ?? "This assignment cannot be deleted.", "warning");
      return;
    }
    confirm({
      title: "Delete assignment?",
      description: "This assignment and draft submission records will be removed.",
      confirmLabel: "Delete Assignment",
      destructive: true,
      onConfirm: async () => {
        await remove(item.id);
        toast("Assignment deleted successfully.", "success");
      },
    });
  };

  return <>
    <PageHeader title="Assignments" description="Create class work for assigned classes and follow every student submission." action={<Link href="/teacher/assignments/new" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-[var(--school-primary)] px-4 text-sm font-semibold text-white"><Plus size={16} />New assignment</Link>} />
    <div className="mb-5 grid gap-3 md:grid-cols-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Search assignments" />
      <Select clearable label="Assignment class" value={classId} onChange={setClassId} placeholder="All classes" options={classes.map((item) => ({ value: item.id, label: item.displayName }))} />
      <Select clearable label="Assignment status" value={status} onChange={setStatus} placeholder="All statuses" options={["DRAFT", "PUBLISHED", "CLOSED"].map((value) => ({ value, label: value }))} />
    </div>
    <div className="grid gap-4">
      {assignments.map((item) => {
        const rows = state.submissions.filter((entry) => entry.assignmentId === item.id);
        const submitted = rows.filter((entry) => entry.status !== "NOT_SUBMITTED").length;
        return <Card key={item.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><h2 className="font-semibold">{item.title}</h2><Badge tone={tone(item.status)}>{item.status}</Badge></div>
              <p className="mt-1 text-sm text-muted">{assignmentMeta(academics, item)}</p>
              <p className="mt-3 text-sm">{submitted} submitted - {rows.length - submitted} not submitted - {rows.filter((entry) => entry.status === "LATE").length} late</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="min-h-10 rounded-[10px] border px-3 py-2 text-sm font-semibold" href={`/teacher/assignments/${item.id}`}>View</Link>
              {item.status === "DRAFT" && <><Button variant="outline" onClick={() => publishItem(item.id)}>Publish</Button><Button variant="outline" onClick={() => deleteItem(item)}><Trash2 size={14} />Delete</Button></>}
              {item.status === "PUBLISHED" && <Button variant="outline" onClick={() => confirm({ title: "Close assignment?", description: "Students will no longer be able to submit work.", confirmLabel: "Close Assignment", destructive: true, onConfirm: async () => { await close(item.id); toast("Assignment closed successfully.", "success"); } })}>Close</Button>}
            </div>
          </div>
        </Card>;
      })}
      {!assignments.length && <EmptyState title="No assignments yet" description={classes.length ? "Create an assignment for one of your assigned classes." : "Assigned classes will appear after admin grants class access."} />}
    </div>
  </>;
}

export function TeacherAssignmentForm({ assignmentId }: { assignmentId?: string }) {
  const { state: academics } = useAcademics();
  const { state, save, publish } = useAssignments();
  const { confirm, toast } = useActionFeedback();
  const teacherId = currentUserId();
  const existing = state.assignments.find((item) => item.id === assignmentId && item.teacherUserId === teacherId);
  const classes = getAccessibleClassesForTeacher(academics, teacherId);
  const [form, setForm] = useState<AssignmentInput>({
    classId: existing?.classId ?? classes[0]?.id ?? "",
    subjectId: existing?.subjectId ?? subjectOptions(academics, classes[0]?.id, teacherId)[0]?.value ?? "",
    title: existing?.title ?? "",
    instructions: existing?.instructions ?? "",
    dueAt: existing?.dueAt ?? "",
    attachment: existing?.attachment,
  });
  const [busy, setBusy] = useState(false);
  const subjects = subjectOptions(academics, form.classId, teacherId);
  const patch = <K extends keyof AssignmentInput>(key: K, value: AssignmentInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateClass = (value: string) => {
    const nextSubjects = subjectOptions(academics, value, teacherId);
    setForm((current) => ({ ...current, classId: value, subjectId: nextSubjects.some((item) => item.value === current.subjectId) ? current.subjectId : nextSubjects[0]?.value ?? "" }));
  };
  const perform = async (shouldPublish: boolean) => {
    setBusy(true);
    try {
      const id = await save(form, assignmentId);
      if (shouldPublish) await publish(id);
      toast(shouldPublish ? "Assignment published successfully." : existing ? "Assignment updated successfully." : "Assignment created successfully.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Assignment could not be saved.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!classes.length) return <EmptyState title="No assigned classes" description="Ask admin to assign this teacher to a class before creating assignments." />;

  return <>
    <PageHeader title={existing ? "Edit Assignment" : "New Assignment"} description="Draft first or publish immediately to notify students." />
    <Card className="p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select searchable label="Class" value={form.classId} onChange={updateClass} options={classes.map((item) => ({ value: item.id, label: item.displayName }))} />
        <Select searchable label="Subject" value={form.subjectId} onChange={(value) => patch("subjectId", value)} options={subjects} />
        <label className="text-sm font-medium sm:col-span-2">Title<Input className="mt-2" value={form.title} onChange={(event) => patch("title", event.target.value)} /></label>
        <label className="text-sm font-medium sm:col-span-2">Instructions<textarea className="mt-2 min-h-36 w-full rounded-[10px] border bg-surface p-3" value={form.instructions} onChange={(event) => patch("instructions", event.target.value)} /></label>
        <label className="text-sm font-medium">Due date and time<Input className="mt-2" type="datetime-local" value={form.dueAt} onChange={(event) => patch("dueAt", event.target.value)} /></label>
        <label className="text-sm font-medium">Attachment<Input className="mt-2" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readAssignmentAsset(file).then((asset) => patch("attachment", asset)).catch((error) => toast(error.message, "error")); }} />{form.attachment && <span className="mt-2 flex items-center justify-between rounded-lg bg-surface-muted p-2 text-xs">{form.attachment.name}<button type="button" aria-label="Remove assignment attachment" onClick={() => patch("attachment", undefined)}><X size={15} /></button></span>}</label>
      </div>
      <div className="mt-5 flex gap-2"><Button disabled={busy} variant="outline" onClick={() => void perform(false)}>{busy ? "Saving..." : "Save draft"}</Button><Button disabled={busy} onClick={() => confirm({ title: "Publish assignment?", description: "Submission records will be created for every student currently in this class.", confirmLabel: "Publish Assignment", onConfirm: () => perform(true) })}><Send size={16} />Publish</Button></div>
    </Card>
  </>;
}

export function TeacherAssignmentDetail({ assignmentId }: { assignmentId: string }) {
  const { state, duplicate, close, remove, grade } = useAssignments();
  const { state: academics } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const teacherId = currentUserId();
  const item = state.assignments.find((entry) => entry.id === assignmentId && entry.teacherUserId === teacherId);
  if (!item) return <EmptyState title="Assignment unavailable" description="It may not belong to your account." />;
  const rows = state.submissions.filter((entry) => entry.assignmentId === item.id);
  const submitted = rows.filter((entry) => entry.status !== "NOT_SUBMITTED").length;
  const deleteAction = () => {
    const policy = assignmentRemovalPolicy(item.status, submitted);
    if (!policy.allowed) {
      toast(policy.reason ?? "This assignment cannot be deleted.", "warning");
      return;
    }
    confirm({ title: "Delete assignment?", description: "The assignment and draft submission records will be permanently removed.", confirmLabel: "Delete Assignment", destructive: true, onConfirm: async () => { await remove(item.id); toast("Assignment deleted successfully.", "success"); } });
  };
  return <>
    <PageHeader title={item.title} description={assignmentMeta(academics, item)} action={<div className="flex gap-2"><Button variant="outline" onClick={() => void duplicate(item.id).then(() => toast("Assignment duplicated successfully.", "success"))}><Copy size={16} />Duplicate</Button>{item.status === "DRAFT" && <Button variant="outline" onClick={deleteAction}><Trash2 size={15} />Delete</Button>}{item.status === "PUBLISHED" && <Button variant="outline" onClick={() => confirm({ title: "Close assignment?", description: "Existing submissions remain available, but students can no longer submit.", confirmLabel: "Close Assignment", destructive: true, onConfirm: async () => { await close(item.id); toast("Assignment closed successfully.", "success"); } })}>Close</Button>}</div>} />
    <Card className="mb-5 p-5"><Badge tone={tone(item.status)}>{item.status}</Badge><p className="mt-3 whitespace-pre-wrap text-sm">{item.instructions}</p>{item.attachment && <a download={item.attachment.name} href={item.attachment.dataUrl} className="mt-4 inline-flex font-semibold text-[var(--school-primary)]">Download {item.attachment.name}</a>}</Card>
    <SectionCard title="Student submissions" description={`${submitted} of ${rows.length} received`}>
      <div className="divide-y px-5">{rows.map((submission) => <SubmissionRow key={submission.id} assignment={item} submission={submission} students={academics.students} onGrade={async (input) => { await grade(item.id, submission.id, input); toast("Assignment graded and results updated.", "success"); }} />)}</div>
    </SectionCard>
  </>;
}

function SubmissionRow({ assignment, submission, students, onGrade }: { assignment: Assignment; submission: AssignmentSubmission; students: Student[]; onGrade: (input: { score: number; maxScore?: number; feedback?: string }) => Promise<void> }) {
  const { toast } = useActionFeedback();
  const student = students.find((entry) => entry.id === submission.studentId);
  const [score, setScore] = useState(submission.score?.toString() ?? "");
  const [maxScore, setMaxScore] = useState((assignment.maxScore ?? 10).toString());
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const canGrade = submission.status !== "NOT_SUBMITTED";
  const saveGrade = async () => {
    setBusy(true);
    try {
      await onGrade({ score: Number(score), maxScore: Number(maxScore), feedback });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Grade could not be saved.", "error");
    } finally {
      setBusy(false);
    }
  };
  return <div className="grid gap-4 py-4 lg:grid-cols-[1fr_22rem]">
    <div>
      <div className="flex items-center gap-2"><p className="font-semibold">{student?.firstName} {student?.lastName}</p><Badge tone={tone(submission.status)}>{submission.status.replaceAll("_", " ")}</Badge></div>
      <p className="text-sm text-muted">{student?.admissionNumber}{submission.submittedAt ? ` - ${due(submission.submittedAt)}` : ""}</p>
      {submission.text && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-surface-muted p-3 text-sm">{submission.text}</p>}
      {submission.attachment && <a download={submission.attachment.name} href={submission.attachment.dataUrl} className="mt-3 inline-flex font-semibold text-[var(--school-primary)]">Download {submission.attachment.name}</a>}
      {!canGrade && <p className="mt-3 text-sm text-muted">No submission yet.</p>}
    </div>
    <div className="rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium">Score<Input className="mt-1" disabled={!canGrade || busy} type="number" min="0" max={Number(maxScore) || 10} value={score} onChange={(event) => setScore(event.target.value)} /></label>
        <label className="text-xs font-medium">Max<Input className="mt-1" disabled={!canGrade || busy} type="number" min="1" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} /></label>
      </div>
      <label className="mt-2 block text-xs font-medium">Feedback<textarea disabled={!canGrade || busy} className="mt-1 min-h-20 w-full rounded-[10px] border bg-surface p-2 text-sm disabled:bg-surface-muted" value={feedback} onChange={(event) => setFeedback(event.target.value)} /></label>
      <Button className="mt-3 w-full" disabled={!canGrade || busy || !score} onClick={() => void saveGrade()}>{busy ? "Saving..." : submission.status === "GRADED" ? "Update grade" : "Save grade"}</Button>
    </div>
  </div>;
}

export function StudentAssignmentsScreen() {
  const { state } = useAssignments();
  const { state: academics } = useAcademics();
  const studentId = currentStudentId(academics);
  const studentClassId = currentStudentClassId(academics);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const visible = state.assignments.filter((item) =>
    (hasBackendSession() ? item.status !== "DRAFT" : publishedAssignmentForStudent(item, studentClassId)) &&
    (!status || effectiveSubmission(state, item, studentId).status === status) &&
    matchesSearch(query, item.title, item.instructions, subjectName(academics, item.subjectId)),
  );
  return <>
    <PageHeader title="Assignments" description="Review due work and submit directly to your teacher." />
    <div className="mb-5 grid gap-3 sm:grid-cols-2"><SearchInput value={query} onChange={setQuery} placeholder="Search assignments" /><Select clearable label="Submission status" value={status} onChange={setStatus} placeholder="All statuses" options={["NOT_SUBMITTED", "SUBMITTED", "LATE", "GRADED"].map((value) => ({ value, label: value.replaceAll("_", " ") }))} /></div>
    <div className="grid gap-4">{visible.map((item) => { const submission = effectiveSubmission(state, item, studentId); return <Card className="p-5" key={item.id}><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{item.title}</h2><p className="mt-1 text-sm text-muted">{assignmentMeta(academics, item)}</p><Badge className="mt-3" tone={tone(submission.status)}>{submission.status.replaceAll("_", " ")}</Badge></div><Link href={`/student/assignments/${item.id}`} className="font-semibold text-[var(--school-primary)]">View</Link></div></Card>; })}{!visible.length && <EmptyState title="No assignments" description="Published assignments for your class will appear here." />}</div>
  </>;
}

export function StudentAssignmentDetail({ assignmentId }: { assignmentId: string }) {
  const { state, submit } = useAssignments();
  const { state: academics } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const studentId = currentStudentId(academics);
  const studentClassId = currentStudentClassId(academics);
  const item = state.assignments.find((entry) =>
    entry.id === assignmentId &&
    (hasBackendSession() ? entry.status !== "DRAFT" : publishedAssignmentForStudent(entry, studentClassId)),
  );
  const submission = item ? effectiveSubmission(state, item, studentId) : undefined;
  const [text, setText] = useState(submission?.text ?? "");
  const [asset, setAsset] = useState<AssignmentAsset | undefined>(submission?.attachment);
  const [busy, setBusy] = useState(false);
  if (!item || !submission) return <EmptyState title="Assignment unavailable" description="This work is not assigned to your account." />;
  const submitted = submission.status !== "NOT_SUBMITTED";
  const perform = async () => {
    setBusy(true);
    try {
      await submit(item.id, text, asset, studentId, studentClassId);
      toast("Assignment submitted successfully.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Assignment could not be submitted.", "error");
    } finally {
      setBusy(false);
    }
  };
  return <>
    <PageHeader title={item.title} description={assignmentMeta(academics, item)} />
    <Card className="mb-5 p-5"><p className="whitespace-pre-wrap text-sm">{item.instructions}</p>{item.attachment && <a download={item.attachment.name} href={item.attachment.dataUrl} className="mt-4 inline-flex font-semibold text-[var(--school-primary)]">Download teacher attachment</a>}</Card>
    <SectionCard title="Your submission" description={submitted ? `Submitted ${submission.submittedAt ? due(submission.submittedAt) : ""}` : "Not submitted"}>
      <div className="space-y-4 p-5"><textarea disabled={submitted} aria-label="Assignment response" className="min-h-40 w-full rounded-[10px] border bg-surface p-3 disabled:bg-surface-muted" value={text} onChange={(event) => setText(event.target.value)} placeholder="Write your response" /><Input disabled={submitted} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readAssignmentAsset(file).then(setAsset).catch((error) => toast(error.message, "error")); }} />{asset && <p className="flex items-center gap-2 text-sm text-muted"><FileUp size={15} />{asset.name}{!submitted && <button type="button" aria-label="Remove submission attachment" onClick={() => setAsset(undefined)}><X size={15} /></button>}</p>}<Button disabled={submitted || busy} onClick={() => confirm({ title: "Submit assignment?", description: "Your final answer will be sent to the teacher and cannot be edited afterwards.", confirmLabel: "Submit Assignment", onConfirm: perform })}>{busy ? "Submitting..." : "Submit assignment"}</Button></div>
    </SectionCard>
  </>;
}

export function ParentAssignmentsScreen() {
  const { state } = useAssignments();
  const { state: academics } = useAcademics();
  const children = currentParentChildren(academics);
  const [selected, setSelected] = useState(children[0]?.id ?? "");
  const child = children.find((item) => item.id === selected) ?? children[0];
  const rows = child
    ? state.assignments
      .filter((assignment) => publishedAssignmentForStudent(assignment, child.classId))
      .map((assignment) => ({ assignment, submission: effectiveSubmission(state, assignment, child.id) }))
    : [];
  return <>
    <PageHeader title="Children's Assignments" description="Monitor due work and submission status. Only students can submit." />
    {children.length ? <Select className="mb-5 max-w-sm" label="Child" value={child?.id ?? selected} onChange={setSelected} options={children.map((item) => ({ value: item.id, label: `${item.firstName} ${item.lastName}` }))} /> : <EmptyState title="No linked children" description="Linked children will appear once parent records are connected." />}
    {child && <SectionCard title={`${child.firstName}'s assignments`}><div className="divide-y px-5">{rows.map(({ assignment, submission }) => <div key={submission.id} className="flex items-center justify-between gap-3 py-4"><div><p className="font-semibold">{assignment.title}</p><p className="text-sm text-muted">{assignmentMeta(academics, assignment)}</p></div><Badge tone={tone(submission.status)}>{submission.status.replaceAll("_", " ")}</Badge></div>)}</div>{!rows.length && <EmptyState title="No assignments" description="Published assignments for this child will appear here." />}</SectionCard>}
  </>;
}
