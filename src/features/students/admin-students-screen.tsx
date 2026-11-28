"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Plus, School, SlidersHorizontal, Upload, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { CsvImportDialog } from "@/components/shared/csv-import-dialog";
import { Badge } from "@/components/ui/badge";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Avatar } from "@/components/ui/avatar";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TablePagination, usePaginatedRows } from "@/components/ui/table-pagination";
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
import { useSchoolUnderReview } from "@/features/school-review/school-review-context";
import { formatNaira } from "@/lib/currency";
import { downloadCsvFile } from "@/lib/csv-download";
import { STUDENT_IMPORT_TEMPLATE, STUDENT_IMPORT_TEMPLATE_FILENAME } from "@/lib/import-templates";
import { studentAttendancePercentage } from "./student-record";
import { StudentClassDialog } from "./student-class-dialog";

export function AdminStudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state: academics } = useAcademics();
  const { sessionRegisters } = useAttendance();
  const { allState: finance } = useFinance();
  const { settings } = useSchoolSettings();
  const underReview = useSchoolUnderReview();
  const { selectedSession, scope } = useAcademicPeriod();
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
  const [assigningStudent, setAssigningStudent] = useState<{ id: string; name: string } | null>(null);

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
  const attendancePeriod = useMemo(() => ({
    academicSessionId: selectedSession?.id,
    startDate: selectedSession?.startDate || settings.resumptionDate,
    endDate: selectedSession?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedSession),
    isCurrentPeriod: scope.isCurrentPeriod,
  }), [selectedSession, settings.resumptionDate, settings.closingDate, scope.isCurrentPeriod]);
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
          ? Math.round(students.reduce((sum, student) => sum + studentAttendancePercentage(student.id, periodRegisters, attendancePeriod, student.admissionDate), 0) / students.length)
          : 0;
        return { schoolClass, students, feeSummary, attendanceAverage };
      }),
    [academics.students, classes, finance.invoices, periodRegisters, attendancePeriod],
  );
  const primaryClassCards = classCards.filter((item) => item.schoolClass.level === "PRIMARY");
  const secondaryClassCards = classCards.filter((item) => item.schoolClass.level === "SECONDARY");
  const showingUnassignedStudents = selectedClassId === "__unassigned_students__";
  const showingAllStudents = selectedClassId === "__all_students__" || (!showingUnassignedStudents &&
    academics.students.length > 0 && !classes.length
  );
  const unassignedCount = academics.students.filter((student) => !student.classId).length;

  const rows = useMemo(
    () =>
      academics.students
        .filter(
          (student) =>
            Boolean(student.id) &&
            Boolean(student.firstName?.trim()) &&
            Boolean(student.lastName?.trim()) &&
            Boolean(student.admissionNumber?.trim()) &&
            (showingAllStudents || (showingUnassignedStudents ? !student.classId : student.classId === selectedClassId)),
        )
        .map((student) => {
          const schoolClass = academics.classes.find((item) => item.id === student.classId);
          const guardians = academics.guardians.filter((item) => student.guardianIds.includes(item.id));
          const attendance = studentAttendancePercentage(student.id, periodRegisters, attendancePeriod, student.admissionDate);
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
    [academics, attendanceStatus, feeStatus, finance.invoices, gender, periodRegisters, attendancePeriod, query, selectedClassId, selectedSession?.name, showingAllStudents, showingUnassignedStudents, status],
  );
  const pagination = usePaginatedRows(rows, `${selectedClassId}|${query}|${status}|${gender}|${feeStatus}|${attendanceStatus}`);

  const clearFilters = () => {
    setStatus("");
    setGender("");
    setFeeStatus("");
    setAttendanceStatus("");
  };

  const actions = (
    <>
      <Button className="min-h-9 gap-1.5 px-3" type="button" variant="outline" aria-label="Import enrolled students" disabled={underReview} title={underReview ? "Available after your school profile is approved" : undefined} onClick={() => setImportDialogOpen(true)}>
        <Upload size={16} />
        <span className="student-action-long">Import enrolled students</span>
        <span className="student-action-short">Import</span>
      </Button>
      {underReview ? <span aria-disabled="true" title="Available after your school profile is approved" className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 text-sm font-semibold text-muted"><Plus size={16} />Add enrolled student</span> : <Link href="/admin/students/new" aria-label="Add enrolled student" className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] bg-[var(--school-primary)] px-3 text-sm font-semibold text-[var(--school-primary-foreground)]">
        <Plus size={16} />
        <span className="student-action-long">Add enrolled student</span>
        <span className="student-action-short">Add</span>
      </Link>}
      {unassignedCount > 0 && <Button className="min-h-9 px-3" type="button" variant="outline" aria-label={`Awaiting placement (${unassignedCount})`} onClick={() => setSelectedClassId("__unassigned_students__")}><span className="student-action-long">Awaiting placement ({unassignedCount})</span><span className="student-action-short">Placement ({unassignedCount})</span></Button>}
    </>
  );

  if (!selectedClass && !showingAllStudents && !showingUnassignedStudents) {
    return (
      <div className="w-full min-w-0 max-w-full">
        <PageHeader title="Students" description="Manage learners who are already enrolled in the school." action={<div className="flex gap-1.5">{actions}<Button className="min-h-9 px-3" type="button" variant="outline" aria-label={`View all students (${academics.students.length})`} onClick={() => setSelectedClassId("__all_students__")}><span className="student-action-long">View all students ({academics.students.length})</span><span className="student-action-short">All ({academics.students.length})</span></Button></div>} />
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
        title={selectedClass?.displayName ?? (showingUnassignedStudents ? "Awaiting placement" : "All students")}
        description={showingUnassignedStudents ? `Students without a class in ${selectedSession?.name ?? "the selected session"}. Open a student to assign a class.` : showingAllStudents ? `Complete school roster, including students awaiting placement in ${selectedSession?.name ?? "the selected session"}.` : undefined}
        showBack={Boolean(selectedClassId)}
        backFallback="/admin/students"
        action={<div className="flex gap-1.5">{actions}{!showingAllStudents && <Button className="min-h-9 px-3" type="button" variant="outline" aria-label="View all students" onClick={() => setSelectedClassId("__all_students__")}><span className="student-action-long">View all students</span><span className="student-action-short">All</span></Button>}</div>}
      />
      {selectedClass && <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <p className="font-medium text-muted">Class owners:</p>
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
      <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
        <SearchInput className="w-full min-w-0 sm:w-auto sm:min-w-72 sm:max-w-lg sm:flex-1" value={query} onChange={setQuery} placeholder="Search name, admission number or guardian" label="Search students" />
        <details className="group relative shrink-0">
          <summary className="table-filter-summary flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border bg-surface px-3 text-sm font-medium hover:bg-[var(--school-secondary-soft)]">
            <SlidersHorizontal size={16} className="text-[var(--school-secondary-ink)]" /> Filters{filterCount > 0 ? ` (${filterCount})` : ""} <ChevronDown className="text-[var(--school-accent-ink)] transition-transform group-open:rotate-180" size={15} />
          </summary>
          <div className="absolute left-0 top-full z-30 mt-2 w-[min(90vw,42rem)] rounded-xl border bg-surface p-4 shadow-xl sm:left-auto sm:right-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select clearable label="Student status" value={status} onChange={setStatus} placeholder="All statuses" options={["ACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"].map((value) => ({ value, label: value.replace("_", " ") }))} />
              <Select clearable label="Gender" value={gender} onChange={setGender} placeholder="All genders" options={["Male", "Female"].map((value) => ({ value, label: value }))} />
              <Select clearable label="Fee status (all terms)" value={feeStatus} onChange={setFeeStatus} placeholder="All fee statuses" options={[{ value: "PAID", label: "Paid" }, { value: "OUTSTANDING", label: "Outstanding" }, { value: "OVERDUE", label: "Overdue" }]} />
              <Select clearable label="Attendance status" value={attendanceStatus} onChange={setAttendanceStatus} placeholder="All attendance" options={[{ value: "GOOD", label: "Good (90%+)" }, { value: "WATCH", label: "Watch (75-89%)" }, { value: "CONCERN", label: "Concern (below 75%)" }]} />
            </div>
            {filterCount > 0 && <Button className="mt-3" type="button" variant="outline" onClick={clearFilters}>Clear filters</Button>}
          </div>
        </details>
        <p className="ml-auto text-sm text-muted">
          {query.trim() ? `${rows.length} student${rows.length === 1 ? "" : "s"} match "${query.trim()}"` : showingUnassignedStudents ? `${rows.length} student${rows.length === 1 ? "" : "s"} awaiting placement` : showingAllStudents ? `${rows.length} student${rows.length === 1 ? "" : "s"} in the school roster` : `${rows.length} student${rows.length === 1 ? "" : "s"} in ${selectedClass?.displayName}`}
        </p>
      </div>

      <section className="min-w-0 max-w-full overflow-x-auto bg-surface">
        <div className="w-full min-w-0">
          <table className="student-directory-table w-full min-w-[1280px] table-fixed text-left text-xs sm:text-sm">
            <colgroup>
              <col className="w-[3%]" />
              <col className={showingAllStudents ? "w-[20%]" : "w-[24%]"} />
              <col className={showingAllStudents ? "w-[14%]" : "w-[16%]"} />
              {showingAllStudents && <col className="w-[12%]" />}
              <col className="w-[14%]" />
              <col className={showingAllStudents ? "w-[11%]" : "w-[12%]"} />
              <col className={showingAllStudents ? "w-[8%]" : "w-[9%]"} />
              <col className={showingAllStudents ? "w-[8%]" : "w-[9%]"} />
              <col className={showingAllStudents ? "w-[10%]" : "w-[13%]"} />
            </colgroup>
            <thead className="bg-surface-muted text-xs uppercase text-muted">
              <tr><th className="whitespace-nowrap px-3 py-3">#</th>{["Student", "Admission no.", ...(showingAllStudents ? ["Class / placement"] : []), "Guardian", "Phone", "Status", "Attendance", "Outstanding"].map((item) => <th key={item} className="whitespace-nowrap px-4 py-3">{item}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {pagination.rows.map((row, index) => (
                <ClickableTableRow key={row.student.id} href={`/admin/students/${row.student.id}`} label={row.fullName}>
                  <td className="whitespace-nowrap px-3 py-4 align-middle text-muted">{pagination.start + index + 1}</td>
                  <td className="px-4 py-4 align-middle"><div className="flex min-w-0 items-center gap-3"><Avatar initials={`${row.student.firstName[0] ?? ""}${row.student.lastName[0] ?? ""}`} src={row.student.photoUrl} alt={`${row.fullName} profile`} /><div className="min-w-0"><Link href={`/admin/students/${row.student.id}`} className="block whitespace-normal break-words font-semibold leading-snug text-[var(--school-primary)] hover:underline">{row.fullName}</Link>{showingUnassignedStudents && <Button type="button" variant="outline" className="mt-2 min-h-8 gap-1.5 px-2 text-xs" onClick={() => setAssigningStudent({ id: row.student.id, name: row.fullName })}><School size={14} />Assign class</Button>}</div></div></td>
                  <td className="whitespace-nowrap px-4 py-4 align-middle">{row.student.admissionNumber}</td>
                  {showingAllStudents && <td className="whitespace-normal px-4 py-4 align-middle">{row.classLabel}</td>}
                  <td className="whitespace-normal break-words px-4 py-4 align-middle"><PersonNameLink kind="guardian" id={row.guardians.find((item) => item.fullName === row.student.guardianName)?.id}>{row.student.guardianName}</PersonNameLink></td>
                  <td className="whitespace-nowrap px-4 py-4 align-middle">{row.student.guardianPhone}</td>
                  <td className="whitespace-nowrap px-4 py-4 align-middle"><Badge tone={row.student.status === "ACTIVE" ? "success" : "neutral"}>{row.student.status}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-4 align-middle">{row.attendance}%</td>
                  <td className="whitespace-nowrap px-4 py-4 align-middle font-medium">{formatNaira(row.balance)}</td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination label="Students" total={pagination.total} page={pagination.page} pageCount={pagination.pageCount} pageSize={pagination.pageSize} start={pagination.start} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
        {!rows.length && <EmptyState title="No students found" description="Clear the search or filters and try again." />}
      </section>
      {assigningStudent && <StudentClassDialog studentId={assigningStudent.id} studentName={assigningStudent.name} currentClassId="" onClose={() => setAssigningStudent(null)} />}
    </div>
  );
}

function ClassCardSection({ title, items, onSelect }: { title: string; items: Array<{ schoolClass: ReturnType<typeof getActiveClasses>[number]; students: unknown[]; feeSummary: { owing: number; partPaid: number; paid: number }; attendanceAverage: number }>; onSelect: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ schoolClass, students, feeSummary, attendanceAverage }, index) => (
          <button key={schoolClass.id} type="button" onClick={() => onSelect(schoolClass.id)} className="min-h-40 rounded-[8px] border bg-surface p-4 text-left transition hover:border-[var(--school-primary)] hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{schoolClass.displayName}</h3>
                <p className="mt-1 text-xs text-muted">Capacity {schoolClass.capacity ?? "-"}</p>
              </div>
              <BrandIcon tone={(["primary", "secondary", "accent"] as const)[index % 3]} className="size-10"><Users size={18} /></BrandIcon>
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
