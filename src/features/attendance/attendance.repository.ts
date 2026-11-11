import { academicsRepository } from "@/features/academics/academics.repository";
import type { AcademicPeriodScope } from "@/features/academic-period/academic-period-context";
import { isUuid } from "@/features/academic-period/academic-period.repository";
import { dateBelongsToPeriod } from "@/features/academic-period/period-scope-utils";
import type {
  SchoolClass,
  Student,
} from "@/features/academics/academics.types";
import { apiRequest, readStoredToken } from "@/lib/api";
import { isAttendanceDateEditable } from "@/lib/date-utils";
import {
  getStoredAttendance,
  resetStoredAttendance,
  saveStoredAttendance,
} from "./attendance.storage";
import { summarizeRegister } from "./attendance.utils";
import { backendAttendancePeriod } from "./attendance-backend-period";
import type {
  AdminAttendanceEntryInput,
  AttendanceAuditEntry,
  AttendanceRegister,
  SaveAttendanceInput,
} from "./attendance.types";

export interface AttendanceRepository {
  getAll(context?: AcademicPeriodScope): Promise<AttendanceRegister[]>;
  getAssignedClassesForTeacher(teacherUserId: string): Promise<SchoolClass[]>;
  getClassStudents(classId: string): Promise<Student[]>;
  getAttendanceRegister(
    classId: string,
    date: string,
  ): Promise<AttendanceRegister | undefined>;
  saveAttendanceDraft(input: SaveAttendanceInput): Promise<AttendanceRegister>;
  submitAttendance(input: SaveAttendanceInput): Promise<AttendanceRegister>;
  getAttendanceForStudent(studentId: string): Promise<AttendanceRegister[]>;
  getAttendanceForParent(guardianId: string): Promise<AttendanceRegister[]>;
  getSchoolAttendanceSummary(
    date: string,
  ): Promise<ReturnType<typeof summarizeRegister>>;
  getPendingAttendanceRegisters(date: string): Promise<string[]>;
  reopenAttendanceRegister(
    registerId: string,
    adminUserId: string,
    reason: string,
  ): Promise<AttendanceRegister>;
  updateAttendanceEntryAsAdmin(
    input: AdminAttendanceEntryInput,
  ): Promise<AttendanceRegister>;
  getAttendanceAuditHistory(
    registerId: string,
  ): Promise<AttendanceAuditEntry[]>;
  reset(): Promise<AttendanceRegister[]>;
}

function audit(
  registerId: string,
  action: AttendanceAuditEntry["action"],
  actorUserId: string,
  actorRole: AttendanceAuditEntry["actorRole"],
  reason?: string,
  previousValue?: string,
  newValue?: string,
): AttendanceAuditEntry {
  return {
    id: `audit-${crypto.randomUUID()}`,
    schoolId: "school-001",
    registerId,
    action,
    actorUserId,
    actorRole,
    reason,
    previousValue,
    newValue,
    createdAt: new Date().toISOString(),
  };
}

function hydrate(register: AttendanceRegister): AttendanceRegister {
  return { ...register, auditHistory: register.auditHistory ?? [] };
}

export class LocalAttendanceRepository implements AttendanceRepository {
  async getAll(context?: AcademicPeriodScope) {
    const items = (await getStoredAttendance()).map(hydrate);
    if (!context?.isReady) return items;
    let changed = false;
    const canMigrateLegacy = context.isCurrentPeriod && /^\d{4}-\d{2}-\d{2}$/.test(context.startDate ?? "");
    for (const item of items) {
      if (item.schoolId === "school-001" && context.schoolId !== "school-001") {
        item.schoolId = context.schoolId;
        changed = true;
      }
      if (!canMigrateLegacy) continue;
      if (item.academicSessionId || item.sessionId || item.termId) continue;
      if (context.startDate && item.date < context.startDate) continue;
      if (context.endDate && item.date > context.endDate) continue;
      Object.assign(item, { academicSessionId: context.academicSessionId, sessionId: context.academicSessionId, termId: context.termId });
      changed = true;
    }
    if (changed) await saveStoredAttendance(items);
    return items.filter((item) => item.schoolId === context.schoolId && (item.academicSessionId ?? item.sessionId) === context.academicSessionId);
  }

