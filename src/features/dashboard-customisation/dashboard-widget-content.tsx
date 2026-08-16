"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, School, Users, WalletCards } from "lucide-react";
import { ActivityList } from "@/components/dashboard/activity-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SectionCard } from "@/components/dashboard/section-card";
import { SimpleTable } from "@/components/dashboard/simple-table";
import { Card } from "@/components/ui/card";
import { useAcademics } from "@/features/academics/academics-context";
import { getClassesForTeacher } from "@/features/academics/academics.selectors";
import { useAdmissions } from "@/features/admissions/admissions-context";
import { useAnnouncements } from "@/features/announcements/announcements-context";
import { getAnnouncementsForUser } from "@/features/announcements/announcements.utils";
import { useAssignments } from "@/features/assignments/assignments-context";
import { useAttendance } from "@/features/attendance/attendance-context";
import {
  getAttendanceSummaryForStudent,
  summarizeRegister,
} from "@/features/attendance/attendance.utils";
import { DashboardEvents } from "@/features/events/dashboard-events";
import { CollectionProgress } from "@/features/finance/components/collection-progress";
import { PaymentTable } from "@/features/finance/components/payment-table";
import { useFinance } from "@/features/finance/finance-context";
import { resultsRepository } from "@/features/results/results.repository";
import type { StudentResult } from "@/features/results/results.types";
import { timetableRepository } from "@/features/timetable/timetable.repository";
import type { TimetableDay, TimetableEntry } from "@/features/timetable/timetable.types";
import { readStoredUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import type { TableRow } from "@/types";
import type { PortalRole } from "./dashboard-widget.types";

type MetricData = {
  value: string;
  note: string;
  icon: React.ComponentType<{ size?: number }>;
};

function Metric({ title, data }: { title: string; data: MetricData }) {
  const Icon = data.icon;
  return (
    <Card className="h-full p-4">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-2 text-2xl font-bold">{data.value}</p>
          <p className="mt-2 text-xs text-muted">{data.note}</p>
        </div>
        <span className="h-fit rounded-[10px] bg-[color-mix(in_srgb,var(--school-primary)_12%,white)] p-2 text-[var(--school-primary)]">
          <Icon size={18} />
        </span>
      </div>
    </Card>
  );
}

function teacherDisplayName(academics: ReturnType<typeof useAcademics>["state"], teacherId?: string) {
  if (!teacherId) return "Unassigned";
  const teacher = academics.teachers.find((item) => item.userId === teacherId || item.id === teacherId);
  if (teacher) return `${teacher.firstName} ${teacher.lastName}`.trim();
  const staff = academics.staff.find((item) => item.userId === teacherId || item.id === teacherId);
  if (staff) return staff.fullName || staff.email;
  return "Unassigned";
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
  const { state: academics } = useAcademics();
  const { applications } = useAdmissions();
  const { state: assignments } = useAssignments();
  const { announcements } = useAnnouncements();
  const { registers } = useAttendance();
  const { state: finance, summary } = useFinance();
  const [latestResults, setLatestResults] = useState<StudentResult[]>([]);
  const [teacherResultAssignments, setTeacherResultAssignments] = useState(0);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);

  const user = readStoredUser();
  const activeClasses = role === "teacher"
    ? getClassesForTeacher(academics, user?.id ?? "")
    : academics.classes.filter((item) => item.status === "ACTIVE");
  const activeStudents = academics.students.filter((item) => item.status === "ACTIVE");
  const activeTeachers = academics.teachers.filter((item) => item.status === "ACTIVE");
  const today = new Date().toISOString().slice(0, 10);
  const todayRegisters = registers.filter((item) => item.date === today);
  const submittedToday = todayRegisters.filter((item) => item.status === "SUBMITTED");
  const attendanceStudentId =
    registers
      .flatMap((register) => register.entries)
      .find((entry) => entry.studentId)?.studentId ?? "";
  const selectedStudentId =
    role === "student"
      ? user?.studentId ??
        academics.students.find((student) => student.userId === user?.id)?.id ??
        attendanceStudentId
      : academics.students[0]?.id ?? attendanceStudentId;
  const selectedStudent =
    academics.students.find((student) => student.id === selectedStudentId) ??
    academics.students[0];
  const selectedClass = selectedStudent
    ? academics.classes.find((item) => item.id === selectedStudent.classId)
    : activeClasses[0];
  const selectedRegister = selectedStudent
    ? registers.find((item) =>
        item.entries.some((entry) => entry.studentId === selectedStudentId),
      )
    : todayRegisters[0];
  const attendanceSummary = selectedStudentId
    ? getAttendanceSummaryForStudent(registers, selectedStudentId)
    : summarizeRegister(todayRegisters[0]);
  useEffect(() => {
    if (widgetId === "student-latest-result") void resultsRepository.getMine({}).then(setLatestResults).catch(() => setLatestResults([]));
    if (widgetId === "parent-latest-result") void resultsRepository.getChildren({}).then(setLatestResults).catch(() => setLatestResults([]));
    if (widgetId === "teacher-results-pending") void resultsRepository.getTeacherAssignments().then((items) => setTeacherResultAssignments(items.length)).catch(() => setTeacherResultAssignments(0));
    if (widgetId === "teacher-classes" || widgetId === "student-timetable") void timetableRepository.list().then(setTimetableEntries).catch(() => setTimetableEntries([]));
  }, [widgetId]);
  const latestResult = latestResults[0];
  const studentInvoice = selectedStudent
    ? finance.invoices.find((item) => item.studentId === selectedStudent.id)
    : undefined;
  const childIds = new Set(academics.students.map((item) => item.id));
  const parentInvoices = finance.invoices.filter((item) => childIds.has(item.studentId));
  const parentOutstanding = parentInvoices.reduce(
    (sum, item) => sum + item.outstandingBalance,
    0,
  );
  const visibleAnnouncements =
    role === "admin"
      ? announcements
      : getAnnouncementsForUser(announcements, role);

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
      value: formatNaira(summary.amountCollected),
      note: `${summary.collectionRate}% of expected`,
      icon: WalletCards,
    },
    "admin-outstanding-fees": {
      value: formatNaira(summary.outstandingAmount),
      note: `${finance.invoices.filter((item) => item.outstandingBalance > 0).length} accounts`,
      icon: WalletCards,
    },
    "admin-announcement-drafts": {
      value: String(announcements.filter((item) => item.status === "DRAFT").length),
      note: `${announcements.filter((item) => item.status === "PUBLISHED").length} published`,
      icon: School,
    },
    "admin-active-assignments": {
      value: String(assignments.assignments.filter((item) => item.status === "PUBLISHED").length),
      note: `${assignments.assignments.length} total assignments`,
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
        ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
        : "No student profile",
      icon: School,
    },
    "student-attendance": {
      value: `${attendanceSummary.percentage}%`,
      note: `${attendanceSummary.present} present · ${attendanceSummary.absent} absent`,
      icon: CalendarCheck,
    },
    "student-latest-result": {
      value: latestResult?.grade ?? "No results",
      note: latestResult ? `${latestResult.average}% average` : "No published result",
      icon: School,
    },
    "student-fee-status": {
      value: studentInvoice?.status ?? "No invoice",
      note: studentInvoice
        ? `${formatNaira(studentInvoice.outstandingBalance)} outstanding`
        : "No active fee",
      icon: WalletCards,
    },
    "student-fee-balance": {
      value: formatNaira(studentInvoice?.outstandingBalance ?? 0),
      note: `Due ${studentInvoice?.dueDate ?? "not set"}`,
      icon: WalletCards,
    },
    "student-next-payment": {
      value: studentInvoice?.dueDate ?? "No balance due",
      note: "Next payment deadline",
      icon: CalendarCheck,
    },
    "parent-attendance": {
      value: `${attendanceSummary.percentage}%`,
      note: selectedStudent
        ? `${selectedStudent.firstName} · This term`
        : "No linked child",
      icon: CalendarCheck,
    },
    "parent-latest-result": {
      value: latestResult?.grade ?? "No results",
      note: latestResult ? `${latestResult.student?.firstName ?? "Child"} · ${latestResult.average}%` : "No published result",
      icon: School,
    },
    "parent-outstanding": {
      value: formatNaira(parentOutstanding),
      note: "Across linked children",
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
              href="/admin/communications/announcements"
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
      ? timetableEntries
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
        <PaymentTable payments={finance.payments.slice(0, 4)} />
      </SectionCard>
    );
  }

  if (widgetId === "parent-recent-payments" || widgetId === "student-payment-history") {
    return (
      <SectionCard title={title}>
        <PaymentTable
          payments={finance.payments
            .filter((item) =>
              parentInvoices.some((invoice) => invoice.id === item.invoiceId),
            )
            .slice(0, 3)}
        />
      </SectionCard>
    );
  }

  if (widgetId === "student-recent-receipt") {
    const receipts = finance.receipts.filter(
      (item) => item.invoiceId === studentInvoice?.id,
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
    const rows = assignments.assignments.slice(0, 5).map((item) => ({
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
          value: String(summary.needsReview),
          note: `${summary.reconciliationRate}% matched`,
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
          value: String(finance.invoices.filter((item) => item.status === "Overdue").length),
          note: "Require follow-up",
          icon: CalendarCheck,
        }}
      />
    );
  }

  if (widgetId === "admin-payment-methods") {
    const methods = [...new Set(finance.payments.map((item) => item.method))];
    return (
      <SectionCard title={title}>
        <div className="space-y-3 p-5">
          {methods.map((method) => (
            <div key={method} className="flex justify-between text-sm">
              <span>{method}</span>
              <b>
                {formatNaira(
                  finance.payments
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
    const balances = finance.invoices.reduce<Record<string, number>>(
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
                { label: "Manage announcements", href: "/admin/communications/announcements", icon: "announcement" },
                { label: "Record payment", href: "/admin/finance/payments", icon: "payment" },
              ]
            : role === "teacher"
              ? [{ label: "Take attendance", href: "/teacher/attendance", icon: "attendance" }]
              : [{ label: "View timetable", href: `/${role}/timetable`, icon: "timetable" }]
        }
      />
    );
  }

  if (widgetId === "parent-child-selector") {
    return (
      <Card className="p-4">
        <label className="flex flex-col gap-2 text-sm font-medium sm:flex-row sm:items-center">
          Viewing child
          <select className="h-10 rounded-[10px] border bg-surface px-3">
            {academics.students.map((student) => (
              <option key={student.id}>
                {student.firstName} {student.lastName}
                {academics.classes.find((item) => item.id === student.classId)
                  ? ` · ${academics.classes.find((item) => item.id === student.classId)?.displayName}`
                  : ""}
              </option>
            ))}
            {!academics.students.length && <option>No linked children</option>}
          </select>
        </label>
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
