import type { AcademicsState, Guardian } from "@/features/academics/academics.types";
import type { AssignmentsState } from "@/features/assignments/assignments.types";
import type { AttendanceRegister } from "@/features/attendance/attendance.types";
import type { FinanceState } from "@/features/finance/finance.types";
import { filterAttendanceByPeriod, filterAttendanceBySession, getAttendanceSummaryForStudent, type AttendancePeriod } from "@/features/attendance/attendance.utils";
import { dateBelongsToPeriod } from "@/features/academic-period/period-scope-utils";

export function buildStudentCompleteRecord(
  studentId: string,
  academics: AcademicsState,
  assignments: AssignmentsState,
  attendance: AttendanceRegister[],
  finance: FinanceState,
  attendancePeriod?: AttendancePeriod,
) {
  const student = academics.students.find((item) => item.id === studentId);
  if (!student) return undefined;
  const currentClass = academics.classes.find(
    (item) => item.id === student.classId,
  );
  const linkedGuardians = academics.guardians.filter((item) =>
    student.guardianIds.includes(item.id),
  );
  const guardians: Guardian[] = linkedGuardians.length
    ? linkedGuardians
    : student.guardianName
      ? [
          {
            id: student.guardianIds[0] ?? `student-parent-${student.id}`,
            schoolId: student.schoolId,
            fullName: student.guardianName,
            relationship: "Parent",
            phone: student.guardianPhone,
            email: student.guardianEmail,
            address: student.address,
            isPrimaryContact: true,
            isEmergencyContact: true,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt,
          },
        ]
      : [];
  const periodAttendance = attendancePeriod?.termId
    ? filterAttendanceByPeriod(attendance, attendancePeriod)
    : filterAttendanceBySession(attendance, attendancePeriod);
  const attendanceRecords = periodAttendance
    .filter((item) => item.status === "SUBMITTED" || item.status === "REOPENED")
    .flatMap((register) =>
      register.entries
        .filter((entry) => entry.studentId === studentId)
        .map((entry) => ({
          ...entry,
          registerId: register.id,
          classId: register.classId,
          date: register.date,
          teacherUserId: register.teacherUserId,
        })),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const attendanceSummary = getAttendanceSummaryForStudent(
    periodAttendance,
    studentId,
    attendancePeriod,
  );
  const classHistory = academics.studentClassHistory.filter(
    (item) => item.studentId === studentId,
  );
  const classIds = new Set([
    student.classId,
    ...classHistory.flatMap((item) =>
      [item.fromClassId, item.toClassId].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ]);
  const assignmentRecords = assignments.assignments
    .filter((item) => classIds.has(item.classId))
    .map((assignment) => ({
      assignment,
      submission: assignments.submissions.find(
        (item) =>
          item.assignmentId === assignment.id && item.studentId === studentId,
      ),
    }))
    .sort((a, b) => b.assignment.createdAt.localeCompare(a.assignment.createdAt));
  const invoices = finance.invoices.filter(
    (item) => item.studentId === studentId,
  );
  const payments = finance.payments.filter(
    (item) => item.studentId === studentId,
  );
  const receipts = finance.receipts.filter((receipt) =>
    invoices.some((invoice) => invoice.id === receipt.invoiceId),
  );
  const documents = academics.studentDocuments.filter(
    (item) => item.studentId === studentId && dateBelongsToPeriod(item.uploadedAt, attendancePeriod),
  );
  const activities = [
    ...academics.studentActivities.filter(
      (item) => item.studentId === studentId && dateBelongsToPeriod(item.createdAt, attendancePeriod),
    ),
    ...attendanceRecords.map((item) => ({
      id: `attendance-${item.id}`,
      studentId,
      action: "Attendance recorded",
      detail: `${item.status.toLowerCase()} attendance recorded for ${item.date}.`,
      createdAt: item.updatedAt,
    })),
    ...assignmentRecords
      .filter((item) => item.submission?.submittedAt)
      .map((item) => ({
        id: `assignment-${item.submission?.id}`,
        studentId,
        action: "Assignment submitted",
        detail: item.assignment.title,
        createdAt: item.submission?.submittedAt ?? item.assignment.updatedAt,
      })),
    ...invoices.map((item) => ({
      id: `invoice-${item.id}`,
      studentId,
      action: "Fee assigned",
      detail: `${item.invoiceNumber} · ${item.term}`,
      createdAt: `${item.dueDate}T00:00:00.000Z`,
    })),
    ...payments.map((item) => ({
      id: `payment-${item.id}`,
      studentId,
      action: "Payment recorded",
      detail: `${item.reference} · ${item.status}`,
      createdAt: `${item.paymentDate}T12:00:00.000Z`,
    })),
  ].filter((item) => dateBelongsToPeriod(item.createdAt, attendancePeriod)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    student,
    currentClass,
    guardians,
    attendanceSummary,
    attendanceRecords,
    assignments: assignmentRecords,
    invoices,
    payments,
    receipts,
    documents,
    activities,
    classHistory,
  };
}

export type StudentCompleteRecord = NonNullable<
  ReturnType<typeof buildStudentCompleteRecord>
>;

export function studentOutstandingBalance(
  studentId: string,
  finance: FinanceState,
) {
  return finance.invoices
    .filter((item) => item.studentId === studentId)
    .reduce((sum, item) => sum + item.outstandingBalance, 0);
}

export function studentAttendancePercentage(
  studentId: string,
  attendance: AttendanceRegister[],
  attendancePeriod?: AttendancePeriod,
) {
  return getAttendanceSummaryForStudent(attendance, studentId, attendancePeriod).percentage;
}
