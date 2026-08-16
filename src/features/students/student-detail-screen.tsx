"use client";

import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Download,
  Pencil,
  Printer,
  Upload,
  X,
} from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import type { StudentStatus } from "@/features/academics/academics.types";
import { useAssignments } from "@/features/assignments/assignments-context";
import { useAttendance } from "@/features/attendance/attendance-context";
import { useFinance } from "@/features/finance/finance-context";
import { formatNaira } from "@/lib/currency";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { buildStudentCompleteRecord } from "./student-record";

const tabs = [
  "Overview",
  "Academics",
  "Assignments",
  "Attendance",
  "Finance",
  "Parents",
  "Documents",
  "Activity",
] as const;
type Tab = (typeof tabs)[number];

const subjectName = (id: string) =>
  id
    .replace(/^subject-/, "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const displayDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : "Not provided";

function MoveClassDialog({
  studentId,
  currentClassId,
  onClose,
}: {
  studentId: string;
  currentClassId: string;
  onClose: () => void;
}) {
  const { state, moveStudentToClass } = useAcademics();
  const { toast } = useActionFeedback();
  const [classId, setClassId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const current = state.classes.find((item) => item.id === currentClassId);

  const save = async () => {
    if (!classId || !reason.trim()) {
      toast("Select a class and enter a reason.", "error");
      return;
    }
    setSaving(true);
    try {
      await moveStudentToClass({
        studentId,
        classId,
        effectiveDate,
        reason,
      });
      const target = state.classes.find((item) => item.id === classId);
      toast(`Student moved to ${target?.displayName ?? "the new class"}.`, "success");
      onClose();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Student could not be moved.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-student-title"
        className="w-full max-w-lg rounded-2xl bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="move-student-title" className="text-lg font-bold">
              Move Class
            </h2>
            <p className="mt-1 text-sm text-muted">
              Current class: {current?.displayName ?? "Unassigned"}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">
            New class
            <Select
              className="mt-2"
              searchable
              label="New class"
              value={classId}
              onChange={setClassId}
              placeholder="Select a class"
              options={state.classes
                .filter(
                  (item) =>
                    item.status === "ACTIVE" && item.id !== currentClassId,
                )
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((item) => ({
                  value: item.id,
                  label: item.displayName,
                }))}
            />
          </label>
          <label className="text-sm font-medium">
            Effective date
            <Input
              className="mt-2"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Reason
            <Input
              className="mt-2"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for moving this student"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Moving student..." : "Move Student"}
          </Button>
        </div>
      </section>
    </div>
  );
}

export function StudentDetailPage({ studentId }: { studentId: string }) {
  const { state: academics, isLoading, updateStudentStatus, addStudentDocument, removeStudentDocument, assignStudentParents } =
    useAcademics();
  const { state: assignments } = useAssignments();
  const { registers } = useAttendance();
  const { state: finance } = useFinance();
  const { settings } = useSchoolSettings();
  const { confirm, toast } = useActionFeedback();
  const [tab, setTab] = useState<Tab>("Overview");
  const [showMove, setShowMove] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const record = buildStudentCompleteRecord(
    studentId,
    academics,
    assignments,
    registers,
    finance,
  );

  const totals = useMemo(() => {
    if (!record) return { charged: 0, paid: 0, outstanding: 0, overdue: 0 };
    return {
      charged: record.invoices.reduce((sum, item) => sum + item.totalAmount, 0),
      paid: record.invoices.reduce((sum, item) => sum + item.amountPaid, 0),
      outstanding: record.invoices.reduce(
        (sum, item) => sum + item.outstandingBalance,
        0,
      ),
      overdue: record.invoices
        .filter((item) => item.status === "Overdue")
        .reduce((sum, item) => sum + item.outstandingBalance, 0),
    };
  }, [record]);

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted">Loading student record...</div>;
  }

  if (!record) {
    return (
      <EmptyState
        title="Student not found"
        description="The student record may be unavailable."
      />
    );
  }
  const { student } = record;
  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
  const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`;
  const completedAssignments = record.assignments.filter(
    (item) =>
      item.submission &&
      ["SUBMITTED", "LATE", "GRADED"].includes(item.submission.status),
  ).length;
  const scored = record.assignments
    .map((item) => item.submission?.score)
    .filter((item): item is number => typeof item === "number");
  const average = scored.length
    ? Math.round(scored.reduce((sum, item) => sum + item, 0) / scored.length)
    : 0;

  const changeStatus = (status: StudentStatus) =>
    confirm({
      title: `Change student status to ${status.toLowerCase()}?`,
      description:
        "The student record and all historical school records will be preserved.",
      confirmLabel: "Change Status",
      destructive: status !== "ACTIVE",
      onConfirm: async () => {
        await updateStudentStatus(student.id, status);
        toast("Student status updated.", "success");
      },
    });

  const removeParent = (guardianId: string, name: string) =>
    confirm({
      title: `Remove ${name}?`,
      description:
        "This unlinks the parent from this student. The parent login account is not deleted.",
      confirmLabel: "Remove Parent",
      destructive: true,
      onConfirm: async () => {
        const nextParentIds = student.guardianIds.filter((id) => id !== guardianId);
        if (nextParentIds.length > 2) {
          toast("A student can have a maximum of two parents.", "error");
          return;
        }
        await assignStudentParents(
          student.id,
          nextParentIds,
        );
        toast("Parent removed from this student.", "success");
      },
    });

  const uploadDocument = (file?: File) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast("Document must be smaller than 3MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await addStudentDocument(student.id, {
        name: file.name,
        type: file.type || "Document",
        dataUrl: typeof reader.result === "string" ? reader.result : undefined,
        uploadedBy: "Admin",
      });
      toast("Document added.", "success");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full min-w-0 max-w-full">
      <PageHeader
        title={fullName}
        description={`${student.admissionNumber} · ${record.currentClass?.displayName ?? "No class"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/students/${student.id}/edit`}
              className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold"
            >
              <Pencil size={15} />
              Edit Student
            </Link>
            <Button type="button" variant="outline" onClick={() => setShowMove(true)}>
              <ArrowRightLeft size={15} />
              Move Class
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer size={15} />
              Print Student Record
            </Button>
          </div>
        }
      />

      <Card className="mb-5 min-w-0 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-primary-light text-xl font-bold text-[var(--school-primary)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-xl font-bold">{fullName}</h2>
              <Badge tone={student.status === "ACTIVE" ? "success" : "neutral"}>
                {student.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              {record.currentClass?.displayName ?? "No class"} ·{" "}
              {student.schoolLevel === "PRIMARY" ? "Primary School" : "Secondary School"} ·{" "}
              {settings.currentAcademicSession} · {settings.currentTerm}
            </p>
          </div>
          <Select
            className="w-full sm:max-w-52"
            label="More student actions"
            value=""
            onChange={(value) => changeStatus(value as StudentStatus)}
            placeholder="More Actions"
            options={[
              { value: "ACTIVE", label: "Mark Active" },
              { value: "INACTIVE", label: "Mark Inactive" },
              { value: "WITHDRAWN", label: "Withdraw Student" },
              { value: "GRADUATED", label: "Graduate Student" },
              { value: "SUSPENDED", label: "Suspend Student" },
            ]}
          />
        </div>
      </Card>

      <div className="mb-5 max-w-full overflow-x-auto">
        <div className="flex min-w-max gap-2 border-b">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              className={`border-b-2 px-3 py-3 text-sm font-medium ${
                tab === item
                  ? "border-[var(--school-primary)] text-[var(--school-primary)]"
                  : "border-transparent text-muted"
              }`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {tab === "Overview" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ["Attendance", `${record.attendanceSummary.percentage}%`],
              ["Average score", scored.length ? `${average}%` : "No scores"],
              [
                "Assignments",
                `${completedAssignments}/${record.assignments.length}`,
              ],
              ["Outstanding", formatNaira(totals.outstanding)],
              ["Class position", "Not available"],
              ["Conduct", "No concerns"],
            ].map(([label, value]) => (
              <Card key={label} className="p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 break-words text-lg font-bold">{value}</p>
              </Card>
            ))}
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <InfoSection
              title="Personal Information"
              rows={[
                ["Full name", fullName],
                ["Admission number", student.admissionNumber],
                ["Student email", student.email ?? "Not provided"],
                ["Date of birth", displayDate(student.dateOfBirth)],
                ["Gender", student.gender ?? "Not provided"],
                ["Admission date", displayDate(student.admissionDate)],
                ["Nationality", student.nationality ?? "Not provided"],
                ["Address", student.address ?? "Not provided"],
                ["Emergency contact", student.emergencyContactName ?? "Not provided"],
              ]}
            />
            <InfoSection
              title="Recent School Activity"
              rows={record.activities.slice(0, 6).map((item) => [
                item.action,
                `${item.detail} · ${new Date(item.createdAt).toLocaleDateString()}`,
              ])}
            />
          </div>
        </div>
      )}

      {tab === "Academics" && (
        <section className="overflow-hidden rounded-xl border bg-surface">
          <div className="border-b p-4">
            <h2 className="font-semibold">Academic Record</h2>
            <p className="mt-1 text-sm text-muted">
              {settings.currentAcademicSession} · {settings.currentTerm}
            </p>
          </div>
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  {["Subject", "Assessment", "Score", "Feedback", "Status"].map(
                    (item) => (
                      <th key={item} className="px-4 py-3">
                        {item}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {record.assignments
                  .filter((item) => typeof item.submission?.score === "number")
                  .map(({ assignment, submission }) => (
                    <tr key={assignment.id}>
                      <td className="px-4 py-3">{subjectName(assignment.subjectId)}</td>
                      <td className="px-4 py-3">{assignment.title}</td>
                      <td className="px-4 py-3">{submission?.score}%</td>
                      <td className="px-4 py-3">{submission?.feedback ?? "—"}</td>
                      <td className="px-4 py-3">{submission?.status}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!scored.length && (
            <p className="p-6 text-center text-sm text-muted">
              No student-linked scores have been published yet.
            </p>
          )}
        </section>
      )}

      {tab === "Assignments" && (
        <DataTable
          headings={["Assignment", "Subject", "Due date", "Status", "Submitted", "Score", "Action"]}
          rows={record.assignments.map(({ assignment, submission }) => [
            assignment.title,
            subjectName(assignment.subjectId),
            new Date(assignment.dueAt).toLocaleDateString(),
            submission?.status ?? "NOT SUBMITTED",
            submission?.submittedAt
              ? new Date(submission.submittedAt).toLocaleString()
              : "—",
            typeof submission?.score === "number" ? `${submission.score}%` : "—",
            <Link key={assignment.id} href={`/teacher/assignments/${assignment.id}`} className="font-semibold text-[var(--school-primary)]">
              View assignment
            </Link>,
          ])}
          empty="No assignments are linked to this student's current class."
        />
      )}

      {tab === "Attendance" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Attendance start date" />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Attendance end date" />
            <Select clearable label="Attendance status" value={attendanceStatus} onChange={setAttendanceStatus} placeholder="All statuses" options={["PRESENT", "ABSENT", "LATE", "EXCUSED"].map((value) => ({ value, label: value }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ["Attendance", `${record.attendanceSummary.percentage}%`],
              ["Present", record.attendanceSummary.present],
              ["Absent", record.attendanceSummary.absent],
              ["Late", record.attendanceSummary.late],
              ["Excused", record.attendanceSummary.excused],
              ["Total days", record.attendanceSummary.total],
            ].map(([label, value]) => (
              <Card key={label} className="p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 text-xl font-bold">{value}</p>
              </Card>
            ))}
          </div>
          <DataTable
            headings={["Date", "Status", "Arrival", "Note", "Class", "Marked by", "Updated", "Register"]}
            rows={record.attendanceRecords
              .filter((item) => (!dateFrom || item.date >= dateFrom) && (!dateTo || item.date <= dateTo) && (!attendanceStatus || item.status === attendanceStatus))
              .map((item) => [
                item.date,
                item.status,
                item.arrivalTime ?? "—",
                item.note ?? "—",
                academics.classes.find((entry) => entry.id === item.classId)?.displayName ?? "—",
                item.markedByUserId,
                new Date(item.updatedAt).toLocaleString(),
                <Link key={item.id} href={`/admin/attendance/${item.classId}/${item.date}`} className="font-semibold text-[var(--school-primary)]">Open</Link>,
              ])}
            empty="No attendance records match these filters."
          />
        </div>
      )}

      {tab === "Finance" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Fees charged", formatNaira(totals.charged)],
              ["Amount paid", formatNaira(totals.paid)],
              ["Outstanding", formatNaira(totals.outstanding)],
              ["Overdue", formatNaira(totals.overdue)],
            ].map(([label, value]) => (
              <Card key={label} className="p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 text-xl font-bold">{value}</p>
              </Card>
            ))}
          </div>
          <DataTable
            headings={["Invoice", "Session", "Term", "Total", "Paid", "Balance", "Due", "Status"]}
            rows={record.invoices.map((item) => [
              item.invoiceNumber,
              item.academicSession,
              item.term,
              formatNaira(item.totalAmount),
              formatNaira(item.amountPaid),
              formatNaira(item.outstandingBalance),
              item.dueDate,
              item.status,
            ])}
            empty="No invoices are linked to this student."
          />
          <DataTable
            headings={["Date", "Amount", "Method", "Reference", "Status", "Receipt"]}
            rows={record.payments.map((item) => {
              const receipt = record.receipts.find((entry) => entry.paymentId === item.id);
              return [
                item.paymentDate,
                formatNaira(item.amount),
                item.method,
                item.reference,
                item.status,
                receipt ? (
                  <Link key={item.id} href={`/parent/payments/receipt/${receipt.id}`} className="inline-flex items-center gap-1 font-semibold text-[var(--school-primary)]">
                    <Download size={14} /> Receipt
                  </Link>
                ) : "—",
              ];
            })}
            empty="No payments are linked to this student."
          />
        </div>
      )}

      {tab === "Parents" && (
        <div className="grid gap-4 md:grid-cols-2">
          {record.guardians.map((guardian) => (
            <Card key={guardian.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{guardian.fullName}</h2>
                {guardian.isPrimaryContact && <Badge tone="primary">Primary contact</Badge>}
                {guardian.isEmergencyContact && <Badge>Emergency contact</Badge>}
                {(guardian.userId || guardian.accountStatus || guardian.email) && <Badge tone="success">Login ready</Badge>}
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">Relationship</dt><dd>{guardian.relationship}</dd></div>
                <div><dt className="text-muted">Phone</dt><dd>{guardian.phone}</dd></div>
                <div><dt className="text-muted">Email</dt><dd>{guardian.email ?? "Not provided"}</dd></div>
                <div><dt className="text-muted">Address</dt><dd>{guardian.address ?? "Not provided"}</dd></div>
                <div><dt className="text-muted">Account status</dt><dd>{guardian.accountStatus ?? (guardian.email ? "Ready for first-time login" : "No login email")}</dd></div>
              </dl>
              <div className="mt-4 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => removeParent(guardian.id, guardian.fullName)}>
                  Remove Parent
                </Button>
              </div>
            </Card>
          ))}
          {!record.guardians.length && <EmptyState title="No linked parents" description="Add parent information from Edit Student." />}
        </div>
      )}

      {tab === "Documents" && (
        <section className="rounded-xl border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div><h2 className="font-semibold">Documents</h2><p className="text-sm text-muted">Student files stored in this browser for demo mode.</p></div>
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold">
              <Upload size={15} />
              Add Document
              <input className="sr-only" type="file" onChange={(event) => uploadDocument(event.target.files?.[0])} />
            </label>
          </div>
          <div className="divide-y px-4">
            {record.documents.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="truncate font-semibold">{item.name}</p><p className="text-xs text-muted">{item.type} · {new Date(item.uploadedAt).toLocaleDateString()} · {item.uploadedBy}</p></div>
                <div className="flex gap-2">
                  {item.dataUrl && <a href={item.dataUrl} download={item.name} className="inline-flex min-h-10 items-center gap-1 rounded-[10px] border px-3 text-sm font-semibold"><Download size={14}/>Download</a>}
                  <Button type="button" variant="outline" onClick={() => confirm({title:"Remove document?",description:"This demo file will be removed from the student record.",confirmLabel:"Remove",destructive:true,onConfirm:async()=>{await removeStudentDocument(item.id);toast("Document removed.","success")}})}>Remove</Button>
                </div>
              </div>
            ))}
            {!record.documents.length && <p className="py-8 text-center text-sm text-muted">No documents uploaded.</p>}
          </div>
        </section>
      )}

      {tab === "Activity" && (
        <section className="rounded-xl border bg-surface px-5">
          <div className="divide-y">
            {record.activities.map((item) => (
              <div key={item.id} className="relative py-4 pl-6">
                <span className="absolute left-0 top-5 size-2 rounded-full bg-[var(--school-primary)]" />
                <p className="font-semibold">{item.action}</p>
                <p className="mt-1 text-sm text-muted">{item.detail}</p>
                <p className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {showMove && (
        <MoveClassDialog
          studentId={student.id}
          currentClassId={student.classId}
          onClose={() => setShowMove(false)}
        />
      )}
    </div>
  );
}

function InfoSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, React.ReactNode]>;
}) {
  return (
    <section className="rounded-xl border bg-surface">
      <h2 className="border-b p-4 font-semibold">{title}</h2>
      <dl className="divide-y px-4">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="min-w-0 break-words text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DataTable({
  headings,
  rows,
  empty,
}: {
  headings: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-xl border bg-surface">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-surface-muted">
            <tr>
              {headings.map((item) => (
                <th key={item} className="px-4 py-3 text-xs uppercase text-muted">{item}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="p-8 text-center text-sm text-muted">{empty}</p>}
    </section>
  );
}
