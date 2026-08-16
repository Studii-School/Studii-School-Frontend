"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Eye, Plus, Upload, Users } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { getActiveClasses } from "@/features/academics/academics.selectors";
import { useAttendance } from "@/features/attendance/attendance-context";
import { useFinance } from "@/features/finance/finance-context";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { formatNaira } from "@/lib/currency";
import {
  studentAttendancePercentage,
  studentOutstandingBalance,
} from "./student-record";

export function AdminStudentsPage() {
  const { state: academics } = useAcademics();
  const { registers } = useAttendance();
  const { state: finance } = useFinance();
  const { settings } = useSchoolSettings();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [feeStatus, setFeeStatus] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");

  const classes = getActiveClasses(academics).filter((item) =>
    settings.schoolLevels.includes(item.level),
  );
  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const filterCount = [status, gender, feeStatus, attendanceStatus].filter(Boolean).length;

  const classCards = useMemo(
    () =>
      classes.map((schoolClass) => {
        const students = academics.students.filter((student) => student.classId === schoolClass.id);
        const feeSummary = students.reduce(
          (summary, student) => {
            const invoices = finance.invoices.filter((invoice) => invoice.studentId === student.id);
            const outstanding = invoices.reduce((sum, invoice) => sum + invoice.outstandingBalance, 0);
            const paid = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
            const charged = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);

            if (outstanding > 0) {
              summary.owing += 1;
              if (paid > 0) summary.partPaid += 1;
            } else if (charged > 0) {
              summary.paid += 1;
            }

            return summary;
          },
          { owing: 0, partPaid: 0, paid: 0 },
        );
        const attendanceAverage = students.length
          ? Math.round(students.reduce((sum, student) => sum + studentAttendancePercentage(student.id, registers), 0) / students.length)
          : 0;
        return { schoolClass, students, feeSummary, attendanceAverage };
      }),
    [academics.students, classes, finance, registers],
  );
  const primaryClassCards = classCards.filter((item) => item.schoolClass.level === "PRIMARY");
  const secondaryClassCards = classCards.filter((item) => item.schoolClass.level === "SECONDARY");

  const rows = useMemo(
    () =>
      academics.students
        .filter(
          (student) =>
            Boolean(student.id) &&
            Boolean(student.firstName?.trim()) &&
            Boolean(student.lastName?.trim()) &&
            Boolean(student.admissionNumber?.trim()) &&
            student.classId === selectedClassId,
        )
        .map((student) => {
          const schoolClass = academics.classes.find((item) => item.id === student.classId);
          const guardians = academics.guardians.filter((item) => student.guardianIds.includes(item.id));
          const attendance = studentAttendancePercentage(student.id, registers);
          const balance = studentOutstandingBalance(student.id, finance);
          const invoices = finance.invoices.filter((item) => item.studentId === student.id);
          const overdue = invoices.some((item) => item.status === "Overdue" && item.outstandingBalance > 0);
          const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
          return { student, schoolClass, guardians, attendance, balance, overdue, fullName };
        })
        .filter((row) => {
          const normalized = query.trim().replace(/\s+/g, " ").toLowerCase();
          const searchable = [
            row.student.firstName,
            row.student.middleName,
            row.student.lastName,
            row.fullName,
            row.student.admissionNumber,
            row.schoolClass?.displayName,
            row.student.guardianName,
            row.student.guardianPhone,
            row.student.guardianEmail,
            ...row.guardians.flatMap((item) => [item.fullName, item.phone, item.email]),
          ].filter(Boolean).join(" ").toLowerCase();
          const attendanceBand = row.attendance >= 90 ? "GOOD" : row.attendance >= 75 ? "WATCH" : "CONCERN";
          const feeBand = row.overdue ? "OVERDUE" : row.balance > 0 ? "OUTSTANDING" : "PAID";
          return (
            (!normalized || searchable.includes(normalized)) &&
            (!status || row.student.status === status) &&
            (!gender || row.student.gender === gender) &&
            (!feeStatus || feeBand === feeStatus) &&
            (!attendanceStatus || attendanceBand === attendanceStatus)
          );
        })
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [academics, attendanceStatus, feeStatus, finance, gender, query, registers, selectedClassId, status],
  );

  const clearFilters = () => {
    setStatus("");
    setGender("");
    setFeeStatus("");
    setAttendanceStatus("");
  };

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Link href="/admin/students/import" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold">
        <Upload size={16} />
        Import Students
      </Link>
      <Link href="/admin/students/new" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-[var(--school-primary)] px-4 text-sm font-semibold text-[var(--school-primary-foreground)]">
        <Plus size={16} />
        Add Student
      </Link>
    </div>
  );

  if (!selectedClass) {
    return (
      <div className="w-full min-w-0 max-w-full">
        <PageHeader title="Students" description="Choose a class to view and manage its students." action={actions} />
        <ClassCardSection title="Primary classes" items={primaryClassCards} onSelect={setSelectedClassId} />
        <ClassCardSection title="Secondary classes" items={secondaryClassCards} onSelect={setSelectedClassId} />
        {!classCards.length && <EmptyState title="No classes available" description="Create active classes before adding students." />}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <PageHeader
        title={selectedClass.displayName}
        description="Students in this class. Use the filters below to narrow the list."
        action={actions}
      />
      <Button className="mb-4" type="button" variant="outline" onClick={() => setSelectedClassId("")}>
        <ArrowLeft size={16} />
        Back to classes
      </Button>

      <div className="mb-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SearchInput className="min-w-0 xl:col-span-2" value={query} onChange={setQuery} placeholder="Search name, admission number or guardian" label="Search students" />
        <Select clearable label="Student status" value={status} onChange={setStatus} placeholder="All statuses" options={["ACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"].map((value) => ({ value, label: value.replace("_", " ") }))} />
        <Select clearable label="Gender" value={gender} onChange={setGender} placeholder="All genders" options={["Male", "Female"].map((value) => ({ value, label: value }))} />
        <Select clearable label="Fee status" value={feeStatus} onChange={setFeeStatus} placeholder="All fee statuses" options={[{ value: "PAID", label: "Paid" }, { value: "OUTSTANDING", label: "Outstanding" }, { value: "OVERDUE", label: "Overdue" }]} />
        <Select clearable label="Attendance status" value={attendanceStatus} onChange={setAttendanceStatus} placeholder="All attendance" options={[{ value: "GOOD", label: "Good (90%+)" }, { value: "WATCH", label: "Watch (75-89%)" }, { value: "CONCERN", label: "Concern (below 75%)" }]} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {query.trim() ? `${rows.length} student${rows.length === 1 ? "" : "s"} match "${query.trim()}"` : `${rows.length} student${rows.length === 1 ? "" : "s"} in ${selectedClass.displayName}`}
        </p>
        {filterCount > 0 && <Button type="button" variant="outline" onClick={clearFilters}>Clear Filters ({filterCount})</Button>}
      </div>

      <section className="min-w-0 max-w-full overflow-hidden rounded-xl border bg-surface">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-muted">
              <tr>{["Student", "Admission no.", "Guardian", "Phone", "Status", "Attendance", "Outstanding", "Actions"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.student.id}>
                  <td className="px-4 py-3"><Link href={`/admin/students/${row.student.id}`} className="font-semibold text-[var(--school-primary)] hover:underline">{row.fullName}</Link></td>
                  <td className="px-4 py-3">{row.student.admissionNumber}</td>
                  <td className="px-4 py-3">{row.student.guardianName}</td>
                  <td className="px-4 py-3">{row.student.guardianPhone}</td>
                  <td className="px-4 py-3"><Badge tone={row.student.status === "ACTIVE" ? "success" : "neutral"}>{row.student.status}</Badge></td>
                  <td className="px-4 py-3">{row.attendance}%</td>
                  <td className="px-4 py-3 font-medium">{formatNaira(row.balance)}</td>
                  <td className="px-4 py-3"><Link href={`/admin/students/${row.student.id}`} className="inline-flex items-center gap-1.5 font-semibold text-[var(--school-primary)]"><Eye size={15} />View Student</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <EmptyState title="No students found" description="Clear the search or filters and try again." />}
      </section>
    </div>
  );
}

