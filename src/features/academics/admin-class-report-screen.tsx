"use client";

import Link from "@/features/navigation-progress/navigation-progress-link";
import { ArrowRightLeft, Download, Pencil, Printer, TrendingDown, TrendingUp, Users, X } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademics } from "@/features/academics/academics-context";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { PersonNameLink } from "@/features/people/person-name-link";
import { academicTermLabel } from "@/features/academic-period/academic-period.types";
import { useAssignments } from "@/features/assignments/assignments-context";
import { filterAssignmentsByPeriod } from "@/features/assignments/assignments-period-utils";
import { useAttendance } from "@/features/attendance/attendance-context";
import { getAttendanceSummaryForStudent } from "@/features/attendance/attendance.utils";
import { useFinance } from "@/features/finance/finance-context";
import { billableInvoices, selectFinanceView, summarizeFinanceState } from "@/features/finance/finance-scope";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { formatNaira } from "@/lib/currency";
import { cn } from "@/lib/utils";

const subjectNames: Record<string, string> = {
  "subject-mathematics": "Mathematics",
  "subject-english": "English Language",
  "subject-literature": "Literature",
  "subject-basic-science": "Basic Science",
};

const percent = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0;
const scoreTone = (value: number) => value >= 70 ? "success" as const : value >= 50 ? "warning" as const : "danger" as const;

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <Card className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></Card>;
}

