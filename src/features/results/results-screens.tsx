"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Lock, Printer, Save, Settings2, Unlock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademics } from "@/features/academics/academics-context";
import { getClassById, getTeacherByUserId, getTeacherClassAssignments } from "@/features/academics/academics.selectors";
import { academicsRepository } from "@/features/academics/academics.repository";
import type { SchoolClass } from "@/features/academics/academics.types";
import { parentChildrenFromAcademics, studentLabel } from "@/features/parents/parent-child-utils";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PersonNameLink } from "@/features/people/person-name-link";
import { readStoredUser } from "@/lib/auth";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { academicTermLabel } from "@/features/academic-period/academic-period.types";
import { resultsRepository } from "./results.repository";
import { buildScoreEntries, type ScoreEdits } from "./score-entry";
import type { AcademicsState } from "@/features/academics/academics.types";
import type { AssessmentComponent, FamilyResult, GradeBand, ResultSettings, ResultStatus, ResultStudentRow, ScoreProgress, StudentResult, TeacherResultAssignment } from "./results.types";

const statusTone = (status: ResultStatus) => status === "PUBLISHED" || status === "APPROVED" ? "success" as const : status === "SUBMITTED" ? "warning" as const : "neutral" as const;
const nameOf = (student?: { firstName: string; middleName?: string; lastName: string }) => [student?.firstName, student?.middleName, student?.lastName].filter(Boolean).join(" ");
const className = (item?: { name: string; section?: string }) => [item?.name, item?.section].filter(Boolean).join(" ");
const firstResult = (student: ResultStudentRow) => student.results[0];
const currentUserId = () => readStoredUser()?.id ?? "teacher-user-001";

function teacherAssignmentsFromAcademics(
  state: AcademicsState,
  userId: string,
  sessionId: string,
  sessionName: string,
): TeacherResultAssignment[] {
  const teacher = getTeacherByUserId(state, userId);
  const seen = new Set<string>();
  return getTeacherClassAssignments(state, userId).flatMap((assignment) => {
    const schoolClass = getClassById(state, assignment.classId);
    if (!schoolClass || schoolClass.status !== "ACTIVE") return [];
    if (schoolClass.academicSessionId && schoolClass.academicSessionId !== sessionId) return [];
    if (schoolClass.academicYear && schoolClass.academicYear.trim().toLowerCase() !== sessionName.trim().toLowerCase()) return [];
    const subjectIds = assignment.subjectIds.length ? assignment.subjectIds : teacher?.subjectIds ?? [];
    return subjectIds.flatMap((subjectId) => {
      const subject = state.subjects.find((item) => item.id === subjectId && item.status === "ACTIVE" && item.level === schoolClass.level);
      const key = `${schoolClass.id}:${subject?.id ?? subjectId}`;
      if (!subject || seen.has(key)) return [];
      seen.add(key);
      return [{
        id: `academics-${assignment.id}-${subject.id}`,
        classId: schoolClass.id,
        subjectId: subject.id,
        class: { id: schoolClass.id, name: schoolClass.displayName || schoolClass.name || schoolClass.baseName, section: schoolClass.section ?? schoolClass.arm },
        subject: { id: subject.id, name: subject.name, code: subject.code },
      }];
    });
  });
}

