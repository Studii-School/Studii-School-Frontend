"use client";

import { useCallback, useMemo, useState } from "react";
import { Eye, Plus, Upload, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { CsvImportDialog } from "@/components/shared/csv-import-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { getActiveClasses } from "@/features/academics/academics.selectors";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { PersonNameLink } from "@/features/people/person-name-link";
import { useAttendance } from "@/features/attendance/attendance-context";
import { useFinance } from "@/features/finance/finance-context";
import { billableInvoices } from "@/features/finance/finance-scope";

import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { formatNaira } from "@/lib/currency";
import { downloadCsvFile } from "@/lib/csv-download";
import { STUDENT_IMPORT_TEMPLATE, STUDENT_IMPORT_TEMPLATE_FILENAME } from "@/lib/import-templates";
import { studentAttendancePercentage } from "./student-record";

export function AdminStudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state: academics } = useAcademics();
  const { sessionRegisters } = useAttendance();
  const { allState: finance } = useFinance();
  const { settings } = useSchoolSettings();
  const { selectedSession } = useAcademicPeriod();
  const selectedClassId = searchParams.get("class") ?? "";
  const setSelectedClassId = useCallback((classId: string) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    if (classId) nextSearchParams.set("class", classId);
    else nextSearchParams.delete("class");
    const query = nextSearchParams.toString();
    router.push(query ? `/admin/students?${query}` : "/admin/students");
  }, [router, searchParams]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [feeStatus, setFeeStatus] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const classes = getActiveClasses(academics).filter((item) =>
    settings.schoolLevels.includes(item.level),
  );
  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const classOwnerAssignments = academics.teacherAssignments
    .filter((item) => item.classId === selectedClassId && item.assignmentType === "CLASS_TEACHER" && !item.isRemoved)
    .sort((a, b) => Number(a.assignmentRole === "CO") - Number(b.assignmentRole === "CO"));
  const classOwnerIds = [...new Set([
    ...classOwnerAssignments.map((item) => item.teacherUserId),
    ...(selectedClass?.classTeacherUserId ? [selectedClass.classTeacherUserId] : []),
  ])];
  const classOwners = classOwnerIds.map((userId) => {
    const teacher = academics.teachers.find((item) => item.userId === userId);
    const staff = academics.staff.find((item) => item.userId === userId);
    return {
      userId,
      name: teacher ? `${teacher.firstName} ${teacher.lastName}` : staff?.fullName ?? "",
      role: classOwnerAssignments.find((item) => item.teacherUserId === userId)?.assignmentRole === "CO" ? "Co-owner" : "Class owner",
    };
  }).filter((owner) => owner.name);
  const filterCount = [status, gender, feeStatus, attendanceStatus].filter(Boolean).length;
  const attendancePeriod = {
    academicSessionId: selectedSession?.id,
    startDate: selectedSession?.startDate || settings.resumptionDate,
    endDate: selectedSession?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedSession),
  };
  const periodRegisters = sessionRegisters;

  const classCards = useMemo(
    () =>
      classes.map((schoolClass) => {
        const students = academics.students.filter((student) => student.classId === schoolClass.id);
        const feeSummary = students.reduce(
          (summary, student) => {
            const invoices = billableInvoices(finance.invoices).filter((invoice) => invoice.studentId === student.id);
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
          ? Math.round(students.reduce((sum, student) => sum + studentAttendancePercentage(student.id, periodRegisters, attendancePeriod), 0) / students.length)
          : 0;
        return { schoolClass, students, feeSummary, attendanceAverage };
      }),
    [academics.students, classes, finance.invoices, periodRegisters, attendancePeriod],
  );
  const primaryClassCards = classCards.filter((item) => item.schoolClass.level === "PRIMARY");
  const secondaryClassCards = classCards.filter((item) => item.schoolClass.level === "SECONDARY");
  const showingAllStudents = selectedClassId === "__all_students__" || (
    academics.students.length > 0 && !classes.length
  );

  const rows = useMemo(
    () =>
      academics.students
        .filter(
          (student) =>
            Boolean(student.id) &&
            Boolean(student.firstName?.trim()) &&
            Boolean(student.lastName?.trim()) &&
            Boolean(student.admissionNumber?.trim()) &&
            (showingAllStudents || student.classId === selectedClassId),
        )
        .map((student) => {
          const schoolClass = academics.classes.find((item) => item.id === student.classId);
          const guardians = academics.guardians.filter((item) => student.guardianIds.includes(item.id));
          const attendance = studentAttendancePercentage(student.id, periodRegisters, attendancePeriod);
          const periodInvoices = billableInvoices(finance.invoices);
          const balance = periodInvoices
            .filter((item) => item.studentId === student.id)
            .reduce((sum, item) => sum + item.outstandingBalance, 0);
          const invoices = periodInvoices.filter((item) => item.studentId === student.id);
          const overdue = invoices.some((item) => item.status === "Overdue" && item.outstandingBalance > 0);
          const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
          const classLabel = schoolClass?.displayName ?? (showingAllStudents && !student.classId ? `Awaiting placement in ${selectedSession?.name ?? "selected session"}` : "—");
          return { student, schoolClass, classLabel, guardians, attendance, balance, overdue, fullName, hasInvoice: invoices.length > 0 };
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
          const feeBand = !row.hasInvoice ? "NOT_INVOICED" : row.overdue ? "OVERDUE" : row.balance > 0 ? "OUTSTANDING" : "PAID";
          return (
            (!normalized || searchable.includes(normalized)) &&
            (!status || row.student.status === status) &&
            (!gender || row.student.gender === gender) &&
            (!feeStatus || feeBand === feeStatus) &&
            (!attendanceStatus || attendanceBand === attendanceStatus)
          );
        })
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [academics, attendanceStatus, feeStatus, finance.invoices, gender, periodRegisters, attendancePeriod, query, selectedClassId, selectedSession?.name, showingAllStudents, status],
  );

  const clearFilters = () => {
    setStatus("");
    setGender("");
    setFeeStatus("");
    setAttendanceStatus("");
  };

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={() => setImportDialogOpen(true)}>
        <Upload size={16} />
        Import enrolled students
      </Button>
      <Link href="/admin/students/new" className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-[var(--school-primary)] px-4 text-sm font-semibold text-[var(--school-primary-foreground)]">
        <Plus size={16} />
        Add enrolled student
      </Link>
    </div>
  );

  if (!selectedClass && !showingAllStudents) {
    return (
      <div className="w-full min-w-0 max-w-full">
        <PageHeader title="Students" description="Manage learners who are already enrolled in the school." action={<div className="flex flex-wrap gap-2">{actions}<Button type="button" variant="outline" onClick={() => setSelectedClassId("__all_students__")}>View all students ({academics.students.length})</Button></div>} />
        <CsvImportDialog
          open={importDialogOpen}
          title="Import enrolled students"
          description="Download the CSV template to prepare student records, or continue with a completed CSV file."
          onClose={() => setImportDialogOpen(false)}
          onDownloadTemplate={() => downloadCsvFile(STUDENT_IMPORT_TEMPLATE_FILENAME, STUDENT_IMPORT_TEMPLATE)}
          onUpload={() => router.push("/admin/students/import")}
          uploadLabel="Choose completed CSV"
        />
        <ClassCardSection title="Primary classes" items={primaryClassCards} onSelect={setSelectedClassId} />
        <ClassCardSection title="Secondary classes" items={secondaryClassCards} onSelect={setSelectedClassId} />
        {!classCards.length && <EmptyState title="No classes available" description="Create active classes before adding students." />}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <PageHeader
        title={selectedClass?.displayName ?? "All students"}
        description={showingAllStudents ? `Complete school roster, including students awaiting placement in ${selectedSession?.name ?? "the selected session"}.` : "Students in this class. Use the filters below to narrow the list."}
        showBack={Boolean(selectedClassId)}
        backFallback="/admin/students"
        onBack={() => setSelectedClassId("")}
        action={<div className="flex flex-wrap gap-2">{actions}{!showingAllStudents && <Button type="button" variant="outline" onClick={() => setSelectedClassId("__all_students__")}>View all students</Button>}</div>}
      />
      {selectedClass && <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-surface p-4">
        <p className="text-sm font-semibold">Class owners</p>
        {classOwners.length ? classOwners.map((owner) => <div key={owner.userId} className="flex items-center gap-2 text-sm">
          <span className="text-muted">{owner.role}:</span>
          <Link href={`/admin/staff/${encodeURIComponent(owner.userId)}`} className="font-semibold text-[var(--school-primary)] hover:underline">{owner.name}</Link>
        </div>) : <p className="text-sm text-muted">No class owner assigned</p>}
      </div>}
      <CsvImportDialog
        open={importDialogOpen}
        title="Import enrolled students"
        description="Download the CSV template to prepare student records, or continue with a completed CSV file."
        onClose={() => setImportDialogOpen(false)}
        onDownloadTemplate={() => downloadCsvFile(STUDENT_IMPORT_TEMPLATE_FILENAME, STUDENT_IMPORT_TEMPLATE)}
        onUpload={() => router.push("/admin/students/import")}
        uploadLabel="Choose completed CSV"
      />
      <div className="mb-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SearchInput className="min-w-0 xl:col-span-2" value={query} onChange={setQuery} placeholder="Search name, admission number or guardian" label="Search students" />
        <Select clearable label="Student status" value={status} onChange={setStatus} placeholder="All statuses" options={["ACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"].map((value) => ({ value, label: value.replace("_", " ") }))} />
        <Select clearable label="Gender" value={gender} onChange={setGender} placeholder="All genders" options={["Male", "Female"].map((value) => ({ value, label: value }))} />
        <Select clearable label="Fee status (all terms)" value={feeStatus} onChange={setFeeStatus} placeholder="All fee statuses" options={[{ value: "PAID", label: "Paid" }, { value: "OUTSTANDING", label: "Outstanding" }, { value: "OVERDUE", label: "Overdue" }]} />
        <Select clearable label="Attendance status" value={attendanceStatus} onChange={setAttendanceStatus} placeholder="All attendance" options={[{ value: "GOOD", label: "Good (90%+)" }, { value: "WATCH", label: "Watch (75-89%)" }, { value: "CONCERN", label: "Concern (below 75%)" }]} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {query.trim() ? `${rows.length} student${rows.length === 1 ? "" : "s"} match "${query.trim()}"` : showingAllStudents ? `${rows.length} student${rows.length === 1 ? "" : "s"} in the school roster` : `${rows.length} student${rows.length === 1 ? "" : "s"} in ${selectedClass?.displayName}`}
        </p>
        {filterCount > 0 && <Button type="button" variant="outline" onClick={clearFilters}>Clear Filters ({filterCount})</Button>}
      </div>

      <section className="min-w-0 max-w-full overflow-x-auto rounded-xl border bg-surface">
        <div className="w-full min-w-0">
          <table className="student-directory-table w-full min-w-[1280px] table-fixed text-left text-xs sm:text-sm">
            <colgroup>
              <col className="w-[3%]" /><col className="w-[24%]" /><col className="w-[16%]" /><col className="w-[14%]" />
              <col className="w-[12%]" /><col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[8%]" /><col className="w-[5%]" />
            </colgroup>
            <thead className="bg-surface-muted text-xs uppercase text-muted">
              <tr><th className="whitespace-nowrap px-3 py-3">#</th>{["Student", "Admission no.", ...(showingAllStudents ? ["Class / placement"] : []), "Guardian", "Phone", "Status", "Attendance", "Outstanding", "Actions"].map((item) => <th key={item} className="whitespace-nowrap px-4 py-3">{item}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, index) => (
                <ClickableTableRow key={row.student.id} href={`/admin/students/${row.student.id}`} label={row.fullName}>
                  <td className="whitespace-nowrap px-3 py-4 align-middle text-muted">{index + 1}</td>
                  <td className="px-4 py-4 align-middle"><div className="flex min-w-0 items-center gap-3"><Avatar initials={`${row.student.firstName[0] ?? ""}${row.student.lastName[0] ?? ""}`} src={row.student.photoUrl} alt={`${row.fullName} profile`} /><Link href={`/admin/students/${row.student.id}`} className="min-w-0 whitespace-normal break-words font-semibold leading-snug text-[var(--school-primary)] hover:underline">{row.fullName}</Link></div></td>
                  <td className="whitespace-nowrap px-4 py-4 align-middle">{row.student.admissionNumber}</td>
                  {showingAllStudents && <td className="whitespace-normal px-4 py-4 align-middle">{row.classLabel}</td>}
                  <td className="whitespace-normal break-words px-4 py-4 align-middle"><PersonNameLink kind="guardian" id={row.guardians.find((item) => item.fullName === row.student.guardianName)?.id}>{row.student.guardianName}</PersonNameLink></td>
                  <td className="whitespace-nowrap px-4 py-4 align-middle">{row.student.guardianPhone}</td>
                  <td className="whitespace-nowrap px-4 py-4 align-middle"><Badge tone={row.student.status === "ACTIVE" ? "success" : "neutral"}>{row.student.status}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-4 align-middle">{row.attendance}%</td>
                  <td className="whitespace-nowrap px-4 py-4 align-middle font-medium">{formatNaira(row.balance)}</td>
                  <td className="whitespace-nowrap px-4 py-4 align-middle"><Link href={`/admin/students/${row.student.id}`} className="inline-flex items-center gap-1 font-semibold text-[var(--school-primary)]"><Eye size={15} />View</Link></td>
                </ClickableTableRow>
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
