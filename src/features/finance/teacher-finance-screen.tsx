"use client";

import { AlertTriangle, CheckCircle2, CircleDollarSign, Clock3, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAcademics } from "@/features/academics/academics-context";
import { getClassTeacherStudentsForTeacher } from "@/features/academics/academics.selectors";
import { PinToDashboardButton } from "@/features/dashboard-customisation/pin-to-dashboard-button";
import { apiRequest } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
import { useFinance } from "./finance-context";
import { financePermissions } from "./finance.defaults";

function paymentStatus(invoices: Array<{ amountPaid: number; outstandingBalance: number }>) {
  if (!invoices.length) return "No invoice";
  if (invoices.every((invoice) => invoice.outstandingBalance <= 0)) return "Paid in full";
  if (invoices.some((invoice) => invoice.amountPaid > 0)) return "Part payment";
  return "Not paid";
}

function statusTone(status: string) {
  if (status === "Paid in full") return "success";
  if (status === "Part payment") return "warning";
  if (status === "Not paid") return "danger";
  return "neutral";
}

type TeacherFinanceStudentStatus = {
  studentId: string;
  studentName: string;
  classId?: string | null;
  className: string;
  status: string;
};

type TeacherFinanceEntry = {
  id: string;
  type: "SALARY" | "FINE" | "REQUIRED_PAYMENT";
  title: string;
  amount: number;
  status: "BEING_PAID" | "PAID" | "PENDING" | "YET_TO_BE_PAID";
  dueDate?: string | null;
  paidAt?: string | null;
  note?: string | null;
};

function teacherEntryStatusLabel(status: TeacherFinanceEntry["status"]) {
  if (status === "BEING_PAID") return "Being paid";
  if (status === "PAID") return "Paid";
  if (status === "PENDING") return "Pending";
  return "Yet to be paid";
}

function teacherEntryTone(status: TeacherFinanceEntry["status"]) {
  if (status === "BEING_PAID" || status === "PAID") return "success";
  if (status === "PENDING") return "warning";
  return "danger";
}

export function TeacherFinanceScreen() {
  const allowed = financePermissions.teacher.includes("finance.class-summary.read");
  const { state: academics } = useAcademics();
  const { state: finance } = useFinance();
  const [backendRows, setBackendRows] = useState<TeacherFinanceStudentStatus[]>();
  const [teacherEntries, setTeacherEntries] = useState<TeacherFinanceEntry[]>();
  const user = readStoredUser();
  const students = getClassTeacherStudentsForTeacher(academics, user?.id ?? "");
  useEffect(() => {
    void Promise.allSettled([
      apiRequest<{ entries: TeacherFinanceEntry[] }>("/finance/teacher"),
      apiRequest<{ students: TeacherFinanceStudentStatus[] }>("/finance/teacher/student-status"),
    ]).then(([financeResult, studentResult]) => {
      setTeacherEntries(financeResult.status === "fulfilled" ? financeResult.value.entries : undefined);
      setBackendRows(studentResult.status === "fulfilled" ? studentResult.value.students : undefined);
    });
  }, []);
  const localRows = students.map((student) => {
    const invoices = finance.invoices.filter((invoice) => invoice.studentId === student.id && !["Cancelled", "Waived"].includes(invoice.status));
    const schoolClass = academics.classes.find((item) => item.id === student.classId);
    return {
      studentId: student.id,
      studentName: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
      className: schoolClass?.displayName ?? "Unassigned",
      status: paymentStatus(invoices),
    };
  });
  const studentRows = backendRows ?? localRows;
  const paid = studentRows.filter((student) => student.status === "Paid in full").length;
  const partial = studentRows.filter((student) => student.status === "Part payment").length;
  const unpaid = studentRows.filter((student) => student.status === "Not paid").length;
  const salaryEntry = teacherEntries?.find((entry) => entry.type === "SALARY");
  const financeCards: TeacherFinanceEntry[] = [
    salaryEntry ?? { id: "salary-placeholder", type: "SALARY", title: "Salary", amount: 0, status: "YET_TO_BE_PAID" },
    ...(teacherEntries ?? []).filter((entry) => entry.type !== "SALARY"),
  ];

  if (!allowed) {
    return <div className="rounded-xl border p-8 text-center"><ShieldCheck className="mx-auto text-muted" /><p className="mt-3 font-semibold">Finance class summaries are not enabled</p></div>;
  }

  return (
    <>
      <PageHeader title="Finance" description="Your salary, fines, required payments, and class-teacher fee status." />
      <div className="grid gap-4 sm:grid-cols-2">
        {financeCards.map((entry) => (
          <Card key={entry.id} className="p-5">
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-sm text-muted">{entry.type === "SALARY" ? "Salary" : entry.type === "FINE" ? "Fine" : "Required payment"}</p>
                <p className="mt-2 text-xl font-bold">{entry.title}</p>
                <p className="mt-1 text-sm text-muted">{entry.amount ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(entry.amount) : "No amount set"}</p>
              </div>
              {entry.type === "SALARY" ? <WalletCards className="text-success" size={22} /> : <AlertTriangle className="text-warning" size={22} />}
            </div>
            <Badge tone={teacherEntryTone(entry.status)}>{teacherEntryStatusLabel(entry.status)}</Badge>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><div className="flex justify-between"><div><p className="text-sm text-muted">Paid in full</p><p className="mt-2 text-2xl font-bold">{paid}</p></div><CheckCircle2 className="text-success" size={20} /></div><div className="mt-4"><PinToDashboardButton role="teacher" widgetId="teacher-activity-fees" /></div></Card>
        <Card className="p-5"><div className="flex justify-between"><div><p className="text-sm text-muted">Part payment</p><p className="mt-2 text-2xl font-bold">{partial}</p></div><Clock3 className="text-warning" size={20} /></div></Card>
        <Card className="p-5"><div className="flex justify-between"><div><p className="text-sm text-muted">Not paid</p><p className="mt-2 text-2xl font-bold">{unpaid}</p></div><CircleDollarSign className="text-danger" size={20} /></div><div className="mt-4"><PinToDashboardButton role="teacher" widgetId="teacher-clearance" /></div></Card>
      </div>
      <SectionCard title="Class-teacher student fee status" description="Only students in classes where you are class teacher are shown. Amounts, references and payer details are hidden.">
        <div className="divide-y px-5">
          {studentRows.length ? studentRows.map((student) => (
            <div key={student.studentId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span><b>{student.studentName}</b><p className="text-xs text-muted">{student.className}</p></span>
              <Badge tone={statusTone(student.status)}>{student.status}</Badge>
            </div>
          )) : <EmptyState title="No assigned students" description="Students appear here only for classes where you are the class teacher." />}
        </div>
      </SectionCard>
    </>
  );
}