export function TeacherResultsScreen() {
  const periods = usePeriods();
  const { toast } = useActionFeedback();
  const { state: academics, isLoading: academicsLoading } = useAcademics();
  const [settings, setSettings] = useState<ResultSettings>();
  const [assignments, setAssignments] = useState<TeacherResultAssignment[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [classData, setClassData] = useState<{ students: ResultStudentRow[] }>();
  const [classLoading, setClassLoading] = useState(false);
  const [classError, setClassError] = useState("");
  const [scores, setScores] = useState<ScoreEdits>({});
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const userId = currentUserId();
  const academicsAssignments = useMemo(
    () => teacherAssignmentsFromAcademics(academics, userId, periods.sessionId, periods.selectedSession?.name ?? ""),
    [academics, userId, periods.sessionId, periods.selectedSession?.name],
  );
  const assignment = assignments.find((item) => item.id === assignmentId);
  const components = settings?.components.filter((item) => item.isActive !== false) ?? [];
  const hasCompleteDraftScores = Boolean(assignment && classData?.students.some((student) => {
    const result = firstResult(student);
    const score = result?.subjectScores.find((item) => item.subjectId === assignment.subjectId);
    return score?.status === "DRAFT" && !score.locked && !result?.locked &&
      components.every((component) => Object.hasOwn(score.components, component.name));
  }));
  const isClassTeacher = Boolean(assignment && (
    getClassById(academics, assignment.classId)?.classTeacherUserId === userId ||
    academics.teacherAssignments.some((item) => item.teacherUserId === userId && item.classId === assignment.classId && item.assignmentType === "CLASS_TEACHER")
  ));

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    void Promise.allSettled([resultsRepository.getSettings(), resultsRepository.getTeacherAssignments()])
      .then(([settingsResult, assignmentsResult]) => {
        if (cancelled) return;
        if (settingsResult.status === "fulfilled") setSettings(settingsResult.value);
        else toast(settingsResult.reason instanceof Error ? settingsResult.reason.message : "Results settings could not be loaded.", "error");
        if (assignmentsResult.status === "rejected" && !academicsAssignments.length) toast(assignmentsResult.reason instanceof Error ? assignmentsResult.reason.message : "Teacher result assignments could not be loaded.", "error");
        const allowedPairs = new Set(academicsAssignments.map((item) => `${item.classId}:${item.subjectId}`));
        const backendAssignments = assignmentsResult.status === "fulfilled"
          ? assignmentsResult.value.filter((item) => allowedPairs.has(`${item.classId}:${item.subjectId}`))
          : [];
        const rows = mergeTeacherResultAssignments(backendAssignments, academicsAssignments);
        setAssignments(rows);
        setAssignmentId((current) => rows.some((item) => item.id === current) ? current : rows[0]?.id || "");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [academicsAssignments, toast]);

  useEffect(() => {
    setClassData(undefined);
    setScores({});
    setClassError("");
    if (!assignment || !periods.sessionId || !periods.termId) {
      setClassLoading(false);
      return;
    }
    let cancelled = false;
    setClassLoading(true);
    void resultsRepository.getClassResults(assignment.classId, { sessionId: periods.sessionId, termId: periods.termId })
      .then((result) => { if (!cancelled) setClassData(result); })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Class results could not be loaded.";
        setClassError(message);
        toast(message, "error");
      })
      .finally(() => { if (!cancelled) setClassLoading(false); });
    return () => { cancelled = true; };
  }, [assignment, periods.sessionId, periods.termId, toast]);

  const submit = async (mode: "draft" | "submit") => {
    if (!assignment || !periods.sessionId || !periods.termId || !classData?.students.length) return;
    setSaving(true);
    try {
      // Read the latest scores before merging edits so assignment grades and other
      // assessment components saved elsewhere are preserved.
      const latest = await resultsRepository.getClassResults(assignment.classId, {
        sessionId: periods.sessionId,
        termId: periods.termId,
      });
      const entries = buildScoreEntries(latest.students, assignment.subjectId, scores, components, mode);
      if (!entries.length) {
        toast("Enter at least one score to save.", "warning");
        return;
      }
      await resultsRepository.saveScores(mode, {
        sessionId: periods.sessionId,
        termId: periods.termId,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        scores: entries,
      });
      try {
        const updated = await resultsRepository.getClassResults(assignment.classId, {
          sessionId: periods.sessionId,
          termId: periods.termId,
        });
        setClassData(updated);
        setScores({});
      } catch {
        toast("Scores were saved, but the latest results could not be reloaded. Refresh the page to see them.", "warning");
        return;
      }
      toast(mode === "submit" ? "Scores submitted for review." : "Draft scores saved.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Scores could not be saved.", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveTeacherRemarks = async (studentIds: string[], teacherComment: string) => {
    if (!assignment || !periods.sessionId || !periods.termId || !classData?.students.length) return;
    const targets = classData.students
      .filter((student) => studentIds.includes(student.id))
      .map((student) => firstResult(student))
      .filter((result): result is StudentResult => Boolean(result));
    if (!targets.length) {
      toast("Save scores first before adding teacher remarks.", "error");
      return;
    }
    await Promise.all(targets.map((result) => resultsRepository.updateStatus(result.id, { teacherComment })));
    const updated = await resultsRepository.getClassResults(assignment.classId, { sessionId: periods.sessionId, termId: periods.termId });
    setClassData(updated);
    toast("Teacher remarks saved.", "success");
  };

  return <>
    <PageHeader title="Results" description="Enter scores only for assigned classes and subjects." />
    <Card className="mb-5 p-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <PeriodFilters periods={periods} />
        <Select label="Assignment" value={assignmentId} onChange={setAssignmentId} placeholder={busy || academicsLoading ? "Loading assignments..." : "Select class and subject"} options={assignments.map((item) => ({ value: item.id, label: `${className(item.class)} · ${item.subject.name}` }))} />
      </div>
    </Card>
    {!assignments.length && !busy && !academicsLoading ? <EmptyState title="No assigned subjects" description="Ask the school admin to assign this teacher to the class subjects they should grade." /> : <SectionCard title="Score entry" description={assignment ? `${className(assignment.class)} · ${assignment.subject.name}` : "No assignment selected"} action={<Button variant="outline" disabled={!assignment || !classData?.students.length} onClick={() => setRemarkOpen(true)}>Teacher remarks</Button>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase text-muted">
            <tr><th className="px-4 py-3">Student</th>{components.map((item) => <th key={item.name} className="px-4 py-3">{item.name} / {item.weight}</th>)}<th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y">
            {classData?.students.map((student) => {
              const existing = firstResult(student)?.subjectScores.find((score) => score.subjectId === assignment?.subjectId);
              const row = { ...(existing?.components ?? {}), ...(scores[student.id] ?? {}) };
              const total = components.reduce((sum, item) => sum + Number(row[item.name] || 0), 0);
              const locked = existing?.locked || existing?.status === "PUBLISHED" || firstResult(student)?.locked;
              return <tr key={student.id}><td className="px-4 py-3 font-semibold"><PersonNameLink kind="student" id={student.id}>{nameOf(student)}</PersonNameLink></td>{components.map((item) => <td key={item.name} className="px-4 py-3"><Input disabled={locked || saving} type="number" min={0} max={item.weight} value={row[item.name] ?? ""} onChange={(event) => setScores((current) => ({ ...current, [student.id]: { ...current[student.id], [item.name]: event.target.value } }))} /></td>)}<td className="px-4 py-3 font-bold">{total}</td><td className="px-4 py-3"><Badge tone={locked ? "success" : statusTone(existing?.status ?? "DRAFT")}>{locked ? "LOCKED" : existing?.status ?? "DRAFT"}</Badge></td></tr>;
            })}
          </tbody>
        </table>
        {!classData?.students.length && <p role={classError ? "alert" : undefined} className="p-8 text-center text-sm text-muted">{classLoading ? "Loading students..." : classError || (assignment ? "No students enrolled in this class for the selected session." : "Select an assignment to start grading.")}</p>}
      </div>
      <p className="px-4 py-3 text-sm text-muted">Enter any available scores and save a draft. Blank cells remain ungraded. Submit completed scores for review when they are ready.</p>
      <div className="flex justify-end gap-2 border-t p-4"><Button variant="outline" disabled={saving || !assignment || !classData?.students.length || !Object.keys(scores).length} onClick={() => void submit("draft")}>{saving ? "Saving..." : "Save draft"}</Button><Button disabled={saving || !assignment || !classData?.students.length || (!Object.keys(scores).length && !hasCompleteDraftScores)} onClick={() => void submit("submit")}>Submit for review</Button></div>
    </SectionCard>}
    {assignment && isClassTeacher && <PromotionReview assignment={assignment} periods={periods} settings={settings} academics={academics} />}
    <RemarksModal open={remarkOpen} title="Teacher remarks" label="Teacher remark" students={classData?.students ?? []} onClose={() => setRemarkOpen(false)} onSave={saveTeacherRemarks} />
  </>;
}

type PromotionAction = "PROMOTE" | "REPEAT";
type PromotionReviewRow = { student: ResultStudentRow; average?: number; recommendation?: PromotionAction; resultCount: number };

function PromotionReview({ assignment, periods, settings, academics }: {
  assignment: TeacherResultAssignment;
  periods: ReturnType<typeof usePeriods>;
  settings?: ResultSettings;
  academics: AcademicsState;
}) {
  const { toast } = useActionFeedback();
  const { moveStudentToClass } = useAcademics();
  const [rows, setRows] = useState<PromotionReviewRow[]>([]);
  const [targetClasses, setTargetClasses] = useState<SchoolClass[]>([]);
  const [decisions, setDecisions] = useState<Record<string, { action: PromotionAction; classId: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const currentClass = getClassById(academics, assignment.classId);
  const nextSession = useMemo(() => {
    const ordered = [...periods.sessions].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const currentIndex = ordered.findIndex((item) => item.id === periods.sessionId);
    return currentIndex >= 0 ? ordered[currentIndex + 1] : undefined;
  }, [periods.sessions, periods.sessionId]);

  useEffect(() => {
    let cancelled = false;
    setRows([]);
    setTargetClasses([]);
    setDecisions({});
    if (!periods.sessionId || !assignment.classId) return;
    setLoading(true);
    void Promise.all([
      resultsRepository.getClassResults(assignment.classId, { sessionId: periods.sessionId }),
      academicsRepository.getState(),
    ]).then(([data, state]) => {
      if (cancelled) return;
      const mapped = data.students.map((student): PromotionReviewRow => {
        const finalized = student.results.filter((result) => result.status === "APPROVED" || result.status === "PUBLISHED");
        const average = finalized.length ? finalized.reduce((sum, result) => sum + result.average, 0) / finalized.length : undefined;
        return { student, average, resultCount: finalized.length, recommendation: average === undefined || settings === undefined ? undefined : average >= settings.passMark ? "PROMOTE" : "REPEAT" };
      });
      const candidates = nextSession ? state.classes.filter((item) => item.status === "ACTIVE" && item.schoolId === currentClass?.schoolId && (item.academicSessionId === nextSession.id || (!item.academicSessionId && item.academicYear === nextSession.name))) : [];
      setRows(mapped);
      setTargetClasses(candidates);
      setDecisions(Object.fromEntries(mapped.map((row) => {
        const action = row.recommendation ?? "PROMOTE";
        const destination = promotionDestination(currentClass, candidates, action);
        return [row.student.id, { action, classId: destination?.id ?? "" }];
      })));
    }).catch((error) => {
      if (!cancelled) toast(error instanceof Error ? error.message : "Promotion recommendations could not be loaded.", "error");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [assignment.classId, currentClass?.schoolId, nextSession, periods.sessionId, settings?.passMark, toast]);

  const save = async () => {
    if (!nextSession) return;
    const pending = rows.filter((row) => row.recommendation && decisions[row.student.id]?.classId);
    if (!pending.length) { toast("Choose a destination class for at least one student with finalized results.", "error"); return; }
    setSaving(true);
    try {
      for (const row of pending) {
        const decision = decisions[row.student.id];
        await moveStudentToClass({
          studentId: row.student.id,
          classId: decision.classId,
          academicSessionId: nextSession.id,
          effectiveDate: nextSession.startDate,
          reason: `Class teacher ${decision.action.toLowerCase()} decision based on ${periods.sessions.find((item) => item.id === periods.sessionId)?.name ?? "session"} results (${row.average?.toFixed(1)}% average; pass mark ${settings?.passMark}%).`,
        });
      }
      toast(`Saved ${pending.length} student placement decision(s) for ${nextSession.name}.`, "success");
      setRows((current) => current.filter((row) => !pending.some((item) => item.student.id === row.student.id)));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Some placement decisions could not be saved.", "error");
    } finally { setSaving(false); }
  };

  const updateDecision = (studentId: string, patch: Partial<{ action: PromotionAction; classId: string }>) => setDecisions((current) => ({ ...current, [studentId]: { ...current[studentId], ...patch } }));
  return <SectionCard title="Promotion review" description="Review school pass mark recommendations, then confirm or change each student’s next-session placement." action={settings ? <Badge tone="neutral">Pass mark: {settings.passMark}%</Badge> : undefined}>
    {!settings && <p className="p-4 text-sm text-muted">Grading settings are still loading, so recommendations are unavailable.</p>}
    {settings && !nextSession && <p className="p-4 text-sm text-muted">Create the next academic session before recording promotion decisions.</p>}
    {settings && nextSession && <>
      <div className="border-b bg-surface-muted/40 px-4 py-3 text-sm text-muted">Recommendations use the average of approved or published results in this session. The class teacher makes the final decision.</div>
      {!targetClasses.length && !loading && <p className="p-4 text-sm text-muted">There are no active classes set up for {nextSession.name}. Create next-session classes before confirming placements.</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Session average</th><th className="px-4 py-3">Recommendation</th><th className="px-4 py-3">Teacher decision</th><th className="px-4 py-3">Next-session class</th></tr></thead><tbody className="divide-y">{rows.map(({ student, average, recommendation, resultCount }) => {
        const decision = decisions[student.id] ?? { action: recommendation ?? "PROMOTE", classId: "" };
        return <tr key={student.id}><td className="px-4 py-3"><p className="font-semibold"><PersonNameLink kind="student" id={student.id}>{nameOf(student)}</PersonNameLink></p><p className="text-xs text-muted">{student.admissionNumber}</p></td><td className="px-4 py-3">{average === undefined ? <span className="text-muted">No finalized result</span> : `${average.toFixed(1)}% (${resultCount} term${resultCount === 1 ? "" : "s"})`}</td><td className="px-4 py-3">{recommendation ? <Badge tone={recommendation === "PROMOTE" ? "success" : "warning"}>{recommendation === "PROMOTE" ? "Promote" : "Repeat"}</Badge> : <Badge>Pending results</Badge>}</td><td className="px-4 py-3"><Select label="Decision" disabled={!recommendation || saving} value={decision.action} onChange={(value) => updateDecision(student.id, { action: value as PromotionAction, classId: promotionDestination(currentClass, targetClasses, value as PromotionAction)?.id ?? "" })} options={[{ value: "PROMOTE", label: "Promote" }, { value: "REPEAT", label: "Repeat" }]} /></td><td className="px-4 py-3"><Select label="Next class" disabled={!recommendation || saving} value={decision.classId} onChange={(classId) => updateDecision(student.id, { classId })} placeholder="Select class" options={targetClasses.map((item) => ({ value: item.id, label: item.displayName || item.name || item.baseName }))} /></td></tr>;
      })}</tbody></table>{loading && <p className="p-8 text-center text-sm text-muted">Loading finalized results and next-session classes…</p>}{!loading && !rows.length && <p className="p-8 text-center text-sm text-muted">No students were found for this class in the selected session.</p>}</div>
      <div className="flex justify-end border-t p-4"><Button disabled={saving || !rows.some((row) => row.recommendation && decisions[row.student.id]?.classId)} onClick={() => void save()}>{saving ? "Saving decisions…" : `Save placements for ${nextSession.name}`}</Button></div>
    </>}
  </SectionCard>;
}

function promotionDestination(current: SchoolClass | undefined, candidates: SchoolClass[], action: PromotionAction) {
  if (!current) return undefined;
  const sameGrade = candidates.find((item) => item.baseName === current.baseName && (item.section ?? item.arm ?? "") === (current.section ?? current.arm ?? ""));
  if (action === "REPEAT") return sameGrade ?? candidates.find((item) => item.sortOrder === current.sortOrder);
  return candidates.filter((item) => item.sortOrder > current.sortOrder).sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? sameGrade;
}

function mergeTeacherResultAssignments(primary: TeacherResultAssignment[], fallback: TeacherResultAssignment[]) {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((item) => {
    const key = `${item.classId}:${item.subjectId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function usePeriods() {
  return useAcademicPeriod();
}

function PeriodFilters({ periods }: { periods: ReturnType<typeof usePeriods> }) {
  return <div className="grid gap-3 sm:grid-cols-2"><Select label="Academic session" value={periods.sessionId} onChange={periods.setSessionId} placeholder="Select session" options={periods.sessions.map((item) => ({ value: item.id, label: item.name, description: item.status }))} /><Select label="Term" value={periods.termId} onChange={periods.setTermId} placeholder="Select term" options={periods.terms.map((item) => ({ value: item.id, label: academicTermLabel(item.name), description: item.status }))} /></div>;
}

export function AdminResultsScreen() {
  const periods = usePeriods();
  const { toast } = useActionFeedback();
  const [classes, setClasses] = useState<Array<{ id: string; name: string; section?: string; studentCount: number; subjectCount: number; resultCount: number; publishedCount: number; average: number }>>([]);
  const [settings, setSettings] = useState<ResultSettings>();
  const [busy, setBusy] = useState(false);
  const load = () => {
    if (!periods.sessionId || !periods.termId) return;
    setBusy(true);
    Promise.all([resultsRepository.getAdminClasses({ sessionId: periods.sessionId, termId: periods.termId }), resultsRepository.getSettings()])
      .then(([items, config]) => { setClasses(items); setSettings(config); })
      .catch((error) => toast(error instanceof Error ? error.message : "Results could not be loaded.", "error"))
      .finally(() => setBusy(false));
  };
  useEffect(load, [periods.sessionId, periods.termId]);
  const saveSettings = async () => {
    if (!settings) return;
    try {
      await resultsRepository.saveSettings(settings);
      toast("Grading settings saved.", "success");
      load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Grading settings could not be saved.", "error");
    }
  };
  return <>
    <PageHeader title="Results" description="Review, approve, publish, lock and print student results." />
    <Card className="mb-5 p-4"><PeriodFilters periods={periods} /></Card>
    {settings && <ResultSettingsPanel settings={settings} onChange={setSettings} onSave={saveSettings} />}
    <SectionCard title="Classes" description={busy ? "Loading..." : `${classes.length} class result(s)`}>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Class", "Students", "Subjects", "Results", "Published", "Average", "Action"].map((item) => <th key={item} className="px-5 py-3">{item}</th>)}</tr></thead><tbody className="divide-y">{classes.map((item) => <ClickableTableRow key={item.id} href={`/admin/results/${item.id}?sessionId=${periods.sessionId}&termId=${periods.termId}`} label={className(item)}><td className="px-5 py-4 font-semibold">{className(item)}</td><td className="px-5 py-4">{item.studentCount}</td><td className="px-5 py-4">{item.subjectCount}</td><td className="px-5 py-4">{item.resultCount}</td><td className="px-5 py-4">{item.publishedCount}</td><td className="px-5 py-4">{item.average}%</td><td className="px-5 py-4"><Link className="font-semibold text-[var(--school-primary)]" href={`/admin/results/${item.id}?sessionId=${periods.sessionId}&termId=${periods.termId}`}><Eye size={14} className="inline" /> View class</Link></td></ClickableTableRow>)}</tbody></table>{!classes.length && <p className="p-8 text-center text-sm text-muted">No classes available for these filters.</p>}</div>
    </SectionCard>
  </>;
}

function ResultSettingsPanel({ settings, onChange, onSave }: { settings: ResultSettings; onChange(settings: ResultSettings): void; onSave(): void }) {
  const updateComponent = (index: number, patch: Partial<AssessmentComponent>) => onChange({ ...settings, components: settings.components.map((item, idx) => idx === index ? { ...item, ...patch } : item) });
  const updateBand = (index: number, patch: Partial<GradeBand>) => onChange({ ...settings, gradeBands: settings.gradeBands.map((item, idx) => idx === index ? { ...item, ...patch } : item) });
  const totalWeight = settings.components.filter((item) => item.isActive !== false).reduce((sum, item) => sum + Number(item.weight || 0), 0);
  return <Card className="mb-5 p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Grading system</h2><Button onClick={onSave}><Save size={16} />Save settings</Button></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">Assessment components</p><Badge tone={totalWeight === 100 ? "success" : "warning"}>{totalWeight}%</Badge></div><div className="space-y-2">{settings.components.map((item, index) => <div key={`${item.name}-${index}`} className="grid grid-cols-[minmax(0,1fr)_90px_80px] gap-2"><Input value={item.name} onChange={(event) => updateComponent(index, { name: event.target.value })} /><Input type="number" value={item.weight} onChange={(event) => updateComponent(index, { weight: Number(event.target.value) })} /><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={item.isActive !== false} onChange={(event) => updateComponent(index, { isActive: event.target.checked })} />Active</label></div>)}</div></div><div><p className="mb-2 text-sm font-semibold">Grade bands</p><div className="space-y-2">{settings.gradeBands.map((item, index) => <div key={`${item.grade}-${index}`} className="grid grid-cols-[70px_75px_75px_minmax(0,1fr)] gap-2"><Input value={item.grade} onChange={(event) => updateBand(index, { grade: event.target.value })} /><Input type="number" value={item.minScore} onChange={(event) => updateBand(index, { minScore: Number(event.target.value) })} /><Input type="number" value={item.maxScore} onChange={(event) => updateBand(index, { maxScore: Number(event.target.value) })} /><Input value={item.remark} onChange={(event) => updateBand(index, { remark: event.target.value })} /></div>)}</div></div></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-sm font-medium">Pass mark<Input className="mt-2" type="number" value={settings.passMark} onChange={(event) => onChange({ ...settings, passMark: Number(event.target.value) })} /></label><label className="mt-7 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={settings.positionEnabled} onChange={(event) => onChange({ ...settings, positionEnabled: event.target.checked })} />Enable class position</label><label className="text-sm font-medium">Promotion rule<Input className="mt-2" value={settings.promotionRule ?? ""} onChange={(event) => onChange({ ...settings, promotionRule: event.target.value })} /></label></div></Card>;
}

export function AdminClassResultsScreen({ classId, sessionId, termId }: { classId: string; sessionId?: string; termId?: string }) {
  const { toast } = useActionFeedback();
  const [data, setData] = useState<{ class: { id: string; name: string; section?: string }; students: ResultStudentRow[]; subjects: Array<{ id: string; name: string }> }>();
  const [principalRemarkOpen, setPrincipalRemarkOpen] = useState(false);
  const load = () => resultsRepository.getClassResults(classId, { sessionId, termId }).then(setData).catch((error) => toast(error instanceof Error ? error.message : "Class results could not be loaded.", "error"));
  useEffect(() => { void load(); }, [classId, sessionId, termId]);
  const update = async (resultId: string, input: { status?: ResultStatus; locked?: boolean; teacherComment?: string; principalComment?: string }) => { await resultsRepository.updateStatus(resultId, input); toast("Result updated.", "success"); load(); };
  const savePrincipalRemarks = async (studentIds: string[], principalComment: string) => {
    if (!data?.students.length) return;
    const targets = data.students
      .filter((student) => studentIds.includes(student.id))
      .map((student) => firstResult(student))
      .filter((result): result is StudentResult => Boolean(result));
    if (!targets.length) {
      toast("No result records were found for the selected students.", "error");
      return;
    }
    await Promise.all(targets.map((result) => resultsRepository.updateStatus(result.id, { principalComment })));
    toast("Principal remarks saved.", "success");
    await load();
  };
  return <>
    <PageHeader title={data ? `${className(data.class)} Results` : "Class Results"} description="Students, subject scores, averages and publication status." backFallback="/admin/results" action={<div className="flex gap-2 print:hidden"><Button variant="outline" onClick={() => window.print()}><Printer size={16} />Print</Button><Button variant="outline" onClick={() => window.print()}><Download size={16} />Download</Button></div>} />
    <SectionCard title="Students" action={<Button variant="outline" disabled={!data?.students.some((student) => firstResult(student))} onClick={() => setPrincipalRemarkOpen(true)}>Principal remarks</Button>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase text-muted">
            <tr>{["Student", "Subjects", "Total", "Average", "Grade", "Position", "Status", "Actions"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {data?.students.map((student) => {
              const result = firstResult(student);
              return <ClickableTableRow key={student.id} href={result ? `/admin/results/${classId}/students/${student.id}?sessionId=${sessionId ?? ""}&termId=${termId ?? ""}` : undefined} label={nameOf(student)}><td className="px-4 py-3"><p className="font-semibold"><PersonNameLink kind="student" id={student.id}>{nameOf(student)}</PersonNameLink></p><p className="text-xs text-muted">{student.admissionNumber}</p></td><td className="px-4 py-3">{result?.subjectScores.length ?? 0}/{data.subjects.length}</td><td className="px-4 py-3">{result?.total ?? 0}</td><td className="px-4 py-3">{result?.average ?? 0}%</td><td className="px-4 py-3">{result?.grade ?? "N/A"}</td><td className="px-4 py-3">{result?.position ?? "N/A"}</td><td className="px-4 py-3">{result ? <Badge tone={statusTone(result.status)}>{result.locked ? "LOCKED" : result.status}</Badge> : <Badge>NO RESULT</Badge>}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2">{result && <Link className={buttonStyles("outline")} href={`/admin/results/${classId}/students/${student.id}?sessionId=${sessionId ?? ""}&termId=${termId ?? ""}`}>Open</Link>}{result && result.status === "SUBMITTED" && <Button variant="outline" onClick={() => void update(result.id, { status: "APPROVED" })}>Approve</Button>}{result && result.status !== "PUBLISHED" && <Button variant="outline" onClick={() => void update(result.id, { status: "PUBLISHED", locked: true })}>Publish</Button>}{result && result.status === "PUBLISHED" && <Button variant="outline" onClick={() => void update(result.id, { status: "APPROVED", locked: false })}>Unpublish</Button>}{result && <Button variant="ghost" onClick={() => void update(result.id, { locked: !result.locked })}>{result.locked ? <Unlock size={15} /> : <Lock size={15} />}</Button>}</div></td></ClickableTableRow>;
            })}
          </tbody>
        </table>
        {!data?.students.length && <p className="p-8 text-center text-sm text-muted">No active students in this class.</p>}
      </div>
    </SectionCard>
    <RemarksModal open={principalRemarkOpen} title="Principal remarks" label="Principal remark" students={data?.students ?? []} onClose={() => setPrincipalRemarkOpen(false)} onSave={savePrincipalRemarks} />
  </>;
}

function RemarksModal({ open, title, label, students, onClose, onSave }: { open: boolean; title: string; label: string; students: ResultStudentRow[]; onClose(): void; onSave(studentIds: string[], remark: string): Promise<void> }) {
  const [remark, setRemark] = useState("");
  const [applyAll, setApplyAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRemark("");
    setApplyAll(true);
    setSelectedIds(students.map((student) => student.id));
  }, [open, students]);

  if (!open) return null;
  const targetIds = applyAll ? students.map((student) => student.id) : selectedIds;
  const canSave = targetIds.length > 0;
  const toggleStudent = (studentId: string, checked: boolean) => {
    setSelectedIds((current) => checked ? Array.from(new Set([...current, studentId])) : current.filter((id) => id !== studentId));
  };
  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(targetIds, remark);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return <SidePanel open title={title} description="Apply this remark to the whole class or only selected students." onClose={onClose} maxWidth="lg">
      <div className="space-y-4 p-5">
        <label className="block text-sm font-medium">
          {label}
          <textarea className="mt-2 min-h-28 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-[var(--school-primary)] focus:ring-2 focus:ring-[var(--school-primary)]/20" value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Type the remark here" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={applyAll} onChange={(event) => setApplyAll(event.target.checked)} />
          Use for all students in this class
        </label>
        {!applyAll && <div className="max-h-60 overflow-auto rounded-lg border">
          {students.map((student) => <label key={student.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-b-0">
            <span><span className="font-semibold"><PersonNameLink kind="student" id={student.id}>{nameOf(student)}</PersonNameLink></span><span className="ml-2 text-xs text-muted">{student.admissionNumber}</span></span>
            <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={(event) => toggleStudent(student.id, event.target.checked)} />
          </label>)}
          {!students.length && <p className="p-4 text-center text-sm text-muted">No students available.</p>}
        </div>}
      </div>
      <div className="flex justify-end gap-2 border-t p-4">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={() => void save()} disabled={!canSave || saving}>{saving ? "Saving..." : "Save remarks"}</Button>
      </div>
  </SidePanel>;
}

export function ReportCardScreen({ studentId, sessionId, termId }: { studentId?: string; sessionId?: string; termId?: string }) {
  const { toast } = useActionFeedback();
  const period = useAcademicPeriod();
  const [results, setResults] = useState<FamilyResult[]>([]);
  const resolvedSessionId = sessionId ?? period.sessionId;
  const resolvedTermId = termId ?? period.termId;
  useEffect(() => {
    if (!resolvedSessionId || !resolvedTermId) { setResults([]); return; }
    const load = studentId ? resultsRepository.getStudentResults(studentId, { sessionId: resolvedSessionId, termId: resolvedTermId }) : resultsRepository.getMine({ sessionId: resolvedSessionId, termId: resolvedTermId });
    load.then(setResults).catch((error) => toast(error instanceof Error ? error.message : "Results could not be loaded.", "error"));
  }, [studentId, resolvedSessionId, resolvedTermId, toast]);
  return <ReportCards results={results} title="Report Card" showTeacherComment={!studentId} />;
}

export function ParentResultsScreen() {
  const { toast } = useActionFeedback();
  const period = useAcademicPeriod();
  const { state: academics } = useAcademics();
  const [results, setResults] = useState<FamilyResult[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const children = useMemo(() => parentChildrenFromAcademics(academics), [academics]);
  useEffect(() => {
    setSelectedChildId((current) => current && children.some((child) => child.id === current) ? current : children[0]?.id ?? "");
  }, [children]);
  useEffect(() => { if (!period.sessionId || !period.termId) { setResults([]); return; } void resultsRepository.getChildren({ sessionId: period.sessionId, termId: period.termId }).then(setResults).catch((error) => toast(error instanceof Error ? error.message : "Results could not be loaded.", "error")); }, [period.sessionId, period.termId, toast]);
  const visible = selectedChildId ? results.filter((result) => result.studentId === selectedChildId) : results;
  return <ReportCards results={visible} title="Children Results" controls={<Card className="mb-5 p-4">
      <Select label="Child" value={selectedChildId} onChange={setSelectedChildId} placeholder="Select child" options={children.map((child) => ({ value: child.id, label: studentLabel(child) }))} />
    </Card>} />;
}

function ScoreChips({ components }: { components: Record<string, number> }) {
  return <div className="flex flex-wrap gap-1.5">{Object.entries(components).map(([key, value]) => <span key={key} className="rounded-md border bg-surface px-2 py-1 text-xs"><span className="text-muted">{key}</span>: <b className="text-[var(--school-primary)]">{value}</b></span>)}</div>;
}

function ScoreProgressCard({ result }: { result: ScoreProgress }) {
  return <Card className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold"><PersonNameLink kind="student" id={result.student?.id}>{nameOf(result.student)}</PersonNameLink></h2>
        <p className="text-sm text-muted">{result.student?.admissionNumber} · {className(result.class)}</p>
      </div>
      <Badge tone="warning">SCORES SO FAR</Badge>
    </div>
    <p className="mt-3 text-sm text-muted">Saved assessment scores appear here as teachers record them. The final report card follows publication.</p>
    <div className="mt-5 space-y-3">
      {result.subjectScores.filter((score) => Object.keys(score.components).length > 0).map((score) => <div key={score.id} className="rounded-lg border p-3">
        <p className="mb-2 font-semibold">{score.subject?.name ?? "Subject"}</p>
        <ScoreChips components={score.components} />
      </div>)}
    </div>
  </Card>;
}

function ReportCards({ title, results, showTeacherComment = true, controls }: { title: string; results: FamilyResult[]; showTeacherComment?: boolean; controls?: React.ReactNode }) {
  const progress = results.filter((result): result is ScoreProgress => result.status === "IN_PROGRESS");
  const published = results.filter((result): result is StudentResult => result.status !== "IN_PROGRESS");
  return <><PageHeader title={title} description="Saved assessment scores and published report cards." action={<Button variant="outline" onClick={() => window.print()}><Printer size={16} />Print</Button>} />{controls}<div className="grid gap-5">{progress.map((result) => <ScoreProgressCard key={result.id} result={result} />)}{published.map((result) => <Card key={result.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold"><PersonNameLink kind="student" id={result.student?.id}>{nameOf(result.student)}</PersonNameLink></h2><p className="text-sm text-muted">{result.student?.admissionNumber} · {className(result.class)}</p></div><Badge tone={statusTone(result.status)}>{result.status}</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-5">{[["Total", result.total], ["Average", `${result.average}%`], ["Grade", result.grade ?? "N/A"], ["Position", result.position ?? "N/A"], ["Attendance", `${result.attendanceSummary?.present ?? 0}/${result.attendanceSummary?.total ?? 0}`]].map(([label, value]) => <div key={label} className="rounded-lg border p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 font-bold">{value}</p></div>)}</div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Scores</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Remark</th><th className="px-4 py-3">Class avg.</th></tr></thead><tbody className="divide-y">{result.subjectScores.map((score) => <tr key={score.id}><td className="px-4 py-3 font-semibold">{score.subject?.name}</td><td className="px-4 py-3"><ScoreChips components={score.components} /></td><td className="px-4 py-3">{score.total}</td><td className="px-4 py-3">{score.grade}</td><td className="px-4 py-3">{score.remark}</td><td className="px-4 py-3">{result.average}%</td></tr>)}</tbody></table></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{showTeacherComment && <Info label="Teacher comment" value={result.teacherComment ?? "Not provided"} />}<Info label="Principal comment" value={result.principalComment ?? "Not provided"} /></div></Card>)}{!results.length && <Card className="p-8 text-center text-sm text-muted">No scores have been recorded for this term yet.</Card>}</div></>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function LegacyTeacherResultsScreen() {
  const periods = usePeriods();
  const { toast } = useActionFeedback();
  const [settings, setSettings] = useState<ResultSettings>();
  const [assignments, setAssignments] = useState<TeacherResultAssignment[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [classData, setClassData] = useState<{ students: ResultStudentRow[] }>();
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const assignment = assignments.find((item) => item.id === assignmentId);
  useEffect(() => { void Promise.all([resultsRepository.getSettings(), resultsRepository.getTeacherAssignments()]).then(([config, rows]) => { setSettings(config); setAssignments(rows); setAssignmentId((current) => current || rows[0]?.id || ""); }).catch((error) => toast(error instanceof Error ? error.message : "Results setup could not be loaded.", "error")); }, []);
  useEffect(() => { if (!assignment || !periods.sessionId || !periods.termId) return; void resultsRepository.getClassResults(assignment.classId, { sessionId: periods.sessionId, termId: periods.termId }).then(setClassData).catch((error) => toast(error instanceof Error ? error.message : "Class results could not be loaded.", "error")); }, [assignmentId, periods.sessionId, periods.termId]);
  const components = settings?.components.filter((item) => item.isActive !== false) ?? [];
  const submit = async (mode: "draft" | "submit") => {
    if (!assignment || !periods.sessionId || !periods.termId) return;
    await resultsRepository.saveScores(mode, { sessionId: periods.sessionId, termId: periods.termId, classId: assignment.classId, subjectId: assignment.subjectId, scores: (classData?.students ?? []).map((student) => ({ studentId: student.id, components: scores[student.id] ?? {} })) });
    toast(mode === "submit" ? "Scores submitted for review." : "Draft scores saved.", "success");
  };
  return <><PageHeader title="Results" description="Enter scores only for assigned classes and subjects." /><Card className="mb-5 p-4"><div className="grid gap-3 lg:grid-cols-3"><PeriodFilters periods={periods} /><Select label="Assignment" value={assignmentId} onChange={setAssignmentId} placeholder="Select class and subject" options={assignments.map((item) => ({ value: item.id, label: `${className(item.class)} · ${item.subject.name}` }))} /></div></Card><SectionCard title="Score entry" description={assignment ? `${className(assignment.class)} · ${assignment.subject.name}` : "No assignment selected"}><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr><th className="px-4 py-3">Student</th>{components.map((item) => <th key={item.name} className="px-4 py-3">{item.name} / {item.weight}</th>)}<th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{classData?.students.map((student) => { const existing = firstResult(student)?.subjectScores.find((score) => score.subjectId === assignment?.subjectId); const row = scores[student.id] ?? existing?.components ?? {}; const total = components.reduce((sum, item) => sum + Number(row[item.name] ?? 0), 0); const locked = existing?.locked || existing?.status === "PUBLISHED"; return <tr key={student.id}><td className="px-4 py-3 font-semibold"><PersonNameLink kind="student" id={student.id}>{nameOf(student)}</PersonNameLink></td>{components.map((item) => <td key={item.name} className="px-4 py-3"><Input disabled={locked} type="number" min={0} max={item.weight} value={row[item.name] ?? ""} onChange={(event) => setScores((current) => ({ ...current, [student.id]: { ...row, [item.name]: Number(event.target.value) } }))} /></td>)}<td className="px-4 py-3 font-bold">{total}</td><td className="px-4 py-3"><Badge tone={locked ? "success" : statusTone(existing?.status ?? "DRAFT")}>{locked ? "LOCKED" : existing?.status ?? "DRAFT"}</Badge></td></tr>; })}</tbody></table>{!classData?.students.length && <p className="p-8 text-center text-sm text-muted">No students available for this assignment.</p>}</div><div className="flex justify-end gap-2 border-t p-4"><Button variant="outline" onClick={() => void submit("draft")}>Save draft</Button><Button onClick={() => void submit("submit")}>Submit for review</Button></div></SectionCard></>;
}
