"use client";

import { useState } from "react";
import { Download, RotateCcw, Save } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { pageTabClass } from "@/components/ui/tabs";
import { useAcademics } from "@/features/academics/academics-context";
import { PersonNameLink } from "@/features/people/person-name-link";
import {
  getClassById,
  getTeacherByUserId,
} from "@/features/academics/academics.selectors";
import type { Student } from "@/features/academics/academics.types";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { dateBelongsToPeriod } from "@/features/academic-period/period-scope-utils";
import { PinToDashboardButton } from "@/features/dashboard-customisation/pin-to-dashboard-button";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { matchesSearch } from "@/lib/search";
import { formatDate, formatDateTime, formatTime, toLocalDateKey } from "@/lib/date-utils";
import { useAttendance } from "./attendance-context";
import { attendanceActorLabel, attendanceUserLabel } from "./attendance-user-label";
import { filterAttendanceByPeriod, isAutomaticAbsentDay, summarizeRegister } from "./attendance.utils";
import type { AttendanceStatus } from "./attendance.types";

const statusOptions = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
const today = () => toLocalDateKey(new Date());
const label = (status: string) =>
  status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());

const studentName = (student: Pick<Student, "firstName" | "lastName">) =>
  `${student.firstName} ${student.lastName}`.trim();

