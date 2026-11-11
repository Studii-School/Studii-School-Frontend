"use client";
/* eslint-disable react-hooks/set-state-in-effect -- register working rows reset when the selected record changes. */

import { useEffect, useState } from "react";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { resolveStudentSession } from "@/features/academics/student-session";
import type { Student } from "@/features/academics/academics.types";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { dateBelongsToPeriod } from "@/features/academic-period/period-scope-utils";
import {
  getClassTeacherClassesForTeacher,
  isClassTeacherForClass,
  getGuardianChildren,
  getStudentsByClass,
} from "@/features/academics/academics.selectors";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { PinToDashboardButton } from "@/features/dashboard-customisation/pin-to-dashboard-button";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { PersonNameLink } from "@/features/people/person-name-link";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { isAttendanceDateEditable, toLocalDateKey } from "@/lib/date-utils";
import { readStoredUser } from "@/lib/auth";
import { readStoredToken } from "@/lib/api";
import { AdminAttendanceOverview } from "./admin-attendance-screens";
import { useAttendance } from "./attendance-context";
import { attendanceRepository } from "./attendance.repository";
import type {
  AttendanceEntryInput,
  AttendanceRegister,
  AttendanceStatus,
} from "./attendance.types";
import {
  attendanceHistoryForStudent,
  filterAttendanceByPeriod,
  getAttendanceSummaryForStudent,
  selectAttendanceStudentId,
} from "./attendance.utils";

const today = () => toLocalDateKey(new Date());
const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
};

type WorkingEntry = {
  studentId: string;
  status: AttendanceStatus | "";
  note: string;
};

type AttendanceRosterStudent = Pick<Student, "id" | "firstName" | "lastName" | "admissionNumber" | "status">;

function attendanceRoster(
  currentStudents: AttendanceRosterStudent[],
  register: AttendanceRegister | undefined,
  knownStudents: Student[],
): AttendanceRosterStudent[] {
  if (!register?.entries.length) return currentStudents;
  const recordedStudents = register.entries.map((entry): AttendanceRosterStudent => {
    const known = currentStudents.find((student) => student.id === entry.studentId)
      ?? knownStudents.find((student) => student.id === entry.studentId);
    return known ?? {
      id: entry.studentId,
      firstName: entry.student?.firstName ?? "Student",
      lastName: entry.student?.lastName ?? entry.studentId,
      admissionNumber: entry.student?.admissionNumber ?? "",
      status: "ACTIVE",
    };
  });
  if (register.status === "SUBMITTED" || register.status === "REOPENED") return recordedStudents;
  const currentIds = new Set(currentStudents.map((student) => student.id));
  return [...currentStudents, ...recordedStudents.filter((student) => !currentIds.has(student.id))];
}

function studentName(student: { firstName: string; lastName: string }) {
  return `${student.firstName} ${student.lastName}`.trim();
}

function firstStudentIdFromRegisters(registers: ReturnType<typeof useAttendance>["registers"]) {
  return registers
    .flatMap((register) => register.entries)
    .find((entry) => entry.studentId)?.studentId ?? "";
}

function currentUserId() {
  return readStoredUser()?.id ?? "";
}

function SummaryCards({
  entries,
  total,
}: {
  entries: WorkingEntry[];
  total: number;
}) {
  const count = (status: AttendanceStatus) =>
    entries.filter((item) => item.status === status).length;
  const marked = entries.filter((item) => item.status).length;
  const present = count("PRESENT");
  const late = count("LATE");
  const excused = count("EXCUSED");
  const items = [
    ["Present", present, "text-success"],
    ["Absent", count("ABSENT"), "text-danger"],
    ["Late", late, "text-warning"],
    ["Excused", excused, ""],
    ["Unmarked", total - marked, ""],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {items.map(([label, value, tone]) => (
        <Card key={String(label)} className="p-3">
          <p className="text-xs text-muted">{label}</p>
          <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
        </Card>
      ))}
      <Card className="p-3">
        <p className="text-xs text-muted">Attendance</p>
        <p className="mt-1 text-xl font-bold">
          {total
            ? Math.round(((present + late) / total) * 100)
            : 0}
          %
        </p>
      </Card>
    </div>
  );
}