export function AdminClassReportScreen({ classId }: { classId: string }) {
  const { state: academics } = useAcademics();
  const { setClassOwners } = useAcademics();
  const { toast } = useActionFeedback();
  const [changeOpen, setChangeOpen] = useState(false);
  const [ownerType, setOwnerType] = useState<"MAIN" | "CO">("MAIN");
  const [coOwnerToReplace, setCoOwnerToReplace] = useState("");
  const [addingCoOwner, setAddingCoOwner] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [savingOwners, setSavingOwners] = useState(false);
  const { state: assignments } = useAssignments();
  const { sessionRegisters } = useAttendance();
  const { allState: finance } = useFinance();
  const { settings } = useSchoolSettings();
  const { selectedSession, selectedTerm, scope } = useAcademicPeriod();
  const schoolClass = academics.classes.find((item) => item.id === classId);

  if (!schoolClass) {
    return <><PageHeader title="Class not found" description="This class may have been removed or archived." showBack backFallback="/admin/academics/classes" /><Card className="p-8 text-center text-sm text-muted">Return to Classes and choose another record.</Card></>;
  }

  const students = academics.students.filter((student) => student.classId === classId);
  const periodSessionName = selectedSession?.name || settings.currentAcademicSession;
  const periodTermLabel = selectedTerm ? academicTermLabel(selectedTerm.name) : settings.currentTerm;
  const classRegisters = sessionRegisters.filter((register) => register.classId === classId && register.status !== "DRAFT");
  const attendanceEntries = classRegisters.flatMap((register) => register.entries);
  const sessionPeriod = { academicSessionId: selectedSession?.id, startDate: selectedSession?.startDate, endDate: selectedSession?.endDate, isCurrentPeriod: scope.isCurrentPeriod };
  const attendanceRate = students.length
    ? Math.round(students.reduce((sum, student) => sum + getAttendanceSummaryForStudent(sessionRegisters, student.id, { ...sessionPeriod, studentStartDate: student.admissionDate }).percentage, 0) / students.length)
    : 0;
  const presentCount = attendanceEntries.filter((entry) => entry.status === "PRESENT").length;
  const absentCount = students.reduce((count, student) => count + getAttendanceSummaryForStudent(sessionRegisters, student.id, { ...sessionPeriod, studentStartDate: student.admissionDate }).absent, 0);
  const lateCount = attendanceEntries.filter((entry) => entry.status === "LATE").length;
  const excusedCount = attendanceEntries.filter((entry) => entry.status === "EXCUSED").length;
  const classAssignments = filterAssignmentsByPeriod(assignments.assignments, {
    sessionId: selectedSession?.id,
    termId: selectedTerm?.id,
    startDate: selectedTerm?.startDate || settings.resumptionDate,
    endDate: selectedTerm?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedTerm),
  }).filter((item) => item.classId === classId);
  const assignmentIds = new Set(classAssignments.map((item) => item.id));
  const submissions = assignments.submissions.filter((item) => assignmentIds.has(item.assignmentId) && students.some((student) => student.id === item.studentId));
  const submitted = submissions.filter((item) => item.status !== "NOT_SUBMITTED");
  const graded = submissions.filter((item) => typeof item.score === "number");
  const averageScore = graded.length ? Math.round(graded.reduce((sum, item) => sum + (item.score ?? 0), 0) / graded.length) : 0;
  const classFinance = selectFinanceView(finance, undefined, classId);
  const invoices = billableInvoices(classFinance.invoices);
  const { totalExpected: invoiced, amountCollected: collected, outstandingAmount: outstanding } = summarizeFinanceState(classFinance);
  const fullyPaid = students.filter((student) => {
    const rows = invoices.filter((invoice) => invoice.studentId === student.id);
    return rows.length > 0 && rows.every((invoice) => invoice.outstandingBalance <= 0);
  }).length;
  const ownerAssignments = academics.teacherAssignments
    .filter((item) => item.classId === classId && item.assignmentType === "CLASS_TEACHER" && !item.isRemoved)
    .sort((a, b) => Number(a.assignmentRole === "CO") - Number(b.assignmentRole === "CO"));
  const ownerIds = schoolClass.classOwnerAssignments?.length
    ? schoolClass.classOwnerAssignments.map((item) => item.userId)
    : [...new Set([
    ...ownerAssignments.map((item) => item.teacherUserId),
    ...(schoolClass.classTeacherUserId ? [schoolClass.classTeacherUserId] : []),
  ])];
  const classOwners = ownerIds.map((userId) => {
    const teacher = academics.teachers.find((item) => item.userId === userId);
    const staff = academics.staff.find((item) => item.userId === userId);
    const assignment = ownerAssignments.find((item) => item.teacherUserId === userId);
    return {
      userId,
      name: teacher ? `${teacher.firstName} ${teacher.lastName}` : staff?.fullName ?? "",
      role: (schoolClass.classOwnerAssignments?.find((item) => item.userId === userId)?.assignmentRole ?? assignment?.assignmentRole) === "CO" ? "Co-owner" : "Class owner",
    };
  }).filter((owner) => owner.name);
  const coOwners = classOwners.filter((owner) => owner.role === "Co-owner");
  const ownerCandidates = academics.staff
    .filter((person) => person.status === "ACTIVE")
    .filter((person) => staffFilter === "ALL" || (staffFilter === "TEACHERS" ? person.isTeachingStaff : !person.isTeachingStaff))
    .filter((person) => `${person.fullName} ${person.email} ${person.jobTitle ?? ""} ${person.department ?? ""}`.toLowerCase().includes(staffSearch.trim().toLowerCase()))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const saveOwnerChange = async (selectedUserId: string) => {
    const nextMain = ownerType === "MAIN" ? selectedUserId : classOwners.find((owner) => owner.role === "Class owner")?.userId ?? schoolClass.classTeacherUserId ?? "";
    if (!nextMain) {
      toast("Assign a class owner before adding a co-owner.", "error");
      return;
    }
    let nextCoOwners = coOwners.map((owner) => owner.userId);
    if (ownerType === "CO") {
      if (addingCoOwner || !coOwnerToReplace) nextCoOwners = [...new Set([...nextCoOwners, selectedUserId])];
      else nextCoOwners = nextCoOwners.map((id) => id === coOwnerToReplace ? selectedUserId : id);
    }
    setSavingOwners(true);
    try {
      await setClassOwners(classId, nextMain, nextCoOwners);
      toast("Class ownership updated.", "success");
      setChangeOpen(false);
      setCoOwnerToReplace("");
      setAddingCoOwner(false);
      setStaffSearch("");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Class ownership could not be updated.", "error");
    } finally {
      setSavingOwners(false);
    }
  };

  const subjectRows = classAssignments.map((assignment) => {
    const rows = submissions.filter((item) => item.assignmentId === assignment.id && typeof item.score === "number");
    return { id: assignment.subjectId, name: subjectNames[assignment.subjectId] ?? assignment.subjectId, scores: rows.map((item) => item.score ?? 0) };
  }).reduce<Array<{ id: string; name: string; scores: number[] }>>((all, row) => {
    const current = all.find((item) => item.id === row.id);
    if (current) current.scores.push(...row.scores); else all.push(row);
    return all;
  }, []).map((row) => ({ ...row, average: row.scores.length ? Math.round(row.scores.reduce((a, b) => a + b, 0) / row.scores.length) : 0 })).sort((a, b) => b.average - a.average);

  const trends = [...classRegisters].sort((a, b) => a.date.localeCompare(b.date)).slice(-6).map((register) => ({
    label: new Date(`${register.date}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }),
    value: percent(register.entries.filter((entry) => entry.status === "PRESENT" || entry.status === "LATE").length, register.entries.length),
  }));

  const studentRows = students.map((student) => {
    const studentSubmissions = submissions.filter((item) => item.studentId === student.id && typeof item.score === "number");
    const studentInvoices = invoices.filter((invoice) => invoice.studentId === student.id);
    return {
      student,
      attendance: getAttendanceSummaryForStudent(sessionRegisters, student.id, { ...sessionPeriod, studentStartDate: student.admissionDate }).percentage,
      score: studentSubmissions.length ? Math.round(studentSubmissions.reduce((sum, item) => sum + (item.score ?? 0), 0) / studentSubmissions.length) : 0,
      outstanding: studentInvoices.reduce((sum, item) => sum + item.outstandingBalance, 0),
      hasInvoice: studentInvoices.length > 0,
    };
  });

  const exportCsv = () => {
    const csv = [["Student", "Admission number", "Attendance", "Average score", "Outstanding fees"], ...studentRows.map(({ student, attendance, score, outstanding: balance }) => [`${student.firstName} ${student.lastName}`, student.admissionNumber, `${attendance}%`, `${score}%`, String(balance)])].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${schoolClass.displayName.replaceAll(" ", "-").toLowerCase()}-report.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="print:text-black">
    <PageHeader title={schoolClass.displayName} description={`${schoolClass.level.replaceAll("_", " ")} · ${periodSessionName} · ${periodTermLabel}`} backFallback="/admin/academics/classes" action={<div className="flex flex-wrap gap-2 print:hidden"><Link href={`/admin/academics/classes?class=${classId}`} className={buttonStyles("outline")}><Pencil size={15}/>Edit class</Link><Button variant="outline" onClick={exportCsv}><Download size={15}/>Export summary</Button><Button variant="outline" onClick={() => window.print()}><Printer size={15}/>Print report</Button></div>} />
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-surface p-4">
      <p className="text-sm font-semibold">Class owners</p>
      {classOwners.length ? classOwners.map((owner) => <div key={owner.userId} className="flex items-center gap-2 text-sm">
        <span className="text-muted">{owner.role}:</span>
        <Link href={`/admin/staff/${encodeURIComponent(owner.userId)}`} className="font-semibold text-[var(--school-primary)] hover:underline">{owner.name}</Link>
      </div>) : <p className="text-sm text-muted">No class owner assigned</p>}
      <Button variant="outline" className="ml-auto" onClick={() => { setOwnerType("MAIN"); setChangeOpen(true); }}><ArrowRightLeft size={15}/>Change</Button>
    </div>
    <Modal open={changeOpen} title="Change class ownership" description={`Choose which owner role to update for ${schoolClass.displayName}.`} maxWidth="lg" onClose={() => setChangeOpen(false)}>
      <div className="space-y-4 p-5">
        <Select label="Owner role" value={ownerType} onChange={(value) => { setOwnerType(value as "MAIN" | "CO"); setCoOwnerToReplace(""); setAddingCoOwner(false); }} options={[{ value: "MAIN", label: "Class owner" }, { value: "CO", label: "Co-owner" }]}/>
        {ownerType === "CO" && coOwners.length > 0 && !addingCoOwner && !coOwnerToReplace && <div className="space-y-2"><p className="text-sm font-medium">Select the co-owner to replace, or add another.</p>{coOwners.map((owner) => <Button key={owner.userId} variant="outline" className="w-full justify-between" onClick={() => setCoOwnerToReplace(owner.userId)}><span>{owner.name}</span><span className="text-xs text-muted">Replace</span></Button>)}<Button variant="ghost" className="w-full" onClick={() => setAddingCoOwner(true)}>Add another co-owner</Button></div>}
        {(ownerType === "MAIN" || addingCoOwner || !coOwners.length || Boolean(coOwnerToReplace)) && <>
          <div className="grid gap-3 sm:grid-cols-[1fr_190px]"><label className="block text-sm font-medium">Search staff<Input className="mt-2" placeholder="Name, role, email or department" value={staffSearch} onChange={(event) => setStaffSearch(event.target.value)}/></label><Select label="Staff type" value={staffFilter} onChange={setStaffFilter} options={[{ value: "ALL", label: "All staff" }, { value: "TEACHERS", label: "Teachers" }, { value: "NON_TEACHERS", label: "Non-teaching staff" }]}/></div>
          <div className="max-h-72 divide-y overflow-y-auto rounded-xl border">{ownerCandidates.map((person) => <div key={person.userId} className="flex items-center justify-between gap-3 p-3"><div><p className="text-sm font-semibold"><PersonNameLink kind="staff" id={person.userId}>{person.fullName}</PersonNameLink></p><p className="text-xs text-muted">{person.isTeachingStaff ? "Teacher" : person.jobTitle || person.department || "Non-teaching staff"}{person.email ? ` · ${person.email}` : ""}</p></div><Button disabled={savingOwners || (ownerType === "MAIN" && person.userId === schoolClass.classTeacherUserId) || (ownerType === "CO" && coOwners.some((owner) => owner.userId === person.userId))} onClick={() => void saveOwnerChange(person.userId)}>{savingOwners ? "Saving…" : "Select"}</Button></div>)}{!ownerCandidates.length && <p className="p-6 text-center text-sm text-muted">No active staff match this search.</p>}</div>
        </>}
        <div className="flex justify-end"><Button variant="ghost" onClick={() => setChangeOpen(false)}><X size={15}/>Close</Button></div>
      </div>
    </Modal>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <Metric label="Students" value={students.length} detail="Total enrolled" />
      <Metric label="Boys" value={students.filter((item) => item.gender === "Male").length} detail="Male students" />
      <Metric label="Girls" value={students.filter((item) => item.gender === "Female").length} detail="Female students" />
      <Metric label="Attendance" value={`${attendanceRate}%`} detail="Elapsed session school days" />
      <Metric label="Average score" value={graded.length ? `${averageScore}%` : "—"} detail={`${graded.length} graded submissions`} />
      <Metric label="Assignments" value={`${percent(submitted.length, submissions.length)}%`} detail={`${submitted.length} of ${submissions.length} completed`} />
      <Metric label="Fee payment (all terms)" value={`${percent(collected, invoiced)}%`} detail={`${formatNaira(outstanding)} outstanding`} />
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Card className="p-5">
        <h2 className="font-semibold">Subject performance</h2><p className="mt-1 text-sm text-muted">Average scores from graded class assignments.</p>
        <div className="mt-5 space-y-4">{subjectRows.length ? subjectRows.map((subject) => <div key={subject.id}><div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{subject.name}</span><span>{subject.average}%</span></div><div className="h-2 rounded-full bg-surface-muted"><div className="h-2 rounded-full bg-[var(--school-primary)]" style={{ width: `${subject.average}%` }} /></div></div>) : <p className="py-8 text-center text-sm text-muted">Performance appears after assignments are graded.</p>}</div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Quick insights</h2><div className="mt-4 space-y-3 text-sm">
          <p className="flex gap-2"><Users className="mt-0.5 shrink-0 text-[var(--school-primary)]" size={17}/>{students.length < (schoolClass.capacity ?? 999) ? `${(schoolClass.capacity ?? students.length) - students.length} places remain before capacity.` : "This class is at capacity."}</p>
          <p className="flex gap-2">{attendanceRate >= 85 ? <TrendingUp className="mt-0.5 shrink-0 text-success" size={17}/> : <TrendingDown className="mt-0.5 shrink-0 text-danger" size={17}/>}Attendance is {attendanceRate >= 85 ? "healthy" : "below the 85% target"}.</p>
          {subjectRows.length > 1 && <p><strong>{subjectRows[0].name}</strong> is strongest; <strong>{subjectRows.at(-1)?.name}</strong> needs the most attention.</p>}
          <p>{fullyPaid} of {students.length} students have fully settled issued invoices.</p>
        </div>
      </Card>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <Card className="p-5"><h2 className="font-semibold">Attendance summary</h2><p className="mt-1 text-sm text-muted">{attendanceRate}% attendance across elapsed session school days.</p><div className="mt-4 grid grid-cols-4 gap-2 text-center"><div><p className="font-bold text-success">{presentCount}</p><p className="text-xs text-muted">Present</p></div><div><p className="font-bold text-danger">{absentCount}</p><p className="text-xs text-muted">Absent</p></div><div><p className="font-bold text-warning">{lateCount}</p><p className="text-xs text-muted">Late</p></div><div><p className="font-bold">{excusedCount}</p><p className="text-xs text-muted">Excused</p></div></div><div className="mt-5 grid h-32 grid-cols-6 items-end gap-3">{trends.length ? trends.map((item) => <div key={item.label} className="flex h-full flex-col justify-end text-center"><span className="mb-1 text-xs font-semibold">{item.value}%</span><div className="mx-auto w-full max-w-10 rounded-t bg-[var(--school-primary)]" style={{ height: `${Math.max(item.value, 5)}%` }}/><span className="mt-2 text-[11px] text-muted">{item.label}</span></div>) : <p className="col-span-6 self-center text-center text-sm text-muted">No submitted attendance yet.</p>}</div></Card>
      <div className="grid gap-5"><Card className="p-5"><h2 className="font-semibold">Assignment summary</h2><div className="mt-4 grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted">Total assignments</p><p className="font-bold">{classAssignments.length}</p></div><div><p className="text-muted">Completed</p><p className="font-bold text-success">{submitted.length}</p></div><div><p className="text-muted">Outstanding</p><p className="font-bold text-danger">{submissions.length - submitted.length}</p></div><div><p className="text-muted">Late submissions</p><p className="font-bold text-warning">{submissions.filter((item) => item.status === "LATE").length}</p></div></div></Card><Card className="p-5"><h2 className="font-semibold">Finance summary</h2><div className="mt-4 grid grid-cols-3 gap-3"><div><p className="text-xs text-muted">Fully paid</p><p className="font-bold">{fullyPaid}</p></div><div><p className="text-xs text-muted">Outstanding</p><p className="font-bold">{students.filter((student) => invoices.some((invoice) => invoice.studentId === student.id && invoice.outstandingBalance > 0)).length}</p></div><div><p className="text-xs text-muted">Collection</p><p className="font-bold">{percent(collected, invoiced)}%</p></div></div></Card></div>
    </div>

    <Card className="mt-5 overflow-hidden">
      <div className="border-b p-5"><h2 className="font-semibold">Student performance</h2><p className="mt-1 text-sm text-muted">Open a student record for complete academic, attendance and fee details.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Attendance</th><th className="px-5 py-3">Average</th><th className="px-5 py-3">Fee status</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y">{studentRows.map(({ student, attendance, score, outstanding: balance, hasInvoice }) => <ClickableTableRow key={student.id} href={`/admin/students/${student.id}`} label={`${student.firstName} ${student.lastName}`}><td className="px-5 py-4"><p className="font-semibold">{student.firstName} {student.lastName}</p><p className="text-xs text-muted">{student.admissionNumber}</p></td><td className="px-5 py-4"><Badge tone={attendance >= 85 ? "success" : attendance >= 70 ? "warning" : "danger"}>{attendance || "—"}{attendance ? "%" : ""}</Badge></td><td className="px-5 py-4"><Badge tone={scoreTone(score)}>{score || "—"}{score ? "%" : ""}</Badge></td><td className="px-5 py-4"><Badge tone={!hasInvoice ? "neutral" : balance <= 0 ? "success" : "warning"}>{!hasInvoice ? "Not invoiced" : balance <= 0 ? "Paid" : `${formatNaira(balance)} due`}</Badge></td><td className="px-5 py-4 text-right"><Link className={cn(buttonStyles("ghost"), "text-[var(--school-primary)]")} href={`/admin/students/${student.id}`}>View student</Link></td></ClickableTableRow>)}</tbody></table></div>
      {!studentRows.length && <p className="p-8 text-center text-sm text-muted">No students are assigned to this class.</p>}
    </Card>
  </div>;
}