function ClassCardSection({ title, items, onSelect }: { title: string; items: Array<{ schoolClass: ReturnType<typeof getActiveClasses>[number]; students: unknown[]; feeSummary: { owing: number; partPaid: number; paid: number }; attendanceAverage: number }>; onSelect: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ schoolClass, students, feeSummary, attendanceAverage }) => (
          <button key={schoolClass.id} type="button" onClick={() => onSelect(schoolClass.id)} className="min-h-40 rounded-[8px] border bg-surface p-4 text-left transition hover:border-[var(--school-primary)] hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{schoolClass.displayName}</h3>
                <p className="mt-1 text-xs text-muted">Capacity {schoolClass.capacity ?? "-"}</p>
              </div>
              <span className="rounded-[8px] bg-surface-muted p-2 text-[var(--school-primary)]"><Users size={18} /></span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-muted">Students</p><p className="font-bold">{students.length}</p></div>
              <div><p className="text-xs text-muted">Attendance</p><p className="font-bold">{attendanceAverage}%</p></div>
              <div><p className="text-xs text-muted">Owing</p><p className="font-bold">{feeSummary.owing}</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
              <span className="rounded-[8px] bg-surface-muted px-2.5 py-1">Part paid: <b className="text-foreground">{feeSummary.partPaid}</b></span>
              <span className="rounded-[8px] bg-surface-muted px-2.5 py-1">Paid: <b className="text-foreground">{feeSummary.paid}</b></span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