  async getAssignedClassesForTeacher(teacherUserId: string) {
    const state = await academicsRepository.getState();
    const assignedIds = new Set(
      state.teacherAssignments
        .filter((item) => item.teacherUserId === teacherUserId)
        .map((item) => item.classId),
    );
    return state.classes
      .filter(
        (item) =>
          item.status === "ACTIVE" &&
          (item.classTeacherUserId === teacherUserId ||
            item.assignedTeacherUserIds.includes(teacherUserId) ||
            assignedIds.has(item.id)),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getClassStudents(classId: string) {
    const state = await academicsRepository.getState();
    return state.students.filter(
      (item) => item.classId === classId && item.status === "ACTIVE",
    );
  }

  async getAttendanceRegister(classId: string, date: string) {
    return (await this.getAll()).find(
      (item) => item.classId === classId && item.date === date,
    );
  }

  private async save(
    input: SaveAttendanceInput,
    status: AttendanceRegister["status"],
  ) {
    const assigned = await this.getAssignedClassesForTeacher(
      input.teacherUserId,
    );
    if (!input.isAdmin && !assigned.some((item) => item.id === input.classId)) {
      throw new Error("You are not assigned to this class.");
    }
    if (!input.date) throw new Error("Select an attendance date.");
    const items = await this.getAll();
    const existing = items.find(
      (item) => item.classId === input.classId && item.date === input.date &&
        (item.academicSessionId ?? item.sessionId) === (input.academicSessionId ?? input.sessionId) &&
        item.termId === input.termId,
    );
    if (!input.isAdmin && !isAttendanceDateEditable(input.date) && existing?.status !== "REOPENED") {
      throw new Error("Teachers can mark past attendance after an administrator reopens that register.");
    }
    if (existing?.status === "SUBMITTED") {
      throw new Error("This attendance register is read-only for teachers.");
    }

    if (status === "SUBMITTED") {
      const requiredStudentIds = existing?.status === "REOPENED"
        ? existing.entries.map((entry) => entry.studentId)
        : (await this.getClassStudents(input.classId)).map((student) => student.id);
      if (
        requiredStudentIds.some(
          (studentId) =>
            !input.entries.some((entry) => entry.studentId === studentId),
        )
      ) {
        throw new Error("Mark every student before submitting attendance.");
      }
    }

    const now = new Date().toISOString();
    const id = existing?.id ?? `register-${input.classId}-${input.date}`;
    const register: AttendanceRegister = {
      id,
      schoolId: input.schoolId ?? existing?.schoolId ?? "school-001",
      classId: input.classId,
      academicSessionId: input.academicSessionId ?? input.sessionId ?? existing?.academicSessionId,
      sessionId: input.sessionId ?? existing?.sessionId,
      termId: input.termId ?? existing?.termId,
      date: input.date,
      status: existing?.status === "REOPENED" && status === "DRAFT" ? "REOPENED" : status,
      teacherUserId: input.teacherUserId,
      submittedAt: status === "SUBMITTED" ? now : existing?.submittedAt,
      submittedByUserId:
        status === "SUBMITTED"
          ? input.teacherUserId
          : existing?.submittedByUserId,
      originallySubmittedAt:
        existing?.originallySubmittedAt ??
        (status === "SUBMITTED" ? now : undefined),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      auditHistory: [
        ...(existing?.auditHistory ?? []),
        audit(
          id,
          existing
            ? status === "SUBMITTED"
              ? "SUBMITTED"
              : "DRAFT_SAVED"
            : "CREATED",
          input.teacherUserId,
          input.isAdmin ? "ADMIN" : "TEACHER",
        ),
      ],
      entries: input.entries.map((entry) => {
        const previous = existing?.entries.find(
          (item) => item.studentId === entry.studentId,
        );
        return {
          id: previous?.id ?? `entry-${id}-${entry.studentId}`,
          schoolId: "school-001",
          registerId: id,
          ...entry,
          markedByUserId: input.teacherUserId,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
      }),
    };
    await saveStoredAttendance(
      existing
        ? items.map((item) => (item.id === id ? register : item))
        : [register, ...items],
    );
    return register;
  }

  async saveAttendanceDraft(input: SaveAttendanceInput) {
    return this.save(input, "DRAFT");
  }

  async submitAttendance(input: SaveAttendanceInput) {
    return this.save(input, "SUBMITTED");
  }

  async getAttendanceForStudent(studentId: string) {
    return (await this.getAll()).filter((item) =>
      item.entries.some((entry) => entry.studentId === studentId),
    );
  }

  async getAttendanceForParent(guardianId: string) {
    const state = await academicsRepository.getState();
    const studentIds = state.students
      .filter((item) => item.guardianIds.includes(guardianId))
      .map((item) => item.id);
    return (await this.getAll()).filter((register) =>
      register.entries.some((entry) => studentIds.includes(entry.studentId)),
    );
  }

  async getSchoolAttendanceSummary(date: string) {
    const registers = (await this.getAll()).filter(
      (item) => item.date === date && item.status === "SUBMITTED",
    );
    const combined: AttendanceRegister = {
      id: "summary",
      schoolId: "school-001",
      classId: "",
      date,
      status: "SUBMITTED",
      teacherUserId: "",
      entries: registers.flatMap((item) => item.entries),
      auditHistory: [],
      createdAt: "",
      updatedAt: "",
    };
    return summarizeRegister(combined, combined.entries.length);
  }

  async getPendingAttendanceRegisters(date: string) {
    const items = await this.getAll();
    const state = await academicsRepository.getState();
    return state.classes
      .filter((item) => item.status === "ACTIVE")
      .map((item) => item.id)
      .filter(
        (classId) =>
          !items.some(
            (item) =>
              item.classId === classId &&
              item.date === date &&
              item.status === "SUBMITTED",
          ),
      );
  }

  async reopenAttendanceRegister(
    registerId: string,
    adminUserId: string,
    reason: string,
  ): Promise<AttendanceRegister> {
    if (!reason.trim()) throw new Error("A correction reason is required.");
    const items = await this.getAll();
    const existing = items.find((item) => item.id === registerId);
    if (!existing) throw new Error("Attendance register not found.");
    if (existing.status !== "SUBMITTED") {
      throw new Error("Only submitted registers can be reopened.");
    }
    const reopened = {
      ...existing,
      status: "REOPENED" as const,
      updatedAt: new Date().toISOString(),
      auditHistory: [
        ...existing.auditHistory,
        audit(
          existing.id,
          "REOPENED",
          adminUserId,
          "ADMIN",
          reason.trim(),
        ),
      ],
    };
    await saveStoredAttendance(
      items.map((item) => (item.id === registerId ? reopened : item)),
    );
    return reopened;
  }

  async updateAttendanceEntryAsAdmin(input: AdminAttendanceEntryInput) {
    if (!input.reason.trim()) throw new Error("A correction reason is required.");
    const items = await this.getAll();
    const register = items.find((item) => item.id === input.registerId);
    if (!register) throw new Error("Attendance register not found.");
    if (register.status !== "REOPENED") {
      throw new Error("Reopen the register before correcting entries.");
    }
    const previous = register.entries.find(
      (item) => item.studentId === input.studentId,
    );
    if (!previous) throw new Error("Student attendance entry not found.");
    const now = new Date().toISOString();
    const updated = {
      ...previous,
      status: input.status,
      note: input.note,
      arrivalTime: input.arrivalTime,
      markedByUserId: input.adminUserId,
      updatedAt: now,
    };
    const next = {
      ...register,
      entries: register.entries.map((item) =>
        item.id === previous.id ? updated : item,
      ),
      updatedAt: now,
      auditHistory: [
        ...register.auditHistory,
        audit(
          register.id,
          "ENTRY_UPDATED",
          input.adminUserId,
          "ADMIN",
          input.reason,
          previous.status,
          input.status,
        ),
      ],
    };
    await saveStoredAttendance(
      items.map((item) => (item.id === register.id ? next : item)),
    );
    return next;
  }

  async getAttendanceAuditHistory(registerId: string) {
    return (
      (await this.getAll()).find((item) => item.id === registerId)
        ?.auditHistory ?? []
    );
  }

  async reset() {
    return resetStoredAttendance();
  }
}

type BackendAttendanceEntry = Partial<AttendanceRegister["entries"][number]> & {
  student?: Partial<Student>;
  classId?: string;
  date?: string;
  sessionId?: string;
  termId?: string;
  markedById?: string;
  register?: BackendAttendanceRegister;
};
type BackendAttendanceRegister = Partial<AttendanceRegister> & {
  attendanceId?: string;
  registerId?: string;
  entries?: BackendAttendanceEntry[];
  audit?: AttendanceAuditEntry[];
  auditHistory?: AttendanceAuditEntry[];
};
type BackendAttendanceRegisterResponse = BackendAttendanceRegister | {
  data?: BackendAttendanceRegister;
  item?: BackendAttendanceRegister;
  register?: BackendAttendanceRegister;
  attendance?: BackendAttendanceRegister;
};
type BackendAttendanceHistory = {
  student?: Partial<Student>;
  studentId?: string;
  summary?: unknown;
  records?: BackendAttendanceEntry[];
  sessionId?: string;
  termId?: string;
};
type BackendAttendanceSummary = Partial<ReturnType<typeof summarizeRegister>>;

function unwrapList<T>(value: T[] | { data?: T[]; items?: T[]; results?: T[]; registers?: T[]; classes?: T[]; students?: T[]; children?: T[]; pending?: T[]; records?: T[] }) {
  return Array.isArray(value) ? value : value.data ?? value.items ?? value.results ?? value.registers ?? value.classes ?? value.students ?? value.children ?? value.pending ?? value.records ?? [];
}

function unwrapRegister(value: BackendAttendanceRegisterResponse): BackendAttendanceRegister {
  const wrapped = value as {
    data?: BackendAttendanceRegister;
    item?: BackendAttendanceRegister;
    register?: BackendAttendanceRegister;
    attendance?: BackendAttendanceRegister;
  };
  return wrapped.register ?? wrapped.attendance ?? wrapped.data ?? wrapped.item ?? (value as BackendAttendanceRegister);
}

function isRegisterListResponse(value: unknown): value is BackendAttendanceRegister[] | { data?: BackendAttendanceRegister[]; items?: BackendAttendanceRegister[]; results?: BackendAttendanceRegister[]; registers?: BackendAttendanceRegister[] } {
  if (Array.isArray(value)) return true;
  if (typeof value !== "object" || value === null) return false;
  const record = value as { data?: unknown; items?: unknown; results?: unknown; registers?: unknown };
  return Array.isArray(record.data) || Array.isArray(record.items) || Array.isArray(record.results) || Array.isArray(record.registers);
}

function mapAttendanceEntry(item: BackendAttendanceEntry, registerId: string): AttendanceRegister["entries"][number] {
  const now = new Date().toISOString();
  return {
    id: item.id ?? `entry-${registerId}-${item.studentId}`,
    schoolId: item.schoolId ?? "school-001",
    registerId: item.registerId ?? registerId,
    studentId: item.studentId ?? item.student?.id ?? "",
    student: item.student,
    status: item.status ?? "ABSENT",
    note: item.note,
    arrivalTime: item.arrivalTime,
    markedByUserId: item.markedByUserId ?? item.markedById ?? "",
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  };
}

function backendDateKey(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function mapAttendanceRegister(item: BackendAttendanceRegister): AttendanceRegister {
  const now = new Date().toISOString();
  const id = item.id ?? item.registerId ?? item.attendanceId ?? `register-${item.classId}-${item.date}`;
  return {
    id,
    schoolId: item.schoolId ?? "school-001",
    classId: item.classId ?? "",
    ...backendAttendancePeriod(item, item.entries),
    date: backendDateKey(item.date ?? now),
    status: item.status ?? "DRAFT",
    teacherUserId: item.teacherUserId ?? "",
    submittedAt: item.submittedAt,
    submittedByUserId: item.submittedByUserId,
    originallySubmittedAt: item.originallySubmittedAt,
    entries: (item.entries ?? []).map((entry) => mapAttendanceEntry(entry, id)),
    auditHistory: item.auditHistory ?? item.audit ?? [],
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  };
}

function registersFromRecords(records: BackendAttendanceEntry[]): AttendanceRegister[] {
  const now = new Date().toISOString();
  const grouped = new Map<string, BackendAttendanceEntry[]>();
  for (const record of records) {
    const registerId = record.registerId ?? record.register?.id ?? `register-${record.classId ?? record.register?.classId}-${backendDateKey(record.date ?? record.register?.date)}`;
    grouped.set(registerId, [...(grouped.get(registerId) ?? []), record]);
  }
  return [...grouped.entries()].map(([id, entries]) => {
    const first = entries[0];
    const register = first.register;
    return {
      id,
      schoolId: register?.schoolId ?? first.schoolId ?? "school-001",
      classId: register?.classId ?? first.classId ?? "",
      ...backendAttendancePeriod(register ?? {}, entries),
      date: backendDateKey(register?.date ?? first.date),
      status: register?.status ?? "SUBMITTED",
      teacherUserId: register?.teacherUserId ?? first.markedByUserId ?? "",
      submittedAt: register?.submittedAt,
      submittedByUserId: register?.submittedByUserId,
      originallySubmittedAt: register?.originallySubmittedAt,
      entries: entries.map((entry) => mapAttendanceEntry(entry, id)),
      auditHistory: register?.auditHistory ?? [],
      createdAt: register?.createdAt ?? first.createdAt ?? now,
      updatedAt: register?.updatedAt ?? first.updatedAt ?? now,
    };
  });
}

function mapAttendanceHistory(value: unknown): AttendanceRegister[] {
  if (isRegisterListResponse(value)) return unwrapList(value).map(mapAttendanceRegister);
  if (typeof value !== "object" || value === null) return [];
  const wrapped = value as { data?: unknown };
  const response = (wrapped.data && typeof wrapped.data === "object" ? wrapped.data : value) as BackendAttendanceHistory & { children?: BackendAttendanceHistory[] };
  const recordsForStudent = (history: BackendAttendanceHistory) =>
    (history.records ?? []).map((record) => ({
      ...record,
      studentId: record.studentId ?? record.student?.id ?? history.studentId ?? history.student?.id,
      sessionId: record.sessionId ?? history.sessionId,
      termId: record.termId ?? history.termId,
    }));
  if (Array.isArray(response.records)) return registersFromRecords(recordsForStudent(response));
  if (Array.isArray(response.children)) {
    return response.children.flatMap((child) => registersFromRecords(recordsForStudent(child)));
  }
  return [];
}

function scopeBackendRegisters(registers: AttendanceRegister[], context?: AcademicPeriodScope) {
  if (!context?.isReady) return registers;
  return registers.map((register) => {
    const sessionId = register.academicSessionId ?? register.sessionId;
    if (sessionId && sessionId !== context.academicSessionId) return register;
    if (register.termId && register.termId !== context.termId) return register;
    if (!dateBelongsToPeriod(register.date, context)) return register;
    return {
      ...register,
      academicSessionId: context.academicSessionId,
      sessionId: context.academicSessionId,
      termId: context.termId,
    };
  });
}

function mapBackendClass(item: Partial<SchoolClass>): SchoolClass {
  const now = new Date().toISOString();
  const name = item.displayName ?? item.name ?? item.baseName ?? "Class";
  return {
    id: item.id ?? "",
    schoolId: item.schoolId ?? "school-001",
    level: item.level ?? "SECONDARY",
    source: item.source ?? "CUSTOM",
    templateKey: item.templateKey,
    baseName: item.baseName ?? name,
    suffix: item.suffix ?? item.section ?? undefined,
    arm: item.arm ?? item.section ?? undefined,
    displayName: item.displayName ?? [name, item.section].filter(Boolean).join(" "),
    name: item.name,
    section: item.section,
    academicYear: item.academicYear,
    sortOrder: item.sortOrder ?? 1000,
    capacity: item.capacity,
    classTeacherUserId: item.classTeacherUserId ?? item.classTeacherId ?? undefined,
    classTeacherId: item.classTeacherId,
    assignedTeacherUserIds: item.assignedTeacherUserIds ?? item.assignedTeacherIds ?? [],
    assignedTeacherIds: item.assignedTeacherIds,
    studentIds: item.studentIds ?? item.students?.map((student) => student.id) ?? [],
    status: item.status ?? "ACTIVE",
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
    students: item.students,
    assignedTeachers: item.assignedTeachers,
  };
}

function mapBackendStudent(item: Partial<Student>): Student {
  const now = new Date().toISOString();
  const parentIds = item.parentIds ?? item.guardianIds ?? [];
  return {
    id: item.id ?? "",
    schoolId: item.schoolId ?? "school-001",
    userId: item.userId,
    currentClassId: item.currentClassId,
    admissionNumber: item.admissionNumber ?? "",
    firstName: item.firstName ?? "",
    middleName: item.middleName,
    lastName: item.lastName ?? "",
    gender: item.gender,
    dateOfBirth: item.dateOfBirth,
    admissionDate: item.admissionDate,
    nationality: item.nationality,
    email: item.email,
    phone: item.phone,
    address: item.address,
    photoUrl: item.photoUrl,
    medicalNotes: item.medicalNotes,
    emergencyContactName: item.emergencyContactName,
    emergencyContactPhone: item.emergencyContactPhone,
    schoolLevel: item.schoolLevel ?? "SECONDARY",
    classId: item.classId ?? item.currentClassId ?? "",
    parentIds,
    guardianIds: parentIds,
    guardianName: item.guardianName ?? "",
    guardianPhone: item.guardianPhone ?? "",
    guardianEmail: item.guardianEmail,
    status: item.status ?? "ACTIVE",
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  };
}

function registerBody(input: SaveAttendanceInput) {
  return {
    teacherUserId: input.teacherUserId || undefined,
    classId: input.classId,
    sessionId: input.sessionId ?? input.academicSessionId,
    termId: input.termId,
    date: input.date,
    entries: input.entries.map((entry) => ({
      studentId: entry.studentId,
      status: entry.status,
      note: entry.note?.trim() || undefined,
    })),
  };
}

function storedBackendRole() {
  try {
    const raw = localStorage.getItem("user");
    const role = raw ? (JSON.parse(raw) as { role?: string }).role : undefined;
    return role?.toUpperCase();
  } catch {
    return undefined;
  }
}

class BackendAttendanceRepository extends LocalAttendanceRepository {
  private hasSession() {
    return Boolean(readStoredToken());
  }

  async getAll(context?: AcademicPeriodScope) {
    if (!this.hasSession()) return super.getAll(context);
    if (context?.isReady && !context.hasBackendIds) {
      throw new Error("The selected academic term is not synchronized with the server.");
    }
    const suffix = context?.isReady ? `?sessionId=${encodeURIComponent(context.academicSessionId)}` : "";
    const role = storedBackendRole();
    if (role === "STUDENT") return scopeBackendRegisters(mapAttendanceHistory(await apiRequest<unknown>(`/attendance/me${suffix}`)), context);
    if (role === "PARENT") return scopeBackendRegisters(mapAttendanceHistory(await apiRequest<unknown>(`/attendance/children${suffix}`)), context);
    const data = await apiRequest<BackendAttendanceRegister[] | { data?: BackendAttendanceRegister[]; items?: BackendAttendanceRegister[]; results?: BackendAttendanceRegister[]; registers?: BackendAttendanceRegister[] }>("/attendance/registers");
    return scopeBackendRegisters(unwrapList(data).map(mapAttendanceRegister), context);
  }

  async getAssignedClassesForTeacher(teacherUserId: string) {
    if (!this.hasSession()) return super.getAssignedClassesForTeacher(teacherUserId);
    const data = await apiRequest<Partial<SchoolClass>[] | { data?: Partial<SchoolClass>[]; items?: Partial<SchoolClass>[]; results?: Partial<SchoolClass>[]; classes?: Partial<SchoolClass>[] }>("/attendance/classes");
    return unwrapList(data).map(mapBackendClass);
  }

  async getClassStudents(classId: string) {
    if (!this.hasSession()) return super.getClassStudents(classId);
    const data = await apiRequest<Partial<Student>[] | { data?: Partial<Student>[]; items?: Partial<Student>[]; results?: Partial<Student>[]; students?: Partial<Student>[] }>(`/attendance/classes/${classId}/students`);
    return unwrapList(data).map(mapBackendStudent);
  }

  async getAttendanceRegister(classId: string, date: string) {
    if (!this.hasSession()) return super.getAttendanceRegister(classId, date);
    const query = new URLSearchParams({ classId, date });
    const data = await apiRequest<BackendAttendanceRegister[] | BackendAttendanceRegisterResponse | { data?: BackendAttendanceRegister[]; items?: BackendAttendanceRegister[]; results?: BackendAttendanceRegister[]; registers?: BackendAttendanceRegister[] }>(`/attendance/registers?${query.toString()}`);
    if (isRegisterListResponse(data)) {
      const [register] = unwrapList(data);
      return register ? mapAttendanceRegister(register) : undefined;
    }
    return mapAttendanceRegister(unwrapRegister(data));
  }

  async saveAttendanceDraft(input: SaveAttendanceInput) {
    if (!this.hasSession()) return super.saveAttendanceDraft(input);
    if (!isUuid(input.termId) || !isUuid(input.sessionId ?? input.academicSessionId)) {
      throw new Error("The selected academic term is not synchronized with the server. Attendance was not saved.");
    }
    return mapAttendanceRegister(unwrapRegister(await apiRequest<BackendAttendanceRegisterResponse>("/attendance/registers/draft", {
      method: "POST",
      body: JSON.stringify(registerBody(input)),
    })));
  }

  async submitAttendance(input: SaveAttendanceInput) {
    if (!this.hasSession()) return super.submitAttendance(input);
    if (!isUuid(input.termId) || !isUuid(input.sessionId ?? input.academicSessionId)) {
      throw new Error("The selected academic term is not synchronized with the server. Attendance was not submitted.");
    }
    return mapAttendanceRegister(unwrapRegister(await apiRequest<BackendAttendanceRegisterResponse>("/attendance/registers/submit", {
      method: "POST",
      body: JSON.stringify(registerBody(input)),
    })));
  }

  async getAttendanceForStudent(studentId: string) {
    if (!this.hasSession()) return super.getAttendanceForStudent(studentId);
    const data = await apiRequest<unknown>(studentId ? `/attendance/students/${studentId}` : "/attendance/me");
    return mapAttendanceHistory(data);
  }

  async getAttendanceForParent(guardianId: string) {
    if (!this.hasSession()) return super.getAttendanceForParent(guardianId);
    const data = await apiRequest<unknown>("/attendance/children");
    return mapAttendanceHistory(data);
  }

  async getSchoolAttendanceSummary(date: string) {
    if (!this.hasSession()) return super.getSchoolAttendanceSummary(date);
    const query = new URLSearchParams({ date });
    const data = await apiRequest<BackendAttendanceSummary>(`/attendance/admin/summary?${query.toString()}`);
    return {
      present: data.present ?? 0,
      absent: data.absent ?? 0,
      late: data.late ?? 0,
      excused: data.excused ?? 0,
      unmarked: data.unmarked ?? 0,
      total: data.total ?? 0,
      percentage: data.percentage ?? 0,
    };
  }

  async getPendingAttendanceRegisters(date: string) {
    if (!this.hasSession()) return super.getPendingAttendanceRegisters(date);
    const query = new URLSearchParams({ date });
    const data = await apiRequest<string[] | Array<{ classId?: string; id?: string }> | { data?: Array<string | { classId?: string; id?: string }>; items?: Array<string | { classId?: string; id?: string }>; results?: Array<string | { classId?: string; id?: string }>; pending?: Array<string | { classId?: string; id?: string }> }>(`/attendance/admin/pending?${query.toString()}`);
    return unwrapList(data).map((item) => typeof item === "string" ? item : item.classId ?? item.id ?? "").filter(Boolean);
  }

  async reopenAttendanceRegister(registerId: string, adminUserId: string, reason: string) {
    if (!this.hasSession()) return super.reopenAttendanceRegister(registerId, adminUserId, reason);
    return mapAttendanceRegister(unwrapRegister(await apiRequest<BackendAttendanceRegisterResponse>(`/attendance/admin/registers/${registerId}/reopen`, {
      method: "POST",
      body: JSON.stringify({ reason: reason.trim() }),
    })));
  }

  async updateAttendanceEntryAsAdmin(input: AdminAttendanceEntryInput) {
    if (!this.hasSession()) return super.updateAttendanceEntryAsAdmin(input);
    return mapAttendanceRegister(unwrapRegister(await apiRequest<BackendAttendanceRegisterResponse>(`/attendance/admin/registers/${input.registerId}/entries/${input.studentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: input.status,
        note: input.note?.trim() || undefined,
        arrivalTime: input.arrivalTime?.trim() || undefined,
        reason: input.reason.trim(),
      }),
    })));
  }

  async getAttendanceAuditHistory(registerId: string) {
    if (!this.hasSession()) return super.getAttendanceAuditHistory(registerId);
    const data = await apiRequest<AttendanceAuditEntry[] | { data?: AttendanceAuditEntry[]; items?: AttendanceAuditEntry[]; results?: AttendanceAuditEntry[]; audit?: AttendanceAuditEntry[] }>(`/attendance/admin/registers/${registerId}/audit`);
    return unwrapList(data);
  }
}

export const attendanceRepository: AttendanceRepository = new BackendAttendanceRepository();