export function AdminAttendanceOverview() {
  const { registers, isLoading, error } = useAttendance();
  const { state: academics, isLoading: academicsLoading } = useAcademics();
  const { settings } = useSchoolSettings();
  const { selectedTerm, scope } = useAcademicPeriod();
  const [date, setDate] = useState(today());
  const [level, setLevel] = useState("");
  const [classId, setClassId] = useState("");
  const [teacher, setTeacher] = useState("");
  const [status, setStatus] = useState("");

  const attendancePeriod = {
    academicSessionId: scope.academicSessionId,
    termId: scope.termId,
    startDate: selectedTerm?.startDate || settings.resumptionDate,
    endDate: selectedTerm?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedTerm),
    isCurrentPeriod: scope.isCurrentPeriod,
  };
  const periodRegisters = filterAttendanceByPeriod(registers, attendancePeriod);
  const studentCount = (item: typeof academics.classes[number], register?: typeof registers[number]) =>
    new Set([
      ...academics.students.filter((student) => student.classId === item.id && student.status === "ACTIVE" && (!student.admissionDate || student.admissionDate.slice(0, 10) <= date)).map((student) => student.id),
      ...(register?.entries.map((entry) => entry.studentId) ?? []),
    ]).size;
  const classes = academics.classes.filter(
    (item) =>
      item.status === "ACTIVE" &&
      settings.schoolLevels.includes(item.level) &&
      (!level || item.level === level) &&
      (!classId || item.id === classId) &&
      (!teacher || item.classTeacherUserId === teacher),
  );
  const rows = classes
    .map((item) => ({
      item,
      register: periodRegisters.find(
        (record) => record.classId === item.id && record.date === date,
      ),
    }))
    .filter(({ register }) =>
      !status || (status === "PENDING" ? !register : register?.status === status),
    );
  const totals = rows.reduce(
    (result, { item, register }) => {
      const count = studentCount(item, register);
      const summary = summarizeRegister(register?.status === "DRAFT" ? undefined : register, count, isAutomaticAbsentDay(date, attendancePeriod));
      return {
        enrolled: result.enrolled + count,
        present: result.present + summary.present,
        absent: result.absent + summary.absent,
        late: result.late + summary.late,
        excused: result.excused + summary.excused,
        unmarked: result.unmarked + summary.unmarked,
      };
    },
    { enrolled: 0, present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 },
  );
  const submitted = rows.filter(
    ({ register }) => register?.status === "SUBMITTED",
  ).length;
  const pending = rows.filter(
    ({ register }) => !register || register.status === "DRAFT",
  ).length;
  const allClasses = academics.classes.filter(
    (item) => item.status === "ACTIVE" && settings.schoolLevels.includes(item.level),
  );

  if (academicsLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-surface-muted" aria-label="Loading classes" />;
  }
  if (!classId) {
    return (
      <>
        <PageHeader
          title="Attendance"
          description="Choose a class first, then review or open its register."
          action={
            <div className="flex gap-2">
              <PinToDashboardButton role="admin" widgetId="admin-attendance" />
              <Button variant="outline">
                <Download size={16} />
                Export report
              </Button>
            </div>
          }
        />
        {error && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        <label className="mb-5 block max-w-xs text-sm font-medium">
          Register date
          <Input className="mt-2" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {allClasses.map((item) => {
            const register = periodRegisters.find((record) => record.classId === item.id && record.date === date);
            const count = studentCount(item, register);
            const summary = summarizeRegister(register?.status === "DRAFT" ? undefined : register, count, isAutomaticAbsentDay(date, attendancePeriod));
            const classTeacher = getTeacherByUserId(academics, item.classTeacherUserId ?? "");
            return (
              <button key={item.id} type="button" onClick={() => setClassId(item.id)} className="min-h-40 rounded-[8px] border bg-surface p-4 text-left transition hover:border-[var(--school-primary)] hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{item.displayName}</h2>
                    <p className="mt-1 text-xs text-muted">{classTeacher ? `${classTeacher.firstName} ${classTeacher.lastName}` : "Unassigned"} · {item.level === "PRIMARY" ? "Primary" : "Secondary"}</p>
                  </div>
                  <Badge tone={register?.status === "SUBMITTED" ? "success" : register ? "warning" : "neutral"}>{register?.status ?? "PENDING"}</Badge>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-2 text-sm">
                  <div><p className="text-xs text-muted">Students</p><p className="font-bold">{count}</p></div>
                  <div><p className="text-xs text-muted">Present</p><p className="font-bold">{summary.present}</p></div>
                  <div><p className="text-xs text-muted">Absent</p><p className="font-bold">{summary.absent}</p></div>
                  <div><p className="text-xs text-muted">Auto absent</p><p className="font-bold">{isAutomaticAbsentDay(date, attendancePeriod) ? Math.max(0, count - (register?.status === "DRAFT" ? 0 : register?.entries.length ?? 0)) : 0}</p></div>
                </div>
              </button>
            );
          })}
        </div>
        {!allClasses.length && <EmptyState title="No classes available" description="Create active classes before taking attendance." />}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Attendance"
        description="School-wide class registers, exceptions and correction access."
        showBack
        onBack={() => setClassId("")}
        action={
          <div className="flex gap-2">
            <PinToDashboardButton role="admin" widgetId="admin-attendance" />
            <Button variant="outline">
              <Download size={16} />
              Export report
            </Button>
          </div>
        }
      />
      {error && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Input
          aria-label="Attendance date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Select
          clearable
          label="School level"
          value={level}
          onChange={setLevel}
          placeholder="All school levels"
          options={settings.schoolLevels.map((value) => ({
            value,
            label: value === "PRIMARY" ? "Primary" : "Secondary",
          }))}
        />
        <Select
          searchable
          clearable
          label="Class"
          value={classId}
          onChange={setClassId}
          placeholder="All classes"
          options={academics.classes
            .filter(
              (item) =>
                item.status === "ACTIVE" &&
                settings.schoolLevels.includes(item.level),
            )
            .map((item) => ({ value: item.id, label: item.displayName }))}
        />
        <Select
          searchable
          clearable
          label="Teacher"
          value={teacher}
          onChange={setTeacher}
          placeholder="All teachers"
          options={academics.teachers.map((item) => ({
            value: item.userId,
            label: `${item.firstName} ${item.lastName}`,
          }))}
        />
        <Select
          clearable
          label="Register status"
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={["SUBMITTED", "DRAFT", "REOPENED", "PENDING"].map(
            (value) => ({ value, label: value }),
          )}
        />
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-9">
        {[
          ["Enrolled", totals.enrolled],
          ["Present", totals.present],
          ["Absent", totals.absent],
          ["Late", totals.late],
          ["Excused", totals.excused],
          ["Unmarked", totals.unmarked],
          [
            "Attendance",
            totals.enrolled
              ? `${Math.round(
                  ((totals.present + totals.late) /
                    totals.enrolled) *
                    100,
                )}%`
              : "-",
          ],
          ["Submitted", submitted],
          ["Pending", pending],
        ].map(([name, value]) => (
          <Card key={String(name)} className="p-4">
            <p className="text-xs text-muted">{name}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
      <SectionCard
        title="Class registers"
        description={isLoading ? "Loading..." : `${rows.length} class result(s)`}
      >
        <div className="divide-y px-5">
          {rows.map(({ item, register }) => {
            const summary = summarizeRegister(register?.status === "DRAFT" ? undefined : register, studentCount(item, register), isAutomaticAbsentDay(date, attendancePeriod));
            const classTeacher = getTeacherByUserId(
              academics,
              item.classTeacherUserId ?? "",
            );
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-semibold">{item.displayName}</p>
                  <p className="text-sm text-muted">
                    {classTeacher
                      ? <PersonNameLink kind="staff" id={classTeacher.userId}>{classTeacher.firstName} {classTeacher.lastName}</PersonNameLink>
                      : "Unassigned"}{" "}
                    - {summary.present} present - {summary.absent} absent -{" "}
                    {summary.late} late - {summary.excused} excused
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      register?.status === "SUBMITTED"
                        ? "success"
                        : register?.status
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {register?.status ?? "PENDING"}
                  </Badge>
                  <Link
                    className="text-sm font-semibold text-[var(--school-primary)]"
                    href={`/admin/attendance/${item.id}/${date}`}
                  >
                    Open register
                  </Link>
                </div>
              </div>
            );
          })}
          {!rows.length && (
            <EmptyState
              title="No registers match these filters."
              description="Change the date or clear one of the active filters."
            />
          )}
        </div>
      </SectionCard>
    </>
  );
}

export function AdminClassAttendanceScreen({ classId }: { classId: string }) {
  const { registers } = useAttendance();
  const { state } = useAcademics();
  const { settings } = useSchoolSettings();
  const { selectedTerm, scope } = useAcademicPeriod();
  const [date, setDate] = useState(today());
  const item = getClassById(state, classId);
  const attendancePeriod = {
    academicSessionId: scope.academicSessionId,
    termId: scope.termId,
    startDate: selectedTerm?.startDate || settings.resumptionDate,
    endDate: selectedTerm?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedTerm),
    isCurrentPeriod: scope.isCurrentPeriod,
  };
  const available = filterAttendanceByPeriod(registers, attendancePeriod)
    .filter((register) => register.classId === classId)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!item) {
    return <EmptyState title="Class not found" description="This class is not available." />;
  }

  return (
    <>
      <PageHeader
        title={`${item.displayName} Attendance`}
        description="Choose a date to inspect the full class register."
        action={
          <Input
            className="max-w-48"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        }
      />
      <Card className="mb-5 p-5">
        <Link
          className="font-semibold text-[var(--school-primary)]"
          href={`/admin/attendance/${classId}/${date}`}
        >
          Open {date} register
        </Link>
      </Card>
      <SectionCard title="Register history">
        <div className="divide-y px-5">
          {available.map((register) => (
            <Link
              key={register.id}
              href={`/admin/attendance/${classId}/${register.date}`}
              className="flex items-center justify-between py-4"
            >
              <span>
                <b>{formatDate(register.date)}</b>
                <p className="text-xs text-muted">
                  Submitted by {attendanceUserLabel(register.submittedByUserId ?? register.teacherUserId, state)}
                </p>
              </span>
              <Badge tone={register.status === "SUBMITTED" ? "success" : "warning"}>
                {register.status}
              </Badge>
            </Link>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

export function AdminAttendanceRegisterScreen({
  classId,
  date,
}: {
  classId: string;
  date: string;
}) {
  const { registers, reopen, correctEntry } = useAttendance();
  const { state: academics } = useAcademics();
  const { settings } = useSchoolSettings();
  const { selectedTerm, scope } = useAcademicPeriod();
  const { confirm, toast } = useActionFeedback();
  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const attendancePeriod = {
    academicSessionId: scope.academicSessionId,
    termId: scope.termId,
    startDate: selectedTerm?.startDate || settings.resumptionDate,
    endDate: selectedTerm?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedTerm),
  };
  const historicalReadOnly = !scope.isCurrentPeriod && !settings.historicalEditingEnabled;
  const periodRegisters = filterAttendanceByPeriod(registers, attendancePeriod);
  const register = periodRegisters.find(
    (item) => item.classId === classId && item.date === date,
  );
  const dateInSelectedPeriod = Boolean(register) || isAutomaticAbsentDay(date, attendancePeriod) || dateBelongsToPeriod(date, attendancePeriod);
  const schoolClass = getClassById(academics, classId);
  const classTeacher = getTeacherByUserId(
    academics,
    schoolClass?.classTeacherUserId ?? "",
  );
  const students = (() => {
    const current = academics.students.filter((student) => student.classId === classId && student.status === "ACTIVE" && (!student.admissionDate || student.admissionDate.slice(0, 10) <= date));
    if (!register?.entries.length) return current;
    const recorded = register.entries.map((entry) => {
      const known = current.find((student) => student.id === entry.studentId)
        ?? academics.students.find((student) => student.id === entry.studentId);
      return known ?? {
        id: entry.studentId,
        firstName: entry.student?.firstName ?? "Student",
        lastName: entry.student?.lastName ?? entry.studentId,
        admissionNumber: entry.student?.admissionNumber ?? "",
      };
    });
    const currentIds = new Set(current.map((student) => student.id));
    return [...current, ...recorded.filter((student) => !currentIds.has(student.id))];
  })();
  const automatic = isAutomaticAbsentDay(date, attendancePeriod);
  const submittedRegister = register?.status === "DRAFT" ? undefined : register;
  const summary = summarizeRegister(submittedRegister, students.length, automatic);
  const visible = students
        .map((student) => ({
          student,
          entry: submittedRegister?.entries.find((item) => item.studentId === student.id),
        }))
        .filter(
          ({ student, entry }) =>
            (tab === "ALL" ||
              (tab === "AUTO" ? automatic && !entry : tab === "ABSENT" ? entry?.status === "ABSENT" || (automatic && !entry) : entry?.status === tab)) &&
            matchesSearch(
              query,
              studentName(student),
              student.admissionNumber,
              entry?.status,
              entry?.note,
            ),
        );

  if (!schoolClass) {
    return <EmptyState title="Class not found" description="This class is unavailable." />;
  }
  if (!dateInSelectedPeriod) {
    return <EmptyState title="Register outside selected term" description="Choose a date within the selected academic term to view this register." />;
  }

  const reopenRegister = () => {
    if (!register) return;
    confirm({
      title: "Reopen attendance register?",
      description: `This will allow administrator corrections to the ${schoolClass.displayName} register for ${date}. The reason and action will be recorded in its audit history.`,
      confirmLabel: "Reopen Register",
      reasonLabel: "Correction reason",
      onConfirm: async (reason) => {
        await reopen(register.id, reason ?? "");
        toast("Attendance register reopened.", "success");
      },
    });
  };
  const correct = (studentId: string, current: AttendanceStatus) =>
    confirm({
      title: "Save attendance correction?",
      description: "This correction will replace the current attendance status and create an audit entry.",
      confirmLabel: "Save Correction",
      reasonLabel: "Correction reason",
      onConfirm: async (reason) => {
        await correctEntry({
          registerId: register?.id ?? "",
          studentId,
          status: current,
          reason: reason ?? "",
          adminUserId: "admin-user-001",
        });
        toast("Attendance correction saved.", "success");
      },
    });

  return (
    <>
      <PageHeader
        title={`${schoolClass.displayName} Register`}
        description={`${date} - ${
          classTeacher
            ? `${classTeacher.firstName} ${classTeacher.lastName}`
            : "No class teacher"
        }`}
        action={
          register?.status === "SUBMITTED" ? (
            <Button variant="outline" onClick={reopenRegister}>
              <RotateCcw size={15} />
              Reopen register
            </Button>
          ) : register?.status === "REOPENED" || !historicalReadOnly ? (
            <Link
              href={`/admin/attendance/${classId}/${date}/mark`}
              className="inline-flex min-h-10 items-center rounded-[10px] bg-[var(--school-primary)] px-4 text-sm font-semibold text-[var(--school-primary-foreground)]"
            >
              {register?.status === "REOPENED" ? "Edit reopened register" : register?.status === "DRAFT" ? "Continue marking" : "Mark attendance"}
            </Link>
          ) : undefined
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Total", summary.total],
          ["Present", summary.present],
          ["Absent", summary.absent],
          ["Late", summary.late],
          ["Excused", summary.excused],
          ["Attendance", `${summary.percentage}%`],
        ].map(([name, value]) => (
          <Card key={String(name)} className="p-4">
            <p className="text-xs text-muted">{name}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="mb-5 p-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="text-muted">Status</span>
            <br />
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
          </p>
          <p>
            <span className="text-muted">Submitted by</span>
            <br />
            <b>{attendanceUserLabel(register?.submittedByUserId ?? register?.teacherUserId, academics)}</b>
          </p>
          <p>
            <span className="text-muted">Submitted at</span>
            <br />
            <b>
              {register?.submittedAt
                ? formatDateTime(register.submittedAt)
                : "-"}
            </b>
          </p>
          <p>
            <span className="text-muted">Audit entries</span>
            <br />
            <b>{register?.auditHistory.length ?? 0}</b>
          </p>
        </div>
      </Card>
      <div className="portal-page-tabs mb-4 flex gap-1 overflow-x-auto border-b" aria-label="Attendance status filters">
        {["ALL", "PRESENT", "ABSENT", "LATE", "EXCUSED", "AUTO"].map(
          (value) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              className={`${pageTabClass(tab === value)} whitespace-nowrap`}
              onClick={() => setTab(value)}
            >
              {label(value)}
            </button>
          ),
        )}
      </div>
      <SearchInput
        className="mb-4"
        value={query}
        onChange={setQuery}
        placeholder="Search student, admission number, status or note"
      />
      <SectionCard
        title={`${visible.length} ${
          tab === "ALL" ? "students" : `${label(tab).toLowerCase()} students`
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-surface-muted">
              <tr>
                {[
                  "Student",
                  "Admission no.",
                  "Status",
                  "Arrival",
                  "Note",
                  "Marked by",
                  "Updated",
                  "Action",
                ].map((item) => (
                  <th key={item} className="px-4 py-3 text-xs uppercase text-muted">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map(({ student, entry }) => (
                <AdminAttendanceRow
                  key={`${student.id}-${entry?.id ?? "auto"}-${entry?.status ?? "absent"}`}
                  student={student}
                  entry={entry}
                  markedBy={entry ? attendanceActorLabel(
                    entry?.markedByUserId,
                    academics,
                    entry?.markedByUser ?? register?.auditHistory.find((audit) => audit.actorUserId === entry?.markedByUserId)?.actorUser,
                    register?.auditHistory.find((audit) => audit.actorUserId === entry?.markedByUserId)?.actorRole,
                  ) : automatic ? "Auto" : "-"}
                  automatic={automatic}
                  editable={register?.status === "REOPENED"}
                  onSave={correct}
                />
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      {register && register.auditHistory.length > 0 && (
        <SectionCard title="Correction history">
          <div className="mt-5 divide-y px-5">
            {[...register.auditHistory].reverse().map((entry) => (
              <div key={entry.id} className="py-3 text-sm">
                <b>{label(entry.action)}</b>
                <p className="text-muted">
                  {entry.actorRole} - {attendanceUserLabel(entry.actorUserId, academics, entry.actorUser)} -{" "}
                  {formatDateTime(entry.createdAt)}
                </p>
                {entry.reason && <p className="mt-1">Reason: {entry.reason}</p>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}

function AdminAttendanceRow({
  student,
  entry,
  markedBy,
  automatic,
  editable,
  onSave,
}: {
  student: Pick<Student, "id" | "firstName" | "lastName" | "admissionNumber">;
  entry:
    | ReturnType<typeof useAttendance>["registers"][number]["entries"][number]
    | undefined;
  markedBy: string;
  automatic: boolean;
  editable: boolean;
  onSave: (studentId: string, status: AttendanceStatus) => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(
    entry?.status ?? (automatic ? "ABSENT" : "PRESENT"),
  );
  const name = studentName(student);

  return (
    <tr>
      <td className="px-4 py-3 font-semibold"><PersonNameLink kind="student" id={student.id}>{name}</PersonNameLink></td>
      <td className="px-4 py-3">{student.admissionNumber}</td>
      <td className="px-4 py-3">
        {editable ? (
          <Select
            label={`${name} correction status`}
            value={status}
            onChange={(value) => setStatus(value as AttendanceStatus)}
            options={statusOptions.map((value) => ({
              value,
              label: label(value),
            }))}
          />
        ) : entry ? (
          <Badge
            tone={
              entry.status === "PRESENT"
                ? "success"
                : entry.status === "ABSENT"
                  ? "danger"
                  : "warning"
            }
          >
            {label(entry.status)}
          </Badge>
        ) : automatic ? <Badge tone="danger">Absent · Auto</Badge> : "Unmarked"}
      </td>
      <td className="px-4 py-3">{entry?.arrivalTime ? formatTime(entry.arrivalTime) : "-"}</td>
      <td className="px-4 py-3">{entry?.note ?? "-"}</td>
      <td className="px-4 py-3">{markedBy}</td>
      <td className="px-4 py-3">
        {entry?.updatedAt ? formatDateTime(entry.updatedAt) : "-"}
      </td>
      <td className="px-4 py-3">
        {editable && (entry || automatic) ? (
          <Button variant="outline" onClick={() => onSave(student.id, status)}>
            <Save size={14} />
            Correct
          </Button>
        ) : (
          "-"
        )}
      </td>
    </tr>
  );
}