export function TeacherAttendanceScreen() {
  const { registers, isLoading, error } = useAttendance();
  const { state } = useAcademics();
  const { settings } = useSchoolSettings();
  const { selectedTerm, scope } = useAcademicPeriod();
  const todayKey = today();
  const [date, setDate] = useState(todayKey);
  const teacherUserId = currentUserId();
  const classes = getClassTeacherClassesForTeacher(state, teacherUserId);
  const pastDate = !isAttendanceDateEditable(date);
  const attendancePeriod = {
    academicSessionId: scope.academicSessionId,
    termId: scope.termId,
    startDate: selectedTerm?.startDate || settings.resumptionDate,
    endDate: selectedTerm?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedTerm),
  };
  const periodRegisters = filterAttendanceByPeriod(registers, attendancePeriod);

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Open class-teacher registers, save drafts and submit daily attendance."
        action={
          <div className="flex gap-2">
            <PinToDashboardButton
              role="teacher"
              widgetId="teacher-attendance-pending"
            />
            <PinToDashboardButton
              role="teacher"
              widgetId="teacher-class-attendance"
            />
          </div>
        }
      />
      {error && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <label className="mb-5 block max-w-xs text-sm font-medium">
        Register date
        <Input
          className="mt-2"
          type="date"
          value={date}
          max={todayKey}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      {pastDate && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
          <LockKeyhole size={17} />
          Past registers can be edited after an administrator reopens them.
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {classes.map((schoolClass) => {
          const register = periodRegisters.find(
            (record) =>
              record.classId === schoolClass.id && record.date === date,
          );
          const count = getStudentsByClass(state, schoolClass.id).filter(
            (item) => item.status === "ACTIVE",
          ).length;
          return (
            <Card key={schoolClass.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold">{schoolClass.displayName}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {count} students · {date}
                  </p>
                </div>
                <Badge
                  tone={
                    register?.status === "SUBMITTED"
                      ? "success"
                      : register?.status
                        ? "warning"
                        : "neutral"
                  }
                >
                  {register?.status ?? "NOT STARTED"}
                </Badge>
              </div>
              <div className="mt-5 flex items-center justify-between border-t pt-4">
                <span className="text-xs text-muted">
                  {register?.submittedAt
                    ? `Submitted ${new Date(register.submittedAt).toLocaleString()}`
                    : "Ready to open"}
                </span>
                <Link
                  href={`/teacher/attendance/${schoolClass.id}?date=${date}`}
                  className="inline-flex min-h-10 items-center rounded-[10px] bg-[var(--school-primary)] px-4 text-sm font-semibold text-[var(--school-primary-foreground)]"
                >
                  {pastDate && register?.status !== "REOPENED" ? "View register" : "Open register"}
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
      {!isLoading && classes.length === 0 && (
        <EmptyState
          title="No assigned classes"
          description="Your attendance classes will appear after an administrator assigns them."
        />
      )}
      {isLoading && (
        <p className="mt-4 text-sm text-muted">Loading registers...</p>
      )}
    </>
  );
}

export function AttendanceRegisterScreen({
  classId,
  initialDate,
  isAdmin = false,
}: {
  classId: string;
  initialDate?: string;
  isAdmin?: boolean;
}) {
  const { registers, saveDraft, submit, error } = useAttendance();
  const { state } = useAcademics();
  const { settings } = useSchoolSettings();
  const { selectedTerm, scope } = useAcademicPeriod();
  const { confirm, toast } = useActionFeedback();
  const todayKey = today();
  const [date, setDate] = useState(initialDate ?? todayKey);
  const schoolClass = state.classes.find((item) => item.id === classId);
  const teacherUserId = currentUserId();
  const [currentStudents, setStudents] = useState<AttendanceRosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState("");
  useEffect(() => {
    let active = true;
    setRosterLoading(true);
    setRosterError("");
    void attendanceRepository.getClassStudents(classId)
      .then((items) => { if (active) setStudents(items.filter((item) => item.status === "ACTIVE")); })
      .catch(() => { if (active) { setStudents([]); setRosterError("The class roster could not be loaded."); } })
      .finally(() => { if (active) setRosterLoading(false); });
    return () => { active = false; };
  }, [classId]);
  const attendancePeriod = {
    academicSessionId: scope.academicSessionId,
    termId: scope.termId,
    startDate: selectedTerm?.startDate || settings.resumptionDate,
    endDate: selectedTerm?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedTerm),
  };
  const periodRegisters = filterAttendanceByPeriod(registers, attendancePeriod);
  const register = periodRegisters.find(
    (item) => item.classId === classId && item.date === date,
  );
  const students = attendanceRoster(currentStudents, register, state.students);
  const [entries, setEntries] = useState<WorkingEntry[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<"draft" | "submit">();

  useEffect(() => {
    setEntries(
      attendanceRoster(currentStudents, register, state.students).map((student) => {
        const saved = register?.entries.find(
          (item) => item.studentId === student.id,
        );
        return {
          studentId: student.id,
          status: saved?.status ?? "",
          note: saved?.note ?? "",
        };
      }),
    );
    setSelected([]);
  }, [currentStudents, register, state.students]);

  if (!schoolClass || (!isAdmin && !isClassTeacherForClass(state, teacherUserId, classId))) {
    return (
      <EmptyState
        title="Class unavailable"
        description={isAdmin ? "This class is unavailable." : "Only the assigned class teacher can manage attendance for this class."}
      />
    );
  }

  const dateLocked = isAdmin
    ? !register && !(scope.isCurrentPeriod && date === todayKey) && !dateBelongsToPeriod(date, attendancePeriod)
    : !isAttendanceDateEditable(date) && register?.status !== "REOPENED";
  const periodLocked = isAdmin
    ? !scope.isCurrentPeriod && !settings.historicalEditingEnabled && register?.status !== "REOPENED"
    : !scope.isCurrentPeriod && register?.status !== "REOPENED";
  const readOnly =
    periodLocked ||
    dateLocked ||
    rosterLoading ||
    Boolean(rosterError) ||
    register?.status === "SUBMITTED";
  const warn = () =>
    toast(
      dateLocked
        ? isAdmin ? "Choose a date within the selected academic term." : "Teachers can mark past attendance after an administrator reopens that register."
        : rosterLoading
          ? "The class roster is still loading."
          : rosterError
            ? rosterError
          : periodLocked
            ? "Past term attendance can only be changed in a reopened register."
        : "This attendance register has already been submitted.",
      "warning",
    );
  const setAll = (status: AttendanceStatus | "") =>
    readOnly
        ? warn()
        : setEntries((current) =>
            current.map((item) => ({
              ...item,
              status,
            })),
          );
  const setSelectedStatus = (status: AttendanceStatus) =>
    readOnly
      ? warn()
      : setEntries((current) =>
          current.map((item) =>
            selected.includes(item.studentId)
                ? {
                    ...item,
                    status,
                  }
                : item,
          ),
        );
  const payload = (): AttendanceEntryInput[] =>
    entries
      .filter(
        (item): item is WorkingEntry & { status: AttendanceStatus } =>
          Boolean(item.status),
      )
      .map(({ studentId, status, note }) => ({
        studentId,
        status,
        note: note || undefined,
      }));
  const perform = async (mode: "draft" | "submit") => {
    if (readOnly) return warn();
    setBusy(mode);
    try {
      const input = {
        teacherUserId,
        classId,
        date,
        entries: payload(),
        isAdmin,
      };
      if (mode === "draft") {
        await saveDraft(input);
        toast("Attendance draft saved.", "success");
      } else {
        await submit(input);
        toast("Attendance submitted successfully.", "success");
      }
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Attendance could not be submitted.",
        "error",
      );
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <>
      <PageHeader
        title={`${schoolClass.displayName} Register`}
        description="Mark every student, review the live summary and submit once complete."
        action={
          isAdmin ? <span className="text-sm font-medium">{date}</span> : (
            <label className="text-sm font-medium">
              Date
              <Input
                className="mt-1"
                type="date"
                value={date}
                max={todayKey}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          )
        }
      />
      {error && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <SummaryCards entries={entries} total={students.length} />
      {readOnly && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
          <LockKeyhole size={17} />
          {periodLocked
            ? "Viewing a past term. Attendance cannot be changed."
            : dateLocked
            ? isAdmin ? "Choose a date within the selected academic term." : "Teachers can mark past attendance after an administrator reopens that register."
            : rosterLoading
            ? "Loading the class roster…"
            : rosterError
            ? rosterError
            : "This register is submitted and read-only. An administrator can reopen it."}
        </div>
      )}
      <div className="my-5 flex flex-wrap gap-2">
        <Button disabled={readOnly} onClick={() => setAll("PRESENT")}>
          <CheckCircle2 size={16} />
          Mark All Present
        </Button>
        <Button
          disabled={readOnly}
          variant="outline"
          onClick={() =>
            confirm({
              title: "Mark every student absent?",
              description:
                "Every student in this register will be changed to Absent.",
              confirmLabel: "Mark All Absent",
              onConfirm: () => setAll("ABSENT"),
            })
          }
        >
          Mark All Absent
        </Button>
        <Button disabled={readOnly} variant="outline" onClick={() => setAll("")}>
          Clear All
        </Button>
        {selected.length > 0 &&
          (["PRESENT", "ABSENT", "LATE"] as AttendanceStatus[]).map(
            (status) => (
              <Button
                key={status}
                disabled={readOnly}
                variant="outline"
                onClick={() => setSelectedStatus(status)}
              >
                Selected {statusLabels[status]}
              </Button>
            ),
          )}
      </div>
      <SectionCard title="Students" description={`${selected.length} selected`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    aria-label="Select all students"
                    checked={
                      selected.length === students.length && students.length > 0
                    }
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? students.map((item) => item.id)
                          : [],
                      )
                    }
                  />
                </th>
                {["Student", "Status", "Note"].map((item) => (
                  <th
                    key={item}
                    className="px-4 py-3 text-xs font-medium uppercase text-muted"
                  >
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student) => {
                const name = studentName(student);
                const entry = entries.find(
                  (item) => item.studentId === student.id,
                );
                return (
                  <tr key={student.id}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        aria-label={`Select ${name}`}
                        checked={selected.includes(student.id)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, student.id]
                              : current.filter((id) => id !== student.id),
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <b><PersonNameLink kind="student" id={student.id}>{name}</PersonNameLink></b>
                      <p className="text-xs text-muted">
                        {student.admissionNumber}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        disabled={readOnly}
                        label={`${name} attendance status`}
                        value={entry?.status ?? ""}
                        onChange={(value) =>
                          setEntries((current) =>
                            current.map((item) =>
                              item.studentId === student.id
                                ? {
                                    ...item,
                                    status: value as AttendanceStatus | "",
                                  }
                                : item,
                            ),
                          )
                        }
                        placeholder="Unmarked"
                        options={Object.entries(statusLabels).map(
                          ([value, label]) => ({ value, label }),
                        )}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        disabled={readOnly}
                        aria-label={`${name} attendance note`}
                        value={entry?.note ?? ""}
                        onChange={(event) =>
                          setEntries((current) =>
                            current.map((item) =>
                              item.studentId === student.id
                                ? { ...item, note: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <div className="mt-5 flex justify-end gap-2">
        <Button
          disabled={readOnly || Boolean(busy)}
          variant="outline"
          onClick={() => void perform("draft")}
        >
          {busy === "draft" ? "Saving attendance..." : "Save Draft"}
        </Button>
        <Button
          disabled={readOnly || Boolean(busy)}
          onClick={() => void perform("submit")}
        >
          {busy === "submit" ? "Submitting attendance..." : "Submit Attendance"}
        </Button>
      </div>
    </>
  );
}

export function AdminAttendanceScreen() {
  return <AdminAttendanceOverview />;
}

function PersonalAttendance({ studentId }: { studentId: string }) {
  const { registers, sessionRegisters, isLoading, error } = useAttendance();
  const { state } = useAcademics();
  const { settings } = useSchoolSettings();
  const { selectedSession, selectedTerm, scope } = useAcademicPeriod();
  const attendancePeriod = {
    academicSessionId: scope.academicSessionId,
    termId: scope.termId,
    startDate: selectedTerm?.startDate || settings.resumptionDate,
    endDate: selectedTerm?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedTerm),
  };
  const periodRegisters = filterAttendanceByPeriod(registers, attendancePeriod);
  const effectiveStudentId = studentId || firstStudentIdFromRegisters(periodRegisters);
  const student = state.students.find((item) => item.id === effectiveStudentId);
  const sessionPeriod = {
    academicSessionId: selectedSession?.id,
    startDate: selectedSession?.startDate || settings.resumptionDate,
    endDate: selectedSession?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedSession),
  };
  const summary = getAttendanceSummaryForStudent(sessionRegisters, effectiveStudentId, sessionPeriod);
  const history = attendanceHistoryForStudent(sessionRegisters, effectiveStudentId, sessionPeriod);
  const current = history.find((item) => item.date === today());

  if (isLoading)
    return <p className="text-sm text-muted">Loading attendance...</p>;
  return (
    <>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Today's status", current ? statusLabels[current.status] : "Not marked"],
          ["Session attendance", `${summary.percentage}%`],
          ["Present days", summary.present],
          ["Absent days", summary.absent],
          ["Late days", summary.late],
          ["Unmarked days", summary.unmarked],
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
      <SectionCard
        title="Recent attendance history"
        description={student ? <PersonNameLink kind="student" id={student.id}>{studentName(student)}</PersonNameLink> : undefined}
      >
        <div className="divide-y px-5">
          {history.length ? (
            history.slice(0, 12).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.date}</p>
                  {item.note && (
                    <p className="text-xs text-muted">{item.note}</p>
                  )}
                </div>
                <Badge
                  tone={
                    item.status === "PRESENT"
                      ? "success"
                      : item.status === "ABSENT"
                        ? "danger"
                        : "warning"
                  }
                >
                  {statusLabels[item.status]}
                </Badge>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              No submitted attendance yet.
            </p>
          )}
        </div>
      </SectionCard>
    </>
  );
}

export function StudentAttendanceScreen() {
  const { state } = useAcademics();
  const { registers } = useAttendance();
  const user = readStoredUser();
  const resolved = resolveStudentSession(state, user, readStoredToken() ? undefined : "student-yusuf");
  const studentId = selectAttendanceStudentId(registers, resolved.studentId);
  return (
    <>
      <PageHeader
        title="Attendance"
        description="Your own daily and term attendance record."
      />
      <PersonalAttendance studentId={studentId} />
    </>
  );
}

export function ParentAttendanceScreen() {
  const { state } = useAcademics();
  const { registers } = useAttendance();
  const { settings } = useSchoolSettings();
  const { selectedTerm, scope } = useAcademicPeriod();
  const user = readStoredUser();
  const attendancePeriod = {
    academicSessionId: scope.academicSessionId,
    termId: scope.termId,
    startDate: selectedTerm?.startDate || settings.resumptionDate,
    endDate: selectedTerm?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedTerm),
  };
  const periodRegisters = filterAttendanceByPeriod(registers, attendancePeriod);
  const children = user?.guardianId
    ? getGuardianChildren(state, user.guardianId)
    : state.students.filter((student) => user?.childStudentIds?.includes(student.id));
  const attendanceStudentIds = [
    ...new Set(
      periodRegisters.flatMap((register) =>
        register.entries.map((entry) => entry.studentId),
      ),
    ),
  ].filter(Boolean);
  const visibleChildren = children.length
    ? children
    : state.students.filter((student) => attendanceStudentIds.includes(student.id));
  const childOptions = visibleChildren.length
    ? visibleChildren.map((item) => ({
        value: item.id,
        label: studentName(item),
      }))
    : attendanceStudentIds.map((id) => ({
        value: id,
        label: id,
      }));
  const [selected, setSelected] = useState(childOptions[0]?.value ?? "");

  useEffect(() => {
    if (!childOptions.length) return;
    if (!selected || !childOptions.some((item) => item.value === selected)) {
      setSelected(childOptions[0].value);
    }
  }, [childOptions, selected]);

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Attendance visibility is limited to your linked children."
        action={
          <Select
            className="min-w-56"
            label="Child"
            value={selected}
            onChange={setSelected}
            options={childOptions}
          />
        }
      />
      <PersonalAttendance studentId={selected} />
    </>
  );
}




