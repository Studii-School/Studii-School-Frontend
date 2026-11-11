"use client";
/* eslint-disable react-hooks/set-state-in-effect -- async widget hydration resets its loading state when the selected term changes. */

import { useEffect, useState } from "react";
import { CalendarCheck, School, Users, WalletCards } from "lucide-react";
import { ActivityList } from "@/components/dashboard/activity-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SectionCard } from "@/components/dashboard/section-card";
import { SimpleTable } from "@/components/dashboard/simple-table";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { getClassesForTeacher } from "@/features/academics/academics.selectors";
import { resolveStudentSession } from "@/features/academics/student-session";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { academicTermLabel } from "@/features/academic-period/academic-period.types";
import { dateBelongsToPeriod } from "@/features/academic-period/period-scope-utils";
import { useAdmissions } from "@/features/admissions/admissions-context";
import { useAnnouncements } from "@/features/announcements/announcements-context";
import { getAnnouncementsForUser } from "@/features/announcements/announcements.utils";
import { useAssignments } from "@/features/assignments/assignments-context";
import { filterAssignmentsByPeriod } from "@/features/assignments/assignments-period-utils";
import { useAttendance } from "@/features/attendance/attendance-context";
import {
  filterAttendanceByPeriod,
  getAttendanceSummaryForStudent,
  selectAttendanceStudentId,
  summarizeRegister,
} from "@/features/attendance/attendance.utils";
import { DashboardEvents } from "@/features/events/dashboard-events";
import { CollectionProgress } from "@/features/finance/components/collection-progress";
import { PaymentTable } from "@/features/finance/components/payment-table";
import { useFinance } from "@/features/finance/finance-context";
import { billableInvoices, summarizeFinanceState } from "@/features/finance/finance-scope";
import { parentPaymentInvoices, studentPaymentInvoices } from "@/features/finance/payment-audience";
import { parentChildrenFromAcademics } from "@/features/parents/parent-child-utils";
import { PersonNameLink } from "@/features/people/person-name-link";
import { resultsRepository } from "@/features/results/results.repository";
import type { FamilyResult } from "@/features/results/results.types";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { timetableRepository } from "@/features/timetable/timetable.repository";
import { visibleTimetableEntries } from "@/features/timetable/timetable-period-utils";
import type { TimetableDay, TimetableEntry } from "@/features/timetable/timetable.types";
import { readStoredUser } from "@/lib/auth";
import { readStoredToken } from "@/lib/api";
import { formatNaira } from "@/lib/currency";
import type { TableRow } from "@/types";
import type { PortalRole } from "./dashboard-widget.types";

type MetricData = {
  value: string;
  note: React.ReactNode;
  icon: React.ComponentType<{ size?: number }>;
};

function Metric({ title, data }: { title: string; data: MetricData }) {
  const Icon = data.icon;
  return (
    <Card className="h-full p-3">
      <div className="flex justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-1.5 break-words text-xl font-bold">{data.value}</p>
          <p className="mt-1.5 text-xs text-muted">{data.note}</p>
        </div>
        <span className="h-fit shrink-0 rounded-[10px] bg-[color-mix(in_srgb,var(--school-primary)_12%,white)] p-2 text-[var(--school-primary)]">
          <Icon size={18} />
        </span>
      </div>
    </Card>
  );
}

function teacherDisplayName(academics: ReturnType<typeof useAcademics>["state"], teacherId?: string) {
  if (!teacherId) return "Unassigned";
  const matchesId = (record: { id?: string; userId?: string; staffId?: string }) =>
    [record.id, record.userId, record.staffId].some((id) => id === teacherId);
  const teacher = academics.teachers.find(matchesId);
  if (teacher) {
    const name = `${teacher.firstName} ${teacher.lastName}`.trim();
    if (name) return name;
  }
  const staff = academics.staff.find(matchesId);
  if (staff) return staff.fullName || `${staff.firstName} ${staff.lastName}`.trim() || staff.email;
  const assignedTeacher = academics.classes
    .flatMap((schoolClass) => schoolClass.assignedTeachers ?? [])
    .find(matchesId);
  if (assignedTeacher) {
    const name = `${assignedTeacher.firstName} ${assignedTeacher.lastName}`.trim();
    if (name) return name;
  }
  return teacherId;
}

