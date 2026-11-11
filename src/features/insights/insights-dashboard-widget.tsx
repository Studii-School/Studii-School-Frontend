"use client";

import { useEffect, useMemo, useState } from "react";
import { Cake, Gift, Sparkles, TrendingDown, Trophy } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { Badge } from "@/components/ui/badge";
import { useAcademics } from "@/features/academics/academics-context";
import { getClassesForTeacher } from "@/features/academics/academics.selectors";
import { readStoredUser } from "@/lib/auth";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { birthdaysWithin, loadInsightsData, type InsightsData } from "./insights-data";

export function InsightsDashboardWidget({ role }: { role: "admin" | "teacher" }) {
  const { state, isLoading } = useAcademics();
  const period = useAcademicPeriod();
  const [data, setData] = useState<InsightsData>({ passMark: 50, classes: [], students: [] });
  const [loading, setLoading] = useState(true);
  const userId = readStoredUser()?.id ?? "";
  const classes = useMemo(() => role === "teacher" ? getClassesForTeacher(state, userId) : state.classes.filter((item) => item.status === "ACTIVE"), [role, state, userId]);
  const classIds = new Set(classes.map((item) => item.id));
  const students = state.students.filter((item) => item.status === "ACTIVE" && (role === "admin" || classIds.has(item.classId)));
  const birthdayPeople = useMemo(() => [
    ...students.map((person) => ({ id: `student-${person.id}`, firstName: person.firstName, lastName: person.lastName, dateOfBirth: person.dateOfBirth, roleLabel: "Student" })),
    ...(role === "admin" ? state.guardians.filter((person) => person.accountStatus !== "SUSPENDED").map((person) => {
      const [firstName, ...lastParts] = person.fullName.trim().split(/\s+/);
      return { id: `parent-${person.id}`, firstName: firstName || person.fullName, lastName: lastParts.join(" "), dateOfBirth: person.dateOfBirth ?? undefined, roleLabel: "Parent" };
    }) : []),
    ...(role === "admin" ? state.staff.filter((person) => person.status === "ACTIVE").map((person) => ({
      id: `staff-${person.id}`, firstName: person.firstName, lastName: person.lastName,
      dateOfBirth: person.dateOfBirth ?? undefined, roleLabel: person.isTeachingStaff ? "Teacher" : "Staff",
    })) : []),
  ], [role, state.guardians, state.staff, students]);
  const birthdays = birthdaysWithin(birthdayPeople, 30);

  useEffect(() => {
    if (isLoading) return;
    let active = true;
    void loadInsightsData(classes, { sessionId: period.sessionId || undefined, termId: period.termId || undefined })
      .then((next) => { if (active) setData(next); })
      .catch(() => { if (active) setData({ passMark: 50, classes: [], students: [] }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isLoading, classes, period.sessionId, period.termId]);

  const topStudent = data.students[0];
  const attentionStudent = [...data.students].filter((item) => item.average < data.passMark).sort((a, b) => a.average - b.average)[0];
  const topClass = data.classes[0];
  const attentionClass = [...data.classes].filter((item) => item.average < data.passMark).sort((a, b) => a.average - b.average)[0];
  const href = role === "admin" ? "/admin/insights" : "/teacher/insights";

  if (loading) return <div className="h-full min-h-40 animate-pulse rounded-xl bg-surface-muted" />;
  return <div className="flex h-full flex-col gap-3 p-1">
    {role === "admin" && <InsightLine icon={<Trophy size={15} />} label="Top class" name={topClass?.name ?? "No published results"} value={topClass ? `${topClass.average}%` : ""} />}
    {role === "admin" && <InsightLine icon={<TrendingDown size={15} />} label="Class needing attention" name={attentionClass?.name ?? "None below pass mark"} value={attentionClass ? `${attentionClass.average}%` : ""} attention />}
    <InsightLine icon={<Trophy size={15} />} label="Top student" name={topStudent ? `${topStudent.firstName} ${topStudent.lastName}` : "No published results"} value={topStudent ? `${topStudent.average}%` : ""} />
    <InsightLine icon={<TrendingDown size={15} />} label="Student needing attention" name={attentionStudent ? `${attentionStudent.firstName} ${attentionStudent.lastName}` : "None below pass mark"} value={attentionStudent ? `${attentionStudent.average}%` : ""} attention />
    <div className="rounded-lg bg-gradient-to-br from-rose-50 to-amber-50 p-3"><div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><Cake size={16} className="text-rose-500" /><p className="text-xs font-semibold text-muted">Upcoming birthdays | 30 days</p></div><Badge tone={birthdays.length ? "primary" : "neutral"}>{birthdays.length}</Badge></div>{birthdays.slice(0, 3).map(({ person, daysAway, nextBirthday }) => <div key={person.id} className="flex items-center justify-between gap-2 border-t border-rose-100 py-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{person.firstName} {person.lastName}</p><p className="flex items-center gap-1 text-xs text-muted"><span>{person.roleLabel} | {nextBirthday.toLocaleDateString(undefined, { month: "short", day: "numeric" })} | {daysAway === 0 ? "Happy birthday!" : `In ${daysAway} days`}</span><Gift size={12} className="text-rose-500" /><Sparkles size={12} className="text-amber-500" /></p></div></div>)}{!birthdays.length && <p className="text-sm text-muted">No upcoming birthdays</p>}</div>
    <Link className="mt-auto text-sm font-semibold text-[var(--school-primary)]" href={href}>Open all insights</Link>
  </div>;
}

function InsightLine({ icon, label, name, value, attention = false }: { icon: React.ReactNode; label: string; name: string; value: string; attention?: boolean }) { return <div className="flex items-center justify-between gap-3 border-b pb-2"><div className="flex min-w-0 items-center gap-2"><span className={attention ? "text-warning" : "text-success"}>{icon}</span><div className="min-w-0"><p className="text-xs text-muted">{label}</p><p className="truncate text-sm font-semibold">{name}</p></div></div>{value && <Badge tone={attention ? "warning" : "success"}>{value}</Badge>}</div>; }
