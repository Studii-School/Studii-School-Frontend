"use client";

import { useEffect, useMemo, useState } from "react";
import { Cake, ChartNoAxesCombined, Gift, School, Sparkles, TrendingDown, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { getClassesForTeacher } from "@/features/academics/academics.selectors";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { PersonNameLink } from "@/features/people/person-name-link";
import { academicTermLabel } from "@/features/academic-period/academic-period.types";
import { readStoredUser } from "@/lib/auth";
import { birthdaysWithin, loadInsightsData, type InsightsData } from "./insights-data";

type InsightsRole = "admin" | "teacher";
export function InsightsScreen({ role }: { role: InsightsRole }) {
  const { state, isLoading: academicsLoading } = useAcademics();
  const [classId, setClassId] = useState("");
  const period = useAcademicPeriod();
  const [data, setData] = useState<InsightsData>({ passMark: 50, classes: [], students: [] });
  const [loading, setLoading] = useState(true);
  const userId = readStoredUser()?.id ?? "";
  const accessibleClasses = useMemo(() => role === "teacher"
    ? getClassesForTeacher(state, userId)
    : state.classes.filter((item) => item.status === "ACTIVE"), [role, state, userId]);
  const accessibleClassIds = useMemo(() => new Set(accessibleClasses.map((item) => item.id)), [accessibleClasses]);
  const visibleClasses = useMemo(() => classId ? accessibleClasses.filter((item) => item.id === classId) : accessibleClasses, [accessibleClasses, classId]);
  const visibleStudents = state.students.filter((item) => item.status === "ACTIVE" && (role === "admin" ? (!classId || item.classId === classId) : accessibleClassIds.has(item.classId) && (!classId || item.classId === classId)));
  const birthdayPeople = useMemo(() => {
    const studentsForBirthdays = role === "admin"
      ? state.students.filter((item) => item.status === "ACTIVE")
      : visibleStudents;
    return [
      ...studentsForBirthdays.map((person) => ({
        id: `student-${person.id}`,
        firstName: person.firstName,
        lastName: person.lastName,
        dateOfBirth: person.dateOfBirth,
        photoUrl: person.photoUrl,
        roleLabel: "Student",
        detail: state.classes.find((item) => item.id === (
          state.studentEnrollments.find((enrollment) => enrollment.studentId === person.id && enrollment.academicSessionId === period.sessionId && enrollment.status === "ACTIVE")?.classId
          ?? person.currentClassId
          ?? person.classId
        ))?.displayName ?? "Class not assigned for this session",
      })),
      ...(role === "admin" ? state.guardians.filter((person) => person.accountStatus !== "SUSPENDED").map((person) => {
        const [firstName, ...lastParts] = person.fullName.trim().split(/\s+/);
        return { id: `parent-${person.id}`, firstName: firstName || person.fullName, lastName: lastParts.join(" "), dateOfBirth: person.dateOfBirth ?? undefined, photoUrl: person.photoUrl, roleLabel: "Parent", detail: "Parent" };
      }) : []),
      ...(role === "admin" ? state.staff.filter((person) => person.status === "ACTIVE").map((person) => ({
        id: `staff-${person.id}`,
        firstName: person.firstName,
        lastName: person.lastName,
        dateOfBirth: person.dateOfBirth ?? undefined,
        photoUrl: person.photoUrl,
        roleLabel: person.isTeachingStaff ? "Teacher" : "Staff",
        detail: person.jobTitle || (person.isTeachingStaff ? "Teacher" : "Staff"),
      })) : []),
    ];
  }, [period.sessionId, role, state.classes, state.guardians, state.staff, state.studentEnrollments, state.students, visibleStudents]);
  const birthdays = birthdaysWithin(birthdayPeople, 30);
  useEffect(() => {
    if (academicsLoading) return;
    let active = true;
    void loadInsightsData(visibleClasses, { sessionId: period.sessionId || undefined, termId: period.termId || undefined })
      .then((next) => { if (active) setData(next); })
      .catch(() => { if (active) setData({ passMark: 50, classes: [], students: [] }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [academicsLoading, period.sessionId, period.termId, visibleClasses]);

  const topClasses = data.classes.slice(0, 5);
  const attentionClasses = [...data.classes].filter((item) => item.average < data.passMark).sort((a, b) => a.average - b.average).slice(0, 5);
  const topStudents = data.students.slice(0, 10);
  const attentionStudents = [...data.students].filter((item) => item.average < data.passMark).sort((a, b) => a.average - b.average).slice(0, 10);

  return <>
    <PageHeader title="Insights" description={role === "admin" ? "School-wide performance rankings, attention signals, and birthdays for your school community." : "Performance and birthdays for your assigned classes only."} />
    <Card className="mb-5 p-4"><div className="grid gap-3 md:grid-cols-3">
      <Select searchable clearable label="Class" value={classId} onChange={setClassId} placeholder={role === "admin" ? "Whole school" : "All assigned classes"} options={accessibleClasses.map((item) => ({ value: item.id, label: item.displayName }))} />
      <Select label="Academic session" value={period.sessionId} onChange={period.setSessionId} placeholder="No sessions available" options={period.sessions.map((item) => ({ value: item.id, label: item.name, description: item.status }))} />
      <Select label="Term" value={period.termId} onChange={period.setTermId} placeholder="No terms available" options={period.terms.map((item) => ({ value: item.id, label: academicTermLabel(item.name), description: item.status }))} />
    </div></Card>
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={School} label="Classes with results" value={String(data.classes.length)} />
      <Metric icon={Users} label="Ranked students" value={String(data.students.length)} />
      <Metric icon={ChartNoAxesCombined} label="Pass mark" value={`${data.passMark}%`} />
      <Metric icon={Cake} label="Birthdays in 30 days" value={String(birthdays.length)} />
    </div>
    {loading ? <div className="h-56 animate-pulse rounded-xl bg-surface-muted" /> : <div className="grid gap-5 xl:grid-cols-2">
      {role === "admin" && <RankingSection title="Top performing classes" icon={<Trophy size={18} />} rows={topClasses.map((item) => ({ id: item.id, primary: item.name, secondary: `${item.studentCount} ranked students`, average: item.average }))} empty="Published class results will appear here." />}
      {role === "admin" && <RankingSection title="Classes needing attention" icon={<TrendingDown size={18} />} rows={attentionClasses.map((item) => ({ id: item.id, primary: item.name, secondary: `Below the ${data.passMark}% pass mark`, average: item.average }))} empty="No classes are currently below the pass mark." attention />}
      <StudentRanking title="Top performing students" students={topStudents} allStudents={state.students} />
      <StudentRanking title="Students needing attention" students={attentionStudents} allStudents={state.students} attention />
      <SectionCard title={role === "admin" ? "Upcoming school birthdays" : "Upcoming student birthdays"} description="Today and the next 30 days">
        <div className="divide-y px-5">{birthdays.map(({ person, daysAway, nextBirthday }) => <div key={person.id} className="flex items-center justify-between gap-3 py-3"><div className="flex items-center gap-3"><Avatar initials={`${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`} src={person.photoUrl} alt={`${person.firstName} ${person.lastName} profile`} /><div><p className="font-semibold"><PersonNameLink kind={person.id.startsWith("student-") ? "student" : person.id.startsWith("parent-") ? "guardian" : "staff"} id={person.id.replace(/^(student|parent|staff)-/, "")}>{person.firstName} {person.lastName}</PersonNameLink></p><p className="text-xs text-muted">{person.roleLabel} | {person.detail} | {nextBirthday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p><div className="mt-1 flex items-center gap-1 text-xs text-rose-600"><Gift size={13} /><Sparkles size={13} /><span>{daysAway === 0 ? "Happy birthday!" : "Send them birthday wishes"}</span></div></div></div><Badge tone={daysAway === 0 ? "primary" : "neutral"}>{daysAway === 0 ? "Today" : `In ${daysAway} days`}</Badge></div>)}</div>
        {!birthdays.length && <EmptyState title="No upcoming birthdays" description={role === "admin" ? "No student, parent, teacher, or staff birthdays were found in the next 30 days." : "No students in your assigned classes have a birthday in the next 30 days."} />}
      </SectionCard>
    </div>}
  </>;
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string }) { return <Card className="p-4"><div className="flex items-start justify-between"><div><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div><span className="rounded-lg bg-primary-light p-2 text-[var(--school-primary)]"><Icon size={18} /></span></div></Card>; }

function RankingSection({ title, icon, rows, empty, attention = false, personKind }: { title: string; icon: React.ReactNode; rows: Array<{ id: string; primary: string; secondary: string; average: number }>; empty: string; attention?: boolean; personKind?: "student" }) { return <SectionCard title={title} action={icon}><div className="divide-y px-5">{rows.map((row, index) => <div key={row.id} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold">{index + 1}</span><div className="min-w-0"><p className="truncate font-semibold">{personKind ? <PersonNameLink kind={personKind} id={row.id}>{row.primary}</PersonNameLink> : row.primary}</p><p className="truncate text-xs text-muted">{row.secondary}</p></div></div><Badge tone={attention ? "warning" : "success"}>{row.average}%</Badge></div>)}</div>{!rows.length && <EmptyState title={empty} />}</SectionCard>; }

function StudentRanking({ title, students, allStudents, attention = false }: { title: string; students: InsightsData["students"]; allStudents: Array<{ id: string; photoUrl?: string }>; attention?: boolean }) { return <RankingSection title={title} icon={attention ? <TrendingDown size={18} /> : <Trophy size={18} />} attention={attention} personKind="student" empty={attention ? "No students are currently below the pass mark." : "Published student results will appear here."} rows={students.map((student) => ({ id: student.id, primary: `${student.firstName} ${student.lastName}`, secondary: `${student.className} · ${student.admissionNumber}${allStudents.find((item) => item.id === student.id)?.photoUrl ? " · Profile photo available" : ""}`, average: student.average }))} />; }