const emptyRows: TableRow[] = [];
const timetableDays: TimetableDay[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

function todayTimetableDay() {
  return timetableDays[new Date().getDay() - 1];
}

export function DashboardWidgetContent({
  role,
  widgetId,
  title,
}: {
  role: PortalRole;
  widgetId: string;
  title: string;
}) {
  const { state: academics, isLoading: academicsLoading, error: academicsError } = useAcademics();
  const { applications } = useAdmissions();
  const { state: assignments } = useAssignments();
  const { announcements } = useAnnouncements();
  const { registers, sessionRegisters } = useAttendance();
  const { allState: allFinance, source: financeSource } = useFinance();
  const { settings } = useSchoolSettings();
  const { selectedSession, selectedTerm, scope, isLoading: periodLoading } = useAcademicPeriod();
  const [latestResults, setLatestResults] = useState<FamilyResult[]>([]);
  const [teacherResultAssignments, setTeacherResultAssignments] = useState(0);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [widgetDataLoading, setWidgetDataLoading] = useState(() => ["student-latest-result", "parent-latest-result", "teacher-results-pending", "teacher-classes", "student-timetable"].includes(widgetId));
  const [selectedParentChildId, setSelectedParentChildId] = useState("");

  const user = readStoredUser();
  const activeClasses = role === "teacher"
    ? getClassesForTeacher(academics, user?.id ?? "")
    : academics.classes.filter((item) => item.status === "ACTIVE");
  const activeStudents = academics.students.filter((item) => item.status === "ACTIVE");
  const activeTeachers = academics.teachers.filter((item) => item.status === "ACTIVE");
  const today = new Date().toISOString().slice(0, 10);
  const attendancePeriod = {
    academicSessionId: selectedSession?.id,
    startDate: selectedSession?.startDate || settings.resumptionDate,
    endDate: selectedSession?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedSession),
  };
  const selectedPeriodDateScope = {
    startDate: selectedTerm?.startDate || settings.resumptionDate,
    endDate: selectedTerm?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedTerm),
  };
  const periodRegisters = filterAttendanceByPeriod(registers, { academicSessionId: selectedSession?.id, termId: selectedTerm?.id });
  const todayRegisters = periodRegisters.filter((item) => item.date === today);
  const submittedToday = todayRegisters.filter((item) => item.status === "SUBMITTED");
  const attendanceStudentId =
    periodRegisters
      .flatMap((register) => register.entries)
      .find((entry) => entry.studentId)?.studentId ?? "";
  const resolvedStudent = role === "student"
    ? resolveStudentSession(academics, user, readStoredToken() ? undefined : "student-yusuf")
    : undefined;
  const selectedStudentId = role === "student"
    ? selectAttendanceStudentId(periodRegisters, resolvedStudent?.studentId)
    : academics.students[0]?.id ?? attendanceStudentId;
  const selectedStudent =
    academics.students.find((student) => student.id === selectedStudentId) ??
    (role === "student" ? undefined : academics.students[0]);
  const selectedClass = selectedStudent
    ? academics.classes.find((item) => item.id === selectedStudent.classId)
    : activeClasses[0];
  const selectedRegister = selectedStudent
    ? periodRegisters.find((item) =>
        item.entries.some((entry) => entry.studentId === selectedStudentId),
      )
    : todayRegisters[0];
  const periodAssignments = filterAssignmentsByPeriod(assignments.assignments, {
    sessionId: selectedSession?.id,
    termId: selectedTerm?.id,
    ...selectedPeriodDateScope,
  });
  const periodSessionName = selectedSession?.name || settings.currentAcademicSession;
  const periodTermLabel = selectedTerm ? academicTermLabel(selectedTerm.name) : settings.currentTerm;
  const periodTimetableEntries = visibleTimetableEntries(timetableEntries, {
    academicSessionId: selectedSession?.id,
    termId: selectedTerm?.id,
    academicSession: periodSessionName,
    term: periodTermLabel,
    isCurrentPeriod: scope.isCurrentPeriod,
  }, Boolean(readStoredToken()));
  const periodInvoices = billableInvoices(allFinance.invoices);
  const periodPayments = allFinance.payments;
  const periodReconciliationTransactions = allFinance.reconciliationTransactions;
  const periodNeedsReview = periodReconciliationTransactions.filter((item) => !["Auto-matched", "Manually matched"].includes(item.status)).length;
  const periodReconciliationRate = periodReconciliationTransactions.length ? Math.round(((periodReconciliationTransactions.length - periodNeedsReview) / periodReconciliationTransactions.length) * 100) : 0;
  const attendanceSummary = selectedStudentId
    ? getAttendanceSummaryForStudent(sessionRegisters, selectedStudentId, attendancePeriod)
    : summarizeRegister(todayRegisters[0]);
  useEffect(() => {
    let active = true;
    const needsAsyncData = ["student-latest-result", "parent-latest-result", "teacher-results-pending", "teacher-classes", "student-timetable"].includes(widgetId);
    setWidgetDataLoading(needsAsyncData);
    if (!needsAsyncData) return () => { active = false; };

    const resultPeriod = { sessionId: selectedSession?.id, termId: selectedTerm?.id };
    const request = widgetId === "student-latest-result"
      ? resultsRepository.getMine(resultPeriod).then((items) => { if (active) setLatestResults(items); }).catch(() => { if (active) setLatestResults([]); })
      : widgetId === "parent-latest-result"
        ? resultsRepository.getChildren(resultPeriod).then((items) => { if (active) setLatestResults(items); }).catch(() => { if (active) setLatestResults([]); })
        : widgetId === "teacher-results-pending"
          ? resultsRepository.getTeacherAssignments().then((items) => { if (active) setTeacherResultAssignments(items.length); }).catch(() => { if (active) setTeacherResultAssignments(0); })
          : timetableRepository.list().then((items) => { if (active) setTimetableEntries(items); }).catch(() => { if (active) setTimetableEntries([]); });
    void request.finally(() => { if (active) setWidgetDataLoading(false); });
    return () => { active = false; };
  }, [selectedSession?.id, selectedTerm?.id, widgetId]);
  if (academicsLoading || periodLoading || widgetDataLoading) {
    return <div className="h-full min-h-24 animate-pulse rounded-xl bg-surface-muted" aria-label="Loading dashboard data" />;
  }
  const latestResult = latestResults[0];
  const latestScore = latestResult?.status === "IN_PROGRESS"
    ? latestResult.subjectScores.flatMap((subject) => Object.entries(subject.components).map(([name, score]) => ({ name, score })))[0]
    : undefined;
  const studentInvoices = role === "student"
    ? studentPaymentInvoices(allFinance.invoices, financeSource === "api", resolvedStudent?.studentId)
    : [];
  const studentOutstanding = studentInvoices.reduce((sum, item) => sum + item.outstandingBalance, 0);
  const studentInvoice = studentInvoices.filter((item) => item.outstandingBalance > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const parentChildIds = new Set(parentChildrenFromAcademics(academics).map((item) => item.id));
  const parentInvoices = role === "parent"
    ? parentPaymentInvoices(allFinance.invoices, financeSource === "api", parentChildIds, user?.id, user?.email)
    : [];
  const parentOutstanding = parentInvoices.reduce(
    (sum, item) => sum + item.outstandingBalance,
    0,
  );
  const { amountCollected: allCollected, outstandingAmount: allOutstanding, collectionRate: allCollectionRate } = summarizeFinanceState(allFinance);
  const periodAnnouncements = announcements;
  const visibleAnnouncements =
    role === "admin" || readStoredToken()
      ? periodAnnouncements
      : getAnnouncementsForUser(periodAnnouncements, role);

  const metricMap: Record<string, MetricData> = {
    "admin-students": {
      value: String(activeStudents.length),
      note: `${academics.students.length} total records`,
      icon: Users,
    },
    "admin-staff": {
      value: String(activeTeachers.length),
      note: `${academics.teachers.length} total staff records`,
      icon: School,
    },
    "admin-fees-collected": {
      value: formatNaira(allCollected),
      note: `${allCollectionRate}% collected across all terms`,
      icon: WalletCards,
    },
    "admin-outstanding-fees": {
      value: formatNaira(allOutstanding),
      note: `${allFinance.invoices.filter((item) => item.outstandingBalance > 0).length} invoices across all terms`,
      icon: WalletCards,
    },
    "admin-announcement-drafts": {
      value: String(periodAnnouncements.filter((item) => item.status === "DRAFT").length),
      note: `${periodAnnouncements.filter((item) => item.status === "PUBLISHED").length} published`,
      icon: School,
    },
    "admin-active-assignments": {
      value: String(periodAssignments.filter((item) => item.status === "PUBLISHED").length),
      note: `${periodAssignments.length} total assignments`,
      icon: School,
    },
    "teacher-attendance-pending": {
      value: String(Math.max(0, activeClasses.length - submittedToday.length)),
      note: `${submittedToday.length} submitted today`,
      icon: CalendarCheck,
    },
    "teacher-results-pending": {
      value: String(teacherResultAssignments),
      note: "Assigned result entry lanes",
      icon: School,
    },
    "teacher-assigned-classes": {
      value: String(activeClasses.length),
      note: activeClasses[0]?.displayName ?? "No assigned classes",
      icon: Users,
    },
    "student-current-class": {
      value: selectedClass?.displayName ?? "Unassigned",
      note: selectedStudent
        ? <PersonNameLink kind="student" id={selectedStudent.id}>{selectedStudent.firstName} {selectedStudent.lastName}</PersonNameLink>
        : "No student profile",
      icon: School,
    },
    "student-attendance": {
      value: `${attendanceSummary.percentage}%`,
      note: attendanceSummary.total ? `${attendanceSummary.present} present · ${attendanceSummary.unmarked} unmarked school days` : "Session has not started",
      icon: CalendarCheck,
    },
    "student-latest-result": {
      value: latestResult?.status === "IN_PROGRESS" ? latestScore ? `${latestScore.name}: ${latestScore.score}` : "In progress" : latestResult?.grade ?? "No results",
      note: latestResult?.status === "IN_PROGRESS" ? "Saved score · Results page" : latestResult ? `${latestResult.average}% average` : "No scores yet",
      icon: School,
    },
    "student-fee-status": {
      value: studentOutstanding > 0 ? "Payment due" : studentInvoices.length ? "Paid in full" : "No fees assigned",
      note: studentOutstanding > 0 ? `${formatNaira(studentOutstanding)} outstanding across terms` : studentInvoices.length ? "All assigned fees are paid" : "No invoices yet",
      icon: WalletCards,
    },
    "student-fee-balance": {
      value: formatNaira(studentOutstanding),
      note: studentInvoice ? `Next due ${studentInvoice.dueDate}` : "No unpaid fees",
      icon: WalletCards,
    },
    "student-next-payment": {
      value: studentInvoice?.dueDate ?? "No balance due",
      note: "Next payment deadline",
      icon: CalendarCheck,
    },
    "parent-attendance": {
      value: `${attendanceSummary.percentage}%`,
      note: attendanceSummary.total
        ? selectedStudent ? <><PersonNameLink kind="student" id={selectedStudent.id}>{selectedStudent.firstName}</PersonNameLink> · This session</> : "This session"
        : "Session has not started",
      icon: CalendarCheck,
    },
    "parent-latest-result": {
      value: latestResult?.status === "IN_PROGRESS" ? latestScore ? `${latestScore.name}: ${latestScore.score}` : "In progress" : latestResult?.grade ?? "No results",
      note: latestResult?.status === "IN_PROGRESS" ? `${latestResult.student?.firstName ?? "Child"} · Saved score` : latestResult ? `${latestResult.student?.firstName ?? "Child"} · ${latestResult.average}%` : "No scores yet",
      icon: School,
    },
    "parent-outstanding": {
      value: formatNaira(parentOutstanding),
      note: parentOutstanding > 0 ? "Across linked children" : parentInvoices.length ? "All assigned fees are paid" : "No invoices yet",
      icon: WalletCards,
    },
    "parent-next-due": {
      value:
        parentInvoices
          .filter((item) => item.outstandingBalance > 0)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate ??
        "No balance due",
      note: "Next family due date",
      icon: CalendarCheck,
    },
  };

  const metric = metricMap[widgetId];
  if (metric) return <Metric title={title} data={metric} />;

  if (widgetId.endsWith("events")) {
    return <DashboardEvents role={role} selectedClass={selectedClass?.displayName} />;
  }

  if (widgetId.includes("announcement")) {
    return (
      <SectionCard
        title={title}
        action={
          role === "admin" ? (
            <a
              className="text-xs font-semibold text-[var(--school-primary)]"
              href="/admin/announcements"
            >
              Manage announcements
            </a>
          ) : undefined
        }
      >
        <ul className="divide-y px-5">
          {visibleAnnouncements.slice(0, 4).map((item) => (
            <li className="py-3" key={item.id}>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted">{item.summary}</p>
            </li>
          ))}
          {!visibleAnnouncements.length && (
            <li className="py-6 text-center text-sm text-muted">
              No announcements yet.
            </li>
          )}
        </ul>
      </SectionCard>
    );
  }

  if (widgetId === "admin-attendance" || widgetId === "teacher-class-attendance") {
    return (
      <SectionCard title={title}>
        <div className="p-5">
          <p className="text-3xl font-bold">
            {todayRegisters.length
              ? `${Math.round((submittedToday.length / todayRegisters.length) * 100)}%`
              : selectedRegister
                ? `${summarizeRegister(selectedRegister).percentage}%`
                : "No records"}
          </p>
          <p className="mt-3 text-xs text-muted">
            {todayRegisters.length
              ? `${submittedToday.length} of ${todayRegisters.length} registers submitted today`
              : "Attendance records will appear once registers are submitted."}
          </p>
        </div>
      </SectionCard>
    );
  }

  if (widgetId === "admin-admissions") {
    const rows = applications
      .filter((item) => item.status !== "ENROLLED")
      .slice(0, 5)
      .map((item) => ({
        applicant: [item.firstName, item.lastName].filter(Boolean).join(" "),
        applyingFor:
          academics.classes.find((entry) => entry.id === item.classId)
            ?.displayName ?? item.classId,
        status: item.status.replaceAll("_", " "),
      }));
    return (
      <SectionCard title={title}>
        <SimpleTable
          columns={[
            { key: "applicant", label: "Applicant" },
            { key: "applyingFor", label: "Class" },
            { key: "status", label: "Status" },
          ]}
          rows={rows}
        />
      </SectionCard>
    );
  }

  if (widgetId === "teacher-classes") {
    const todayDay = todayTimetableDay();
    const activeClassIds = new Set(activeClasses.map((item) => item.id));
    const rows = todayDay
      ? periodTimetableEntries
          .filter((entry) => entry.day === todayDay && entry.teacherUserId === user?.id && activeClassIds.has(entry.classId))
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .slice(0, 6)
          .map((entry) => {
            const schoolClass = academics.classes.find((item) => item.id === entry.classId);
            const subject = academics.subjects.find((item) => item.id === entry.subjectId);
            return {
              time: `${entry.startTime} - ${entry.endTime}`,
              class: schoolClass?.displayName ?? "Class",
              subject: subject?.name ?? "Subject",
              room: entry.room ?? "Not set",
              students: String(schoolClass?.studentIds.length ?? 0),
            };
          })
      : [];
    return (
      <SectionCard title={title}>
        <SimpleTable
          columns={[
            { key: "time", label: "Time" },
            { key: "class", label: "Class" },
            { key: "subject", label: "Subject" },
            { key: "room", label: "Room" },
            { key: "students", label: "Students" },
          ]}
          rows={rows}
          empty={todayDay ? "No timetable periods scheduled for you today." : "No teaching timetable for weekends."}
        />
      </SectionCard>
    );
  }

  if (widgetId === "admin-recent-payments") {
    return (
      <SectionCard title={title}>
        <PaymentTable payments={allFinance.payments.slice(0, 4)} />
      </SectionCard>
    );
  }

  if (widgetId === "parent-recent-payments" || widgetId === "student-payment-history") {
    return (
      <SectionCard title={title}>
        <PaymentTable
          payments={allFinance.payments
            .filter((item) =>
              (role === "parent" ? parentInvoices : studentInvoices).some((invoice) => invoice.id === item.invoiceId),
            )
            .slice(0, 3)}
        />
      </SectionCard>
    );
  }

  if (widgetId === "student-recent-receipt") {
    const receipts = allFinance.receipts.filter(
      (item) => studentInvoices.some((invoice) => invoice.id === item.invoiceId),
    );
    return (
      <SectionCard title={title}>
        <div className="p-5">
          {receipts.slice(0, 1).map((receipt) => (
            <div key={receipt.id}>
              <p className="font-semibold">{receipt.receiptNumber}</p>
              <p className="text-sm text-muted">
                {formatNaira(receipt.amount)} · {receipt.paymentDate}
              </p>
            </div>
          ))}
          {!receipts.length && <p className="text-sm text-muted">No receipts yet.</p>}
        </div>
      </SectionCard>
    );
  }

  if (widgetId === "student-assignments") {
    const rows = periodAssignments.slice(0, 5).map((item) => ({
      subject: item.subjectId,
      task: item.title,
      due: item.dueAt.slice(0, 10),
    }));
    return (
      <SectionCard title={title}>
        <SimpleTable
          columns={[
            { key: "subject", label: "Subject" },
            { key: "task", label: "Task" },
            { key: "due", label: "Due" },
          ]}
          rows={rows}
        />
      </SectionCard>
    );
  }

  if (widgetId === "admin-activity") {
    return (
      <SectionCard title={title}>
        <ActivityList
          items={academics.studentActivities
            .filter((item) => dateBelongsToPeriod(item.createdAt, selectedPeriodDateScope))
            .slice(0, 5)
            .map((item) => `${item.action}: ${item.detail}`)}
        />
      </SectionCard>
    );
  }

  if (widgetId === "admin-collection-progress") {
    return (
      <SectionCard title={title}>
        <CollectionProgress />
      </SectionCard>
    );
  }

  if (widgetId === "admin-reconciliation") {
    return (
      <Metric
        title={title}
        data={{
          value: String(periodNeedsReview),
          note: `${periodReconciliationRate}% matched in selected term`,
          icon: WalletCards,
        }}
      />
    );
  }

  if (widgetId === "admin-overdue-invoices") {
    return (
      <Metric
        title={title}
        data={{
          value: String(periodInvoices.filter((item) => item.status === "Overdue").length),
          note: "Require follow-up in selected term",
          icon: CalendarCheck,
        }}
      />
    );
  }

  if (widgetId === "admin-payment-methods") {
    const methods = [...new Set(periodPayments.map((item) => item.method))];
    return (
      <SectionCard title={title}>
        <div className="space-y-3 p-5">
          {methods.map((method) => (
            <div key={method} className="flex justify-between text-sm">
              <span>{method}</span>
              <b>
                {formatNaira(
                  periodPayments
                    .filter((item) => item.method === method && item.status === "Successful")
                    .reduce((sum, item) => sum + item.amount, 0),
                )}
              </b>
            </div>
          ))}
          {!methods.length && <p className="text-sm text-muted">No payments yet.</p>}
        </div>
      </SectionCard>
    );
  }

  if (widgetId === "admin-balances-class") {
    const balances = periodInvoices.reduce<Record<string, number>>(
      (all, item) => ({
        ...all,
        [item.className]: (all[item.className] ?? 0) + item.outstandingBalance,
      }),
      {},
    );
    return (
      <SectionCard title={title}>
        <div className="divide-y px-5">
          {Object.entries(balances)
            .slice(0, 4)
            .map(([name, balance]) => (
              <div key={name} className="flex justify-between py-3 text-sm">
                <span>{name}</span>
                <b>{formatNaira(balance)}</b>
              </div>
            ))}
          {!Object.keys(balances).length && (
            <p className="py-6 text-center text-sm text-muted">No balances yet.</p>
          )}
        </div>
      </SectionCard>
    );
  }

  if (widgetId.includes("quick-actions")) {
    return (
      <QuickActions
        actions={
          role === "admin"
            ? [
                { label: "Manage announcements", href: "/admin/announcements", icon: "announcement" },
                { label: "Record payment", href: "/admin/finance/payments", icon: "payment" },
              ]
            : role === "teacher"
              ? [{ label: "Take attendance", href: "/teacher/attendance", icon: "attendance" }]
              : [{ label: "View timetable", href: `/${role}/timetable`, icon: "timetable" }]
        }
      />
    );
  }

  if (widgetId === "student-class-owners" || widgetId === "parent-class-owners") {
    if (academicsLoading || academicsError) {
      return <Card className="h-full p-4 text-sm text-muted">{academicsLoading ? "Loading class owners…" : "Class owner information could not be loaded."}</Card>;
    }
    const classEntries = role === "parent"
      ? parentChildrenFromAcademics(academics).flatMap((child) => {
          const schoolClass = academics.classes.find((item) => item.id === child.classId);
          return schoolClass ? [{ schoolClass, students: [{ id: child.id, name: `${child.firstName} ${child.lastName}` }] }] : [];
        })
      : selectedClass
        ? [{ schoolClass: selectedClass, students: [] as Array<{ id: string; name: string }> }]
        : [];
    const groupedClasses = [...classEntries.reduce((groups, entry) => {
      const existing = groups.get(entry.schoolClass.id);
      if (existing) {
        existing.students.push(...entry.students);
      } else {
        groups.set(entry.schoolClass.id, { ...entry, students: [...entry.students] });
      }
      return groups;
    }, new Map<string, (typeof classEntries)[number]>()).values()];

    return (
      <Card className="h-full p-4">
        {groupedClasses.length ? (
          <div className="space-y-4">
            {groupedClasses.map(({ schoolClass, students }) => {
              const assignments = academics.teacherAssignments.filter((item) =>
                item.classId === schoolClass.id &&
                item.assignmentType === "CLASS_TEACHER" &&
                !item.isRemoved,
              );
              const ownersById = new Map<string, "MAIN" | "CO">();
              for (const owner of schoolClass.classOwnerAssignments ?? []) {
                ownersById.set(owner.userId, owner.assignmentRole);
              }
              if (!ownersById.size) {
                for (const assignment of assignments) {
                  const existingRole = ownersById.get(assignment.teacherUserId);
                  if (!existingRole || assignment.assignmentRole !== "CO") {
                    ownersById.set(assignment.teacherUserId, assignment.assignmentRole === "CO" ? "CO" : "MAIN");
                  }
                }
                if (schoolClass.classTeacherUserId && !ownersById.has(schoolClass.classTeacherUserId)) {
                  ownersById.set(schoolClass.classTeacherUserId, "MAIN");
                }
              }
              const owners = [...ownersById.entries()].sort((a, b) =>
                a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1] === "MAIN" ? -1 : 1,
              );

              return (
                <section key={schoolClass.id} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="font-semibold">{schoolClass.displayName}</h3>
                    {students.length > 0 && <p className="text-xs text-muted">{students.map((student, index) => <span key={student.id}>{index > 0 && ", "}<PersonNameLink kind="student" id={student.id}>{student.name}</PersonNameLink></span>)}</p>}
                  </div>
                  {owners.length ? (
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {owners.map(([teacherId, assignmentRole]) => {
                        const teacherName = schoolClass.classOwnerAssignments?.find((owner) => owner.userId === teacherId)?.name
                          || teacherDisplayName(academics, teacherId);
                        return (
                          <li key={teacherId} className="flex gap-2">
                            <span className="shrink-0 text-muted">{assignmentRole === "CO" ? "Co-owner" : "Class owner"}</span>
                            <PersonNameLink kind="staff" id={teacherId} className="font-medium">{teacherName}</PersonNameLink>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted">No class owner assigned.</p>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">{role === "parent" ? "No linked child classes found." : "No class assigned."}</p>
        )}
      </Card>
    );
  }

  if (widgetId === "parent-child-selector") {
    const childOptions = academics.students.map((student) => {
      const className = academics.classes.find((item) => item.id === student.classId)?.displayName;

      return {
        value: student.id,
        label: `${student.firstName} ${student.lastName}`,
        description: className,
      };
    });
    const selectedChildId = childOptions.some((item) => item.value === selectedParentChildId)
      ? selectedParentChildId
      : childOptions[0]?.value ?? "";

    return (
      <Card className="p-4">
        <Select
          className="max-w-sm"
          disabled={!childOptions.length}
          emptyMessage="No linked children"
          label="Viewing child"
          onChange={setSelectedParentChildId}
          options={childOptions}
          placeholder="No linked children"
          value={selectedChildId}
        />
      </Card>
    );
  }
  if (widgetId === "parent-payment-plan") {
    return (
      <SectionCard title={title}>
        <div className="p-5">
          <p className="font-semibold">No active payment plan</p>
          <p className="text-sm text-muted">Payment plans will appear when available.</p>
        </div>
      </SectionCard>
    );
  }

  if (widgetId === "parent-children-fees") {
    return (
      <SectionCard title={title}>
        <div className="divide-y px-5">
          {parentInvoices.map((invoice) => (
            <div key={invoice.id} className="flex justify-between py-3 text-sm">
              <span>{invoice.student}</span>
              <b>{formatNaira(invoice.outstandingBalance)}</b>
            </div>
          ))}
          {!parentInvoices.length && (
            <p className="py-6 text-center text-sm text-muted">No family invoices yet.</p>
          )}
        </div>
      </SectionCard>
    );
  }

  if (widgetId === "student-timetable") {
    return (
      <SectionCard title={title}>
        <SimpleTable
          columns={[
            { key: "class", label: "Class" },
            { key: "students", label: "Students" },
          ]}
          rows={
            selectedClass
              ? [{ class: selectedClass.displayName, students: String(selectedClass.studentIds.length) }]
              : emptyRows
          }
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title={title}>
      <div className="p-5">
        <p className="text-sm text-muted">Live data will appear here when this module is connected.</p>
      </div>
    </SectionCard>
  );
}
