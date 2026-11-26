import type { ConfiguredSchoolLevel } from "@/types/school-settings";
import { apiRequest, readStoredToken } from "@/lib/api";
import { isUuid } from "@/features/academic-period/academic-period.repository";
import { matchingClassForAcademicSession } from "@/features/academic-period/academic-context";
import { getAssignmentsState } from "@/features/assignments/assignments.storage";
import { getStoredAttendance } from "@/features/attendance/attendance.storage";
import { getFinanceState } from "@/features/finance/finance.storage";
import {
  classTemplates,
  getClassTemplate,
  inferTemplate,
} from "./academics.class-templates";
import { getClassOptions, sortClasses } from "./academics.class-utils";
import {
  getAcademicsState,
  resetAcademicsState,
  saveAcademicsState,
} from "./academics.storage";
import {
  assertUniqueClassName,
  normalizeClassInput,
  normalizeClassUpdate,
} from "./academics.validation";
import type {
  AcademicsState,
  ClassOptionFilters,
  ClassStatus,
  ClassUsage,
  CreateClassInput,
  Guardian,
  SchoolClass,
  StaffInput,
  StaffMember,
  Student,
  StudentDocument,
  StudentEnrollment,
  StudentInput,
  StudentStatus,
  Subject,
  SubjectInput,
  Teacher,
  TeacherClassAssignment,
  TeacherClassAssignmentType,
  UpdateClassInput,
} from "./academics.types";
import {
  canTeacherAccessClass,
  getAccessibleClassesForTeacher,
  getAccessibleStudentsForTeacher,
} from "./academics.selectors";

export interface AcademicsRepository {
  getState(): Promise<AcademicsState>;
  getAllClasses(): Promise<SchoolClass[]>;
  getActiveClasses(): Promise<SchoolClass[]>;
  getClassesByLevel(level: ConfiguredSchoolLevel): Promise<SchoolClass[]>;
  getClassById(classId: string): Promise<SchoolClass | undefined>;
  getClassOptions(filters?: ClassOptionFilters): Promise<
    Array<{ value: string; label: string; description: string }>
  >;
  createClass(input: CreateClassInput): Promise<SchoolClass>;
  createStandardClass(
    templateKey: string,
    input?: Partial<CreateClassInput>,
  ): Promise<SchoolClass>;
  createCustomClass(input: CreateClassInput): Promise<SchoolClass>;
  updateClass(id: string, input: UpdateClassInput): Promise<SchoolClass>;
  setClassOwners(classId: string, classOwnerUserId: string, coOwnerUserIds: string[]): Promise<void>;
  duplicateClass(id: string, suffix?: string): Promise<SchoolClass>;
  reorderClasses(classIds: string[]): Promise<void>;
  setClassStatus(id: string, status: ClassStatus): Promise<void>;
  archiveClass(id: string): Promise<void>;
  removeClass(id: string): Promise<"REMOVED" | "ARCHIVED">;
  getClassUsage(id: string): Promise<ClassUsage>;
  seedDefaultClassTemplates(levels: ConfiguredSchoolLevel[]): Promise<void>;
  setSchoolLevels(levels: ConfiguredSchoolLevel[]): Promise<void>;
  ensureSessionEnrollments(context: EnrollmentContext, carryForwardStudents: boolean): Promise<void>;
  moveStudents(studentIds: string[], classId: string, context: EnrollmentContext): Promise<void>;
  saveTeacherAssignments(input: {
    teacherUserId: string;
    classIds: string[];
    assignmentType: TeacherClassAssignmentType;
    subjectIds: string[];
    assignmentPolicy?: "CO" | "MAIN" | "REPLACE";
    assignmentSnapshot?: TeacherClassAssignment[];
    subjectAssignments?: Array<{ classId: string; subjectIds: string[] }>;
    schoolId?: string;
    academicSessionId?: string;
    termId?: string;
  }): Promise<TeacherClassAssignment[]>;
  createStaff(input: StaffInput): Promise<StaffMember>;
  updateStaff(id: string, input: Partial<StaffInput>): Promise<StaffMember>;
  assignStaffClasses(staffId: string, input: { assignedClassIds: string[]; classTeacherClassIds: string[]; subjectIds?: string[] }): Promise<StaffMember>;
  setStaffStatus(staffId: string, status: "ACTIVE" | "SUSPENDED"): Promise<StaffMember>;
  removeStaff(staffId: string): Promise<void>;
  createSubject(input: SubjectInput): Promise<Subject>;
  createSubjects(inputs: SubjectInput[]): Promise<Subject[]>;
  setSubjectStatus(id: string, status: Subject["status"]): Promise<Subject>;
  removeSubject(id: string): Promise<void>;
  removeTeacherAssignment(id: string, assignmentSnapshot?: TeacherClassAssignment[], period?: { academicSessionId?: string; termId?: string }): Promise<void>;
  createGuardian(input: Omit<Guardian, "id" | "schoolId" | "createdAt" | "updatedAt">): Promise<Guardian>;
  updateGuardian(id: string, input: Partial<Omit<Guardian, "id" | "schoolId" | "createdAt" | "updatedAt">>): Promise<Guardian>;
  createStudent(input: StudentInput, context: EnrollmentContext): Promise<Student>;
  updateStudent(id: string, input: Partial<StudentInput>): Promise<Student>;
  assignStudentParents(studentId: string, guardianIds: string[]): Promise<Student>;
  moveStudentToClass(input: { studentId: string; classId: string; effectiveDate: string; reason: string }, context: EnrollmentContext): Promise<Student>;
  updateStudentStatus(id: string, status: StudentStatus): Promise<Student>;
  addStudentDocument(studentId: string, input: Omit<StudentDocument, "id" | "studentId" | "uploadedAt">): Promise<StudentDocument>;
  removeStudentDocument(id: string): Promise<void>;
  getAccessibleClassesForTeacher(userId: string): Promise<SchoolClass[]>;
  getAccessibleStudentsForTeacher(userId: string): Promise<Student[]>;
  canTeacherAccessClass(userId: string, classId: string): Promise<boolean>;
  reset(): Promise<AcademicsState>;
}

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function generateAdmissionNumber(students: Student[]) {
  const year = new Date().getFullYear();
  const prefix = `ADM-${year}-`;
  const used = students
    .map((student) => Number(student.admissionNumber.slice(prefix.length)))
    .filter((value) => Number.isInteger(value) && value > 0);
  return `${prefix}${String((used.length ? Math.max(...used) : 0) + 1).padStart(4, "0")}`;
}

function splitName(name: string) {
  const parts = name.trim().replace(/\s+/g, " ").split(" ");
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || parts[0] || "",
  };
}

function staffToTeacher(item: StaffMember): Teacher | null {
  if (!item.isTeachingStaff) return null;
  return {
    id: item.id,
    schoolId: item.schoolId,
    userId: item.userId,
    staffId: item.staffId ?? item.employeeNumber ?? item.id,
    firstName: item.firstName,
    lastName: item.lastName,
    role: item.role,
    jobTitle: item.jobTitle,
    department: item.department,
    phone: item.phone,
    email: item.email,
    photoUrl: item.photoUrl,
    subjectIds: item.subjectIds,
    status: item.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export class LocalAcademicsRepository implements AcademicsRepository {
  async ensureSessionEnrollments(context: EnrollmentContext, carryForwardStudents: boolean) {
    if (!context.schoolId || !context.academicSessionId || !carryForwardStudents) return;
    const state = await this.getState();
    const now = new Date().toISOString();
    let changed = false;
    const targetClasses = state.classes.filter((item) => {
      if (item.schoolId !== context.schoolId || item.status !== "ACTIVE") return false;
      if (item.academicSessionId) return item.academicSessionId === context.academicSessionId;
      if (item.academicYear?.trim() && context.academicSessionName) {
        return item.academicYear.trim().toLowerCase() === context.academicSessionName.trim().toLowerCase();
      }
      return true;
    });
    for (const student of state.students) {
      if (student.schoolId !== context.schoolId || student.status !== "ACTIVE") continue;
      const existingEnrollment = state.studentEnrollments.find((item) => item.studentId === student.id && item.academicSessionId === context.academicSessionId);
      if (existingEnrollment && (existingEnrollment.status !== "ACTIVE" || existingEnrollment.classId)) continue;
      const previousEnrollment = context.previousAcademicSessionId
        ? state.studentEnrollments.find((item) => item.studentId === student.id && item.academicSessionId === context.previousAcademicSessionId && item.status === "ACTIVE")
        : undefined;
      const sourceClassId = previousEnrollment?.classId || student.classId;
      const sourceClass = sourceClassId
        ? state.classes.find((item) => item.id === sourceClassId && item.schoolId === context.schoolId)
        : undefined;
      const classId = sourceClass
        ? matchingClassForAcademicSession(sourceClass, targetClasses)?.id ?? sourceClass.id
        : "";
      if (existingEnrollment) Object.assign(existingEnrollment, { classId, updatedAt: now });
      else state.studentEnrollments.push({
        id: createId("enrollment"), schoolId: context.schoolId, studentId: student.id,
        academicSessionId: context.academicSessionId, classId,
        status: "ACTIVE", createdAt: now, updatedAt: now,
      });
      changed = true;
    }
    if (changed) await saveAcademicsState(state);
  }

  async getState() {
    return getAcademicsState();
  }

  async getAllClasses() {
    return sortClasses((await this.getState()).classes);
  }

  async getActiveClasses() {
    return (await this.getAllClasses()).filter(
      (item) => item.status === "ACTIVE",
    );
  }

  async getClassesByLevel(level: ConfiguredSchoolLevel) {
    return (await this.getAllClasses()).filter((item) => item.level === level);
  }

  async getClassById(classId: string) {
    return (await this.getState()).classes.find((item) => item.id === classId);
  }

  async getClassOptions(filters: ClassOptionFilters = {}) {
    return getClassOptions(await this.getState(), filters);
  }

  async createClass(input: CreateClassInput) {
    const state = await this.getState();
    const normalized = normalizeClassInput(input);
    assertUniqueClassName(state.classes.filter((item) => item.academicSessionId === normalized.academicSessionId), normalized.displayName);
    const now = new Date().toISOString();
    const created: SchoolClass = {
      ...normalized,
      id: createId("class"),
      schoolId: normalized.schoolId ?? "school-001",
      arm: normalized.suffix,
      sortOrder:
        getClassTemplate(normalized.templateKey)?.defaultSortOrder ??
        Math.max(0, ...state.classes.map((item) => item.sortOrder)) + 10,
      assignedTeacherUserIds: [
        ...new Set(normalized.assignedTeacherUserIds ?? []),
      ],
      studentIds: [],
      createdAt: now,
      updatedAt: now,
    };
    state.classes = sortClasses([...state.classes, created]);
    await saveAcademicsState(state);
    return created;
  }

  async createStandardClass(
    templateKey: string,
    input: Partial<CreateClassInput> = {},
  ) {
    const template = getClassTemplate(templateKey);
    if (!template) throw new Error("Class template was not found.");
    return this.createClass({
      level: template.level,
      source: "STANDARD",
      templateKey,
      baseName: template.defaultName,
      suffix: input.suffix,
      capacity: input.capacity ?? 40,
      classTeacherUserId: input.classTeacherUserId,
      assignedTeacherUserIds: input.assignedTeacherUserIds,
      schoolId: input.schoolId,
      academicYear: input.academicYear,
      academicSessionId: input.academicSessionId,
      status: input.status ?? "ACTIVE",
    });
  }

  async createCustomClass(input: CreateClassInput) {
    return this.createClass({
      ...input,
      source: "CUSTOM",
      templateKey: undefined,
    });
  }

  async updateClass(classId: string, input: UpdateClassInput) {
    const state = await this.getState();
    const existing = state.classes.find((item) => item.id === classId);
    if (!existing) throw new Error("Class not found.");
    const normalized = normalizeClassUpdate(existing, input);
    assertUniqueClassName(state.classes, normalized.displayName, classId);
    Object.assign(existing, normalized, {
      arm: normalized.suffix,
      updatedAt: new Date().toISOString(),
    });
    state.classes = sortClasses(state.classes);
    await saveAcademicsState(state);
    return existing;
  }

  async duplicateClass(classId: string, suffix = "") {
    const source = await this.getClassById(classId);
    if (!source) throw new Error("Class not found.");
    return this.createClass({
      level: source.level,
      source: source.source,
      templateKey: source.templateKey,
      baseName: source.baseName,
      suffix,
      capacity: source.capacity,
      assignedTeacherUserIds: [],
      schoolId: source.schoolId,
      academicYear: source.academicYear,
      academicSessionId: source.academicSessionId,
      status: "ACTIVE",
    });
  }

  async reorderClasses(classIds: string[]) {
    const state = await this.getState();
    if (new Set(classIds).size !== classIds.length) {
      throw new Error("Class order contains duplicate IDs.");
    }
    const known = new Set(state.classes.map((item) => item.id));
    if (
      classIds.length !== state.classes.length ||
      classIds.some((id) => !known.has(id))
    ) {
      throw new Error("Class order must include every configured class.");
    }
    const order = new Map(classIds.map((id, index) => [id, index * 10]));
    state.classes = state.classes.map((item) => ({
      ...item,
      sortOrder: order.get(item.id) ?? item.sortOrder,
      updatedAt: new Date().toISOString(),
    }));
    await saveAcademicsState(state);
  }

  async setClassOwners(classId: string, classOwnerUserId: string, coOwnerUserIds: string[]) {
    const state = await this.getState();
    const schoolClass = state.classes.find((item) => item.id === classId);
    if (!schoolClass) throw new Error("Class not found.");
    const uniqueCoOwners = [...new Set(coOwnerUserIds)].filter((id) => id !== classOwnerUserId);
    schoolClass.classTeacherUserId = classOwnerUserId;
    schoolClass.classTeacherId = classOwnerUserId;
    schoolClass.classOwnerAssignments = [
      { userId: classOwnerUserId, assignmentRole: "MAIN" },
      ...uniqueCoOwners.map((userId) => ({ userId, assignmentRole: "CO" as const })),
    ];
    schoolClass.assignedTeacherUserIds = [...new Set([...schoolClass.assignedTeacherUserIds, classOwnerUserId, ...uniqueCoOwners])];
    state.teacherAssignments = state.teacherAssignments.filter((item) => item.classId !== classId || item.assignmentType !== "CLASS_TEACHER");
    const ownerAssignments: Array<[string, "MAIN" | "CO"]> = [
      [classOwnerUserId, "MAIN"],
      ...uniqueCoOwners.map((id): [string, "MAIN" | "CO"] => [id, "CO"]),
    ];
    for (const [userId, assignmentRole] of ownerAssignments) {
      state.teacherAssignments.push({
        id: `owner-${classId}-${userId}`, schoolId: schoolClass.schoolId, teacherUserId: userId,
        classId, assignmentType: "CLASS_TEACHER", assignmentRole, subjectIds: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }
    await saveAcademicsState(state);
  }

  async setClassStatus(classId: string, status: ClassStatus) {
    await this.updateClass(classId, { status });
  }

  async archiveClass(classId: string) {
    await this.setClassStatus(classId, "ARCHIVED");
  }

  async getClassUsage(classId: string): Promise<ClassUsage> {
    const [state, attendance, assignmentState, finance] = await Promise.all([
      this.getState(),
      getStoredAttendance(),
      getAssignmentsState(),
      getFinanceState(),
    ]);
    const students = state.students.filter(
      (item) => item.classId === classId,
    ).length;
    const teacherAssignments = state.teacherAssignments.filter(
      (item) => item.classId === classId,
    ).length;
    const attendanceRecords = attendance.filter(
      (item) => item.classId === classId,
    ).length;
    const assignments = assignmentState.assignments.filter(
      (item) => item.classId === classId,
    ).length;
    const financeRecords =
      finance.feeStructures.filter((item) =>
        item.classIds?.includes(classId),
      ).length +
      finance.invoices.filter((item) => item.classId === classId).length;
    return {
      students,
      teacherAssignments,
      attendanceRecords,
      assignments,
      financeRecords,
      total:
        students +
        teacherAssignments +
        attendanceRecords +
        assignments +
        financeRecords,
    };
  }

  async removeClass(classId: string) {
    const usage = await this.getClassUsage(classId);
    if (usage.total > 0) {
      await this.archiveClass(classId);
      return "ARCHIVED" as const;
    }
    const state = await this.getState();
    if (!state.classes.some((item) => item.id === classId)) {
      throw new Error("Class not found.");
    }
    state.classes = state.classes.filter((item) => item.id !== classId);
    await saveAcademicsState(state);
    return "REMOVED" as const;
  }

  async seedDefaultClassTemplates(levels: ConfiguredSchoolLevel[]) {
    const state = await this.getState();
    const existing = new Set(
      state.classes.map((item) => item.templateKey).filter(Boolean),
    );
    for (const template of classTemplates.filter(
      (item) => levels.includes(item.level) && !existing.has(item.key),
    )) {
      await this.createStandardClass(template.key, { status: "INACTIVE" });
    }
  }

  async setSchoolLevels(levels: ConfiguredSchoolLevel[]) {
    const state = await this.getState();
    state.classes = state.classes.map((item) =>
      !levels.includes(item.level) && item.status === "ACTIVE"
        ? {
            ...item,
            status: "INACTIVE",
            updatedAt: new Date().toISOString(),
          }
        : item,
    );
    await saveAcademicsState(state);
  }

  async moveStudents(studentIds: string[], classId: string, context: EnrollmentContext) {
    const state = await this.getState();
    const target = state.classes.find(
      (item) => item.id === classId && item.status === "ACTIVE",
    );
    if (!target) throw new Error("Select an active destination class.");
    if (!context.academicSessionId || target.schoolId !== context.schoolId) throw new Error("Invalid academic session or school.");
    const now = new Date().toISOString();
    for (const student of state.students.filter((item) =>
      studentIds.includes(item.id),
    )) {
      if (student.schoolId !== context.schoolId) throw new Error("Student does not belong to this school.");
      student.schoolLevel = target.level;
      student.updatedAt = now;
      const enrollment = state.studentEnrollments.find((item) => item.studentId === student.id && item.academicSessionId === context.academicSessionId);
      if (enrollment) Object.assign(enrollment, { classId, status: "ACTIVE", updatedAt: now });
      else state.studentEnrollments.push({ id: createId("enrollment"), schoolId: context.schoolId, studentId: student.id, academicSessionId: context.academicSessionId, classId, status: "ACTIVE", createdAt: now, updatedAt: now });
    }
    for (const item of state.classes) {
      item.studentIds = state.studentEnrollments
        .filter((entry) => entry.academicSessionId === context.academicSessionId && entry.classId === item.id && entry.status === "ACTIVE")
        .map((entry) => entry.studentId);
    }
    await saveAcademicsState(state);
  }

  async createGuardian(
    input: Omit<Guardian, "id" | "schoolId" | "createdAt" | "updatedAt">,
  ) {
    const state = await this.getState();
    const duplicate = state.guardians.find(
      (item) =>
        (input.email &&
          item.email?.toLowerCase() === input.email.toLowerCase()) ||
        item.phone.replace(/\s/g, "") === input.phone.replace(/\s/g, ""),
    );
    if (duplicate) return duplicate;
    const now = new Date().toISOString();
    const guardian: Guardian = {
      ...input,
      id: createId("guardian"),
      schoolId: "school-001",
      createdAt: now,
      updatedAt: now,
    };
    state.guardians.push(guardian);
    await saveAcademicsState(state);
    return guardian;
  }

  async updateGuardian(
    id: string,
    input: Partial<Omit<Guardian, "id" | "schoolId" | "createdAt" | "updatedAt">>,
  ) {
    const state = await this.getState();
    const guardian = state.guardians.find((item) => item.id === id);
    if (!guardian) throw new Error("Parent not found.");
    Object.assign(guardian, input, { updatedAt: new Date().toISOString() });
    await saveAcademicsState(state);
    return guardian;
  }

  async createStudent(input: StudentInput, context: EnrollmentContext) {
    const state = await this.getState();
    const admissionNumber = input.admissionNumber.trim() || generateAdmissionNumber(state.students);
    if (!input.firstName.trim() || !input.lastName.trim()) {
      throw new Error("First name and last name are required.");
    }
    if (
      state.students.some(
        (item) =>
          item.admissionNumber.toLowerCase() === admissionNumber.toLowerCase(),
      )
    ) {
      throw new Error("Admission number already exists.");
    }
    const schoolClass = state.classes.find(
      (item) =>
        item.id === input.classId &&
        item.level === input.schoolLevel &&
        item.status === "ACTIVE",
    );
    if (!schoolClass) {
      throw new Error("Select a valid active class for this school type.");
    }
    if (!context.academicSessionId || schoolClass.schoolId !== context.schoolId) throw new Error("Invalid academic session or school.");
    const now = new Date().toISOString();
    const created: Student = {
      ...input,
      admissionNumber,
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim() || undefined,
      lastName: input.lastName.trim(),
      id: createId("student"),
      schoolId: context.schoolId,
      createdAt: now,
      updatedAt: now,
    };
    state.students.push(created);
    state.studentEnrollments.push({ id: createId("enrollment"), schoolId: context.schoolId, studentId: created.id, academicSessionId: context.academicSessionId, classId: schoolClass.id, status: "ACTIVE", createdAt: now, updatedAt: now });
    schoolClass.studentIds = [...new Set([...schoolClass.studentIds, created.id])];
    state.studentActivities.unshift({
      id: createId("activity"),
      studentId: created.id,
      action: "Student created",
      detail: `${created.firstName} ${created.lastName} was added to ${schoolClass.displayName}.`,
      createdAt: now,
    });
    await saveAcademicsState(state);
    return created;
  }

  async updateStudent(id: string, input: Partial<StudentInput>) {
    const state = await this.getState();
    const student = state.students.find((item) => item.id === id);
    if (!student) throw new Error("Student not found.");
    if (
      input.admissionNumber &&
      state.students.some(
        (item) =>
          item.id !== id &&
          item.admissionNumber.toLowerCase() ===
            input.admissionNumber?.trim().toLowerCase(),
      )
    ) {
      throw new Error("Admission number already exists.");
    }
    if (input.classId && input.classId !== student.classId) {
      const target = state.classes.find(
        (item) => item.id === input.classId && item.status === "ACTIVE",
      );
      if (!target) throw new Error("Select a valid active class.");
      input.schoolLevel = target.level;
    }
    Object.assign(student, input, {
      admissionNumber: input.admissionNumber?.trim() ?? student.admissionNumber,
      firstName: input.firstName?.trim() ?? student.firstName,
      middleName:
        input.middleName !== undefined
          ? input.middleName.trim() || undefined
          : student.middleName,
      lastName: input.lastName?.trim() ?? student.lastName,
      updatedAt: new Date().toISOString(),
    });
    for (const schoolClass of state.classes) {
      schoolClass.studentIds = state.students
        .filter((item) => item.classId === schoolClass.id)
        .map((item) => item.id);
    }
    await saveAcademicsState(state);
    return student;
  }

  async assignStudentParents(studentId: string, guardianIds: string[]) {
    const state = await this.getState();
    const student = state.students.find((item) => item.id === studentId);
    if (!student) throw new Error("Student not found.");
    const guardians = state.guardians.filter((item) => guardianIds.includes(item.id));
    Object.assign(student, {
      parentIds: guardianIds,
      guardianIds,
      guardianName: guardians[0]?.fullName ?? "",
      guardianPhone: guardians[0]?.phone ?? "",
      guardianEmail: guardians[0]?.email,
      updatedAt: new Date().toISOString(),
    });
    await saveAcademicsState(state);
    return student;
  }

  async moveStudentToClass(input: {
    studentId: string;
    classId: string;
    effectiveDate: string;
    reason: string;
  }, context: EnrollmentContext) {
    if (!input.reason.trim()) throw new Error("Enter a reason for the move.");
    const state = await this.getState();
    const student = state.students.find((item) => item.id === input.studentId);
    const target = state.classes.find(
      (item) => item.id === input.classId && item.status === "ACTIVE",
    );
    if (!student || !target) throw new Error("Student or destination class not found.");
    if (!context.academicSessionId || student.schoolId !== context.schoolId || target.schoolId !== context.schoolId) throw new Error("Invalid academic session or school.");
    const enrollment = state.studentEnrollments.find((item) => item.studentId === student.id && item.academicSessionId === context.academicSessionId);
    const previousClassId = enrollment?.classId;
    student.schoolLevel = target.level;
    student.updatedAt = new Date().toISOString();
    const now = new Date().toISOString();
    if (enrollment) Object.assign(enrollment, { classId: target.id, status: "ACTIVE", updatedAt: now });
    else state.studentEnrollments.push({ id: createId("enrollment"), schoolId: context.schoolId, studentId: student.id, academicSessionId: context.academicSessionId, classId: target.id, status: "ACTIVE", createdAt: now, updatedAt: now });
    for (const schoolClass of state.classes) {
      schoolClass.studentIds = state.studentEnrollments
        .filter((item) => item.academicSessionId === context.academicSessionId && item.classId === schoolClass.id && item.status === "ACTIVE")
        .map((item) => item.studentId);
    }
    state.studentClassHistory.unshift({
      id: createId("class-history"),
      studentId: student.id,
      fromClassId: previousClassId,
      toClassId: target.id,
      effectiveDate: input.effectiveDate,
      reason: input.reason.trim(),
      createdAt: now,
    });
    state.studentActivities.unshift({
      id: createId("activity"),
      studentId: student.id,
      action: "Class changed",
      detail: `Moved to ${target.displayName}. Reason: ${input.reason.trim()}`,
      createdAt: now,
    });
    await saveAcademicsState(state);
    return student;
  }

  async updateStudentStatus(id: string, status: StudentStatus) {
    const state = await this.getState();
    const student = state.students.find((item) => item.id === id);
    if (!student) throw new Error("Student not found.");
    student.status = status;
    student.updatedAt = new Date().toISOString();
    state.studentActivities.unshift({
      id: createId("activity"),
      studentId: id,
      action: "Student status changed",
      detail: `Status changed to ${status.toLowerCase()}.`,
      createdAt: student.updatedAt,
    });
    await saveAcademicsState(state);
    return student;
  }

  async addStudentDocument(
    studentId: string,
    input: Omit<StudentDocument, "id" | "studentId" | "uploadedAt">,
  ) {
    const state = await this.getState();
    if (!state.students.some((item) => item.id === studentId)) {
      throw new Error("Student not found.");
    }
    const document: StudentDocument = {
      ...input,
      id: createId("document"),
      studentId,
      uploadedAt: new Date().toISOString(),
    };
    state.studentDocuments.unshift(document);
    await saveAcademicsState(state);
    return document;
  }

  async removeStudentDocument(id: string) {
    const state = await this.getState();
    state.studentDocuments = state.studentDocuments.filter(
      (item) => item.id !== id,
    );
    await saveAcademicsState(state);
  }

  async saveTeacherAssignments(input: {
    teacherUserId: string;
    classIds: string[];
    assignmentType: TeacherClassAssignmentType;
    subjectIds: string[];
    assignmentPolicy?: "CO" | "MAIN" | "REPLACE";
    assignmentSnapshot?: TeacherClassAssignment[];
    subjectAssignments?: Array<{ classId: string; subjectIds: string[] }>;
    schoolId?: string;
    academicSessionId?: string;
    termId?: string;
  }) {
    if (!input.teacherUserId || !input.classIds.length) {
      throw new Error("Select a teacher and at least one class.");
    }
    if (
      input.assignmentType === "SUBJECT_TEACHER" &&
      !input.subjectIds.length
    ) {
      throw new Error("Select at least one subject for a subject teacher.");
    }
    const state = await this.getState();
    const now = new Date().toISOString();
    const created: TeacherClassAssignment[] = [];
    for (const classId of input.classIds) {
      for (const snapshot of input.assignmentSnapshot ?? []) {
        if (snapshot.classId !== classId || snapshot.isRemoved) continue;
        const exists = state.teacherAssignments.some((item) =>
          item.teacherUserId === snapshot.teacherUserId && item.classId === classId &&
          item.assignmentType === snapshot.assignmentType && item.subjectIds.join(",") === snapshot.subjectIds.join(",") &&
          item.academicSessionId === input.academicSessionId && item.termId === input.termId,
        );
        if (!exists) state.teacherAssignments.push({
          ...snapshot,
          id: createId("tca"),
          classId,
          className: state.classes.find((item) => item.id === classId)?.displayName ?? snapshot.className,
          academicSessionId: input.academicSessionId,
          termId: input.termId,
          createdAt: now,
          updatedAt: now,
        });
      }
      const scopedExisting = state.teacherAssignments.filter((item) =>
        item.classId === classId &&
        item.teacherUserId !== input.teacherUserId &&
        item.academicSessionId === input.academicSessionId &&
        item.termId === input.termId,
      );
      const conflicting = scopedExisting.filter((item) =>
        (input.assignmentType === "CLASS_TEACHER" && item.assignmentType === "CLASS_TEACHER") ||
        (item.assignmentType === "SUBJECT_TEACHER" && item.subjectIds.some((subjectId) => input.subjectIds.includes(subjectId))),
      );
      const policy = input.assignmentPolicy ?? (conflicting.length ? "CO" : "MAIN");
      if (policy === "REPLACE") {
        const replacedIds = new Set(conflicting.map((item) => item.id));
        state.teacherAssignments = state.teacherAssignments.filter((item) => !replacedIds.has(item.id));
      } else {
        for (const assignment of conflicting) {
          if (policy === "MAIN") assignment.assignmentRole = "CO";
          else if (!assignment.assignmentRole) assignment.assignmentRole = "MAIN";
        }
      }
      state.teacherAssignments = state.teacherAssignments.filter(
        (item) => !(item.teacherUserId === input.teacherUserId && item.classId === classId && item.academicSessionId === input.academicSessionId && item.termId === input.termId),
      );
      if (input.assignmentType === "CLASS_TEACHER" || !input.subjectIds.length) {
        const assignment: TeacherClassAssignment = {
          id: createId("tca"),
          schoolId: input.schoolId ?? "school-001",
          teacherUserId: input.teacherUserId,
          classId,
          className: state.classes.find((item) => item.id === classId)?.displayName,
          academicSessionId: input.academicSessionId,
          termId: input.termId,
          assignmentType: input.assignmentType === "CLASS_TEACHER" ? "CLASS_TEACHER" : "GENERAL_ACCESS",
          assignmentRole: policy === "CO" && conflicting.some((item) => item.assignmentType === "CLASS_TEACHER") ? "CO" : "MAIN",
          subjectIds: [],
          createdAt: now,
          updatedAt: now,
        };
        state.teacherAssignments.push(assignment);
        created.push(assignment);
      }
      for (const subjectId of input.subjectIds) {
        const assignment: TeacherClassAssignment = {
          id: createId("tca"),
          schoolId: input.schoolId ?? "school-001",
          teacherUserId: input.teacherUserId,
          classId,
          className: state.classes.find((item) => item.id === classId)?.displayName,
          academicSessionId: input.academicSessionId,
          termId: input.termId,
          assignmentType: "SUBJECT_TEACHER",
          assignmentRole: policy === "CO" && conflicting.some((item) => item.assignmentType === "SUBJECT_TEACHER" && item.subjectIds.includes(subjectId)) ? "CO" : "MAIN",
          subjectIds: [subjectId],
          createdAt: now,
          updatedAt: now,
        };
        state.teacherAssignments.push(assignment);
        created.push(assignment);
      }
      const schoolClass = state.classes.find((item) => item.id === classId);
      if (schoolClass) {
        schoolClass.assignedTeacherUserIds = [
          ...new Set([
            ...schoolClass.assignedTeacherUserIds,
            input.teacherUserId,
          ]),
        ];
        if (input.assignmentType === "CLASS_TEACHER" && policy !== "CO") {
          schoolClass.classTeacherUserId = input.teacherUserId;
        }
      }
    }
    const staff = state.staff.find((item) => item.userId === input.teacherUserId);
    if (staff) {
      if (input.assignmentType === "CLASS_TEACHER") {
        staff.classTeacherClassIds = [...new Set([...staff.classTeacherClassIds, ...input.classIds])];
      } else {
        staff.assignedClassIds = [...new Set([...staff.assignedClassIds, ...input.classIds])];
      }
      if (input.subjectIds.length) {
        staff.subjectIds = [...new Set([...staff.subjectIds, ...input.subjectIds])];
      }
      staff.updatedAt = now;
      state.teachers = state.staff.map(staffToTeacher).filter((item): item is Teacher => item !== null);
    }
    await saveAcademicsState(state);
    return created;
  }

  async createStaff(input: StaffInput) {
    const state = await this.getState();
    const fullName = input.name.trim().replace(/\s+/g, " ");
    if (!fullName || !input.email.trim() || !input.jobTitle.trim()) {
      throw new Error("Name, email and role are required.");
    }
    if (state.staff.some((item) => item.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw new Error("A staff member already uses this email address.");
    }
    const now = new Date().toISOString();
    const { firstName, lastName } = splitName(fullName);
    const staff: StaffMember = {
      id: createId("staff"),
      userId: createId("user"),
      schoolId: "school-001",
      staffId: input.employeeNumber?.trim() || undefined,
      employeeNumber: input.employeeNumber?.trim() || undefined,
      firstName,
      lastName,
      fullName,
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || undefined,
      salaryAmount: input.salaryAmount,
      photoUrl: input.photoUrl?.trim() || undefined,
      role: input.isTeachingStaff ? "TEACHER" : "STAFF",
      jobTitle: input.jobTitle.trim(),
      department: input.department?.trim() || undefined,
      isTeachingStaff: input.isTeachingStaff,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth || undefined,
      address: input.address?.trim() || undefined,
      assignedClassIds: input.isTeachingStaff ? input.assignedClassIds ?? [] : [],
      classTeacherClassIds: input.isTeachingStaff ? input.classTeacherClassIds ?? [] : [],
      subjectIds: input.isTeachingStaff ? input.subjectIds ?? [] : [],
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    state.staff.unshift(staff);
    const teacher = staffToTeacher(staff);
    if (teacher) {
      state.teachers = [teacher, ...state.teachers.filter((item) => item.userId !== teacher.userId)];
      await this.applyLocalStaffAssignments(state, staff);
    }
    await saveAcademicsState(state);
    return staff;
  }

  async updateStaff(id: string, input: Partial<StaffInput>) {
    const state = await this.getState();
    const staff = state.staff.find((item) => item.id === id || item.userId === id);
    if (!staff) throw new Error("Staff member not found.");
    if (input.name !== undefined) {
      const fullName = input.name.trim().replace(/\s+/g, " ");
      if (!fullName) throw new Error("Name is required.");
      const names = splitName(fullName);
      staff.fullName = fullName;
      staff.firstName = names.firstName;
      staff.lastName = names.lastName;
    }
    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase();
      if (
        state.staff.some(
          (item) => item.id !== staff.id && item.email.toLowerCase() === email,
        )
      ) {
        throw new Error("A staff member already uses this email address.");
      }
      staff.email = email;
    }
    if (input.jobTitle !== undefined) staff.jobTitle = input.jobTitle.trim();
    if (input.employeeNumber !== undefined) {
      staff.employeeNumber = input.employeeNumber.trim() || undefined;
      staff.staffId = staff.employeeNumber;
    }
    if (input.phone !== undefined) staff.phone = input.phone.trim() || undefined;
    if (input.department !== undefined) staff.department = input.department.trim() || undefined;
    if (input.salaryAmount !== undefined) staff.salaryAmount = input.salaryAmount;
    if (input.gender !== undefined) staff.gender = input.gender;
    if (input.dateOfBirth !== undefined) staff.dateOfBirth = input.dateOfBirth || undefined;
    if (input.address !== undefined) staff.address = input.address.trim() || undefined;
    if (input.photoUrl !== undefined) staff.photoUrl = input.photoUrl.trim() || undefined;
    if (input.isTeachingStaff !== undefined) {
      staff.isTeachingStaff = input.isTeachingStaff;
      staff.role = input.isTeachingStaff ? "TEACHER" : "STAFF";
    }
    if (staff.isTeachingStaff) {
      if (input.assignedClassIds !== undefined) staff.assignedClassIds = input.assignedClassIds;
      if (input.classTeacherClassIds !== undefined) staff.classTeacherClassIds = input.classTeacherClassIds;
      if (input.subjectIds !== undefined) staff.subjectIds = input.subjectIds;
      await this.applyLocalStaffAssignments(state, staff);
    } else {
      staff.assignedClassIds = [];
      staff.classTeacherClassIds = [];
      staff.subjectIds = [];
      state.teacherAssignments = state.teacherAssignments.filter((item) => item.teacherUserId !== staff.userId);
      state.classes = state.classes.map((item) => ({
        ...item,
        classTeacherUserId: item.classTeacherUserId === staff.userId ? undefined : item.classTeacherUserId,
        assignedTeacherUserIds: item.assignedTeacherUserIds.filter((teacherUserId) => teacherUserId !== staff.userId),
      }));
    }
    staff.updatedAt = new Date().toISOString();
    state.teachers = state.staff.map(staffToTeacher).filter((item): item is Teacher => item !== null);
    await saveAcademicsState(state);
    return staff;
  }

  private async applyLocalStaffAssignments(state: AcademicsState, staff: StaffMember) {
    state.teacherAssignments = state.teacherAssignments.filter((item) => item.teacherUserId !== staff.userId);
    for (const classId of staff.assignedClassIds) {
      if (!state.classes.some((item) => item.id === classId && item.status === "ACTIVE")) continue;
      state.teacherAssignments.push({
        id: createId("tca"),
        schoolId: staff.schoolId,
        teacherUserId: staff.userId,
        classId,
        assignmentType: "GENERAL_ACCESS",
        subjectIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      for (const subjectId of staff.subjectIds) {
        state.teacherAssignments.push({
          id: createId("tca"),
          schoolId: staff.schoolId,
          teacherUserId: staff.userId,
          classId,
          assignmentType: subjectId ? "SUBJECT_TEACHER" : "GENERAL_ACCESS",
          subjectIds: subjectId ? [subjectId] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    for (const schoolClass of state.classes) {
      if (schoolClass.classTeacherUserId === staff.userId && !staff.classTeacherClassIds.includes(schoolClass.id)) {
        schoolClass.classTeacherUserId = undefined;
      }
      if (staff.classTeacherClassIds.includes(schoolClass.id)) {
        schoolClass.classTeacherUserId = staff.userId;
      }
      schoolClass.assignedTeacherUserIds = [
        ...new Set(state.teacherAssignments.filter((item) => item.classId === schoolClass.id).map((item) => item.teacherUserId)),
      ];
    }
  }

  async assignStaffClasses(staffId: string, input: { assignedClassIds: string[]; classTeacherClassIds: string[]; subjectIds?: string[] }) {
    const state = await this.getState();
    const staff = state.staff.find((item) => item.id === staffId || item.userId === staffId);
    if (!staff || !staff.isTeachingStaff) throw new Error("Select a teaching staff member.");
    staff.assignedClassIds = input.assignedClassIds;
    staff.classTeacherClassIds = input.classTeacherClassIds;
    staff.subjectIds = input.subjectIds ?? staff.subjectIds;
    staff.updatedAt = new Date().toISOString();
    await this.applyLocalStaffAssignments(state, staff);
    await saveAcademicsState(state);
    return staff;
  }

  async setStaffStatus(staffId: string, status: "ACTIVE" | "SUSPENDED") {
    const state = await this.getState();
    const staff = state.staff.find((item) => item.id === staffId || item.userId === staffId);
    if (!staff) throw new Error("Staff member not found.");
    staff.status = status;
    staff.updatedAt = new Date().toISOString();
    state.teachers = state.staff.map(staffToTeacher).filter((item): item is Teacher => item !== null);
    await saveAcademicsState(state);
    return staff;
  }

  async removeStaff(staffId: string) {
    const state = await this.getState();
    const staff = state.staff.find((item) => item.id === staffId || item.userId === staffId);
    if (!staff) throw new Error("Staff member not found.");
    state.staff = state.staff.filter((item) => item.id !== staff.id && item.userId !== staff.userId);
    state.teachers = state.staff.map(staffToTeacher).filter((item): item is Teacher => item !== null);
    state.teacherAssignments = state.teacherAssignments.filter((item) => item.teacherUserId !== staff.userId);
    state.classes = state.classes.map((item) => ({
      ...item,
      classTeacherUserId: item.classTeacherUserId === staff.userId ? undefined : item.classTeacherUserId,
      assignedTeacherUserIds: item.assignedTeacherUserIds.filter((id) => id !== staff.userId),
    }));
    await saveAcademicsState(state);
  }

  async createSubject(input: SubjectInput) {
    const [subject] = await this.createSubjects([input]);
    return subject;
  }

  async createSubjects(inputs: SubjectInput[]) {
    const state = await this.getState();
    const normalized = inputs.map((input) => ({
      name: input.name.trim(),
      code: input.code?.trim().toUpperCase() || undefined,
      level: input.level,
      description: input.description?.trim() || undefined,
    }));
    if (!normalized.length || normalized.some((item) => !item.name)) {
      throw new Error("Subject name is required.");
    }
    const keys = new Set<string>();
    for (const item of normalized) {
      const nameKey = `${item.level}:${item.name.toLowerCase()}`;
      const codeKey = item.code ? `${item.level}:${item.code.toLowerCase()}` : "";
      if (
        keys.has(nameKey) ||
        (codeKey && keys.has(codeKey)) ||
        state.subjects.some(
          (subject) =>
            subject.level === item.level &&
            (subject.name.toLowerCase() === item.name.toLowerCase() ||
              (item.code && subject.code?.toLowerCase() === item.code.toLowerCase())),
        )
      ) {
        throw new Error(item.code ? "A subject with this name or code already exists for this level." : "A subject with this name already exists for this level.");
      }
      keys.add(nameKey);
      if (codeKey) keys.add(codeKey);
    }
    const now = new Date().toISOString();
    const subjects: Subject[] = normalized.map((item) => ({
      ...item,
      id: createId("subject"),
      schoolId: "school-001",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    }));
    state.subjects.push(...subjects);
    await saveAcademicsState(state);
    return subjects;
  }

  async setSubjectStatus(id: string, status: Subject["status"]) {
    const state = await this.getState();
    const subject = state.subjects.find((item) => item.id === id);
    if (!subject) throw new Error("Subject not found.");
    subject.status = status;
    subject.updatedAt = new Date().toISOString();
    await saveAcademicsState(state);
    return subject;
  }

  async removeSubject(id: string) {
    const state = await this.getState();
    const subject = state.subjects.find((item) => item.id === id);
    if (!subject) throw new Error("Subject not found.");
    state.subjects = state.subjects.filter((item) => item.id !== id);
    state.teacherAssignments = state.teacherAssignments.filter(
      (item) => !item.subjectIds.includes(id),
    );
    state.staff = state.staff.map((item) => ({
      ...item,
      subjectIds: item.subjectIds.filter((subjectId) => subjectId !== id),
    }));
    state.teachers = state.staff.map(staffToTeacher).filter((item): item is Teacher => item !== null);
    await saveAcademicsState(state);
  }

  async removeTeacherAssignment(assignmentId: string, assignmentSnapshot?: TeacherClassAssignment[], _period?: { academicSessionId?: string; termId?: string }) {
    const state = await this.getState();
    if (assignmentId.startsWith("inherited:")) {
      const [, academicSessionId, termId, targetClassId, sourceId] = assignmentId.split(":");
      const source = state.teacherAssignments.find((item) => item.id === sourceId);
      if (!source || !academicSessionId || !termId || !targetClassId) return;
      const now = new Date().toISOString();
      for (const snapshot of assignmentSnapshot ?? []) {
        if (snapshot.classId !== targetClassId || snapshot.id === assignmentId || snapshot.isRemoved) continue;
        state.teacherAssignments.push({
          ...snapshot,
          id: createId("tca"),
          classId: targetClassId,
          className: state.classes.find((item) => item.id === targetClassId)?.displayName ?? snapshot.className,
          academicSessionId,
          termId,
          createdAt: now,
          updatedAt: now,
        });
      }
      state.teacherAssignments.push({
        ...source,
        id: createId("tca-removed"),
        classId: targetClassId,
        className: state.classes.find((item) => item.id === targetClassId)?.displayName ?? source.className,
        academicSessionId,
        termId,
        isRemoved: true,
        createdAt: now,
        updatedAt: now,
      });
      await saveAcademicsState(state);
      return;
    }
    const assignment = state.teacherAssignments.find(
      (item) => item.id === assignmentId,
    );
    if (!assignment) return;
    state.teacherAssignments = state.teacherAssignments.filter(
      (item) => item.id !== assignmentId,
    );
    if (assignment.academicSessionId && assignment.termId) {
      state.teacherAssignments.push({
        ...assignment,
        id: createId("tca-removed"),
        isRemoved: true,
        updatedAt: new Date().toISOString(),
      });
    }
    const schoolClass = state.classes.find(
      (item) => item.id === assignment.classId,
    );
    if (schoolClass) {
      const remaining = state.teacherAssignments
        .filter((item) => item.classId === schoolClass.id)
        .map((item) => item.teacherUserId);
      schoolClass.assignedTeacherUserIds = [...new Set(remaining)];
      if (schoolClass.classTeacherUserId === assignment.teacherUserId) {
        schoolClass.classTeacherUserId = undefined;
      }
    }
    const staff = state.staff.find((item) => item.userId === assignment.teacherUserId);
    if (staff) {
      const teacherRemaining = state.teacherAssignments.filter(
        (item) => item.teacherUserId === assignment.teacherUserId,
      );
      if (assignment.assignmentType === "CLASS_TEACHER") {
        staff.classTeacherClassIds = staff.classTeacherClassIds.filter(
          (classId) => classId !== assignment.classId,
        );
      } else if (
        !teacherRemaining.some(
          (item) =>
            item.classId === assignment.classId &&
            item.assignmentType !== "CLASS_TEACHER",
        )
      ) {
        staff.assignedClassIds = staff.assignedClassIds.filter(
          (classId) => classId !== assignment.classId,
        );
      }
      if (assignment.assignmentType === "SUBJECT_TEACHER") {
        const removedSubjectIds = new Set(assignment.subjectIds);
        staff.subjectIds = staff.subjectIds.filter(
          (subjectId) =>
            !removedSubjectIds.has(subjectId) ||
            teacherRemaining.some((item) => item.subjectIds.includes(subjectId)),
        );
      }
      staff.updatedAt = new Date().toISOString();
      state.teachers = state.staff.map(staffToTeacher).filter((item): item is Teacher => item !== null);
    }
    await saveAcademicsState(state);
  }

  async getAccessibleClassesForTeacher(userId: string) {
    return getAccessibleClassesForTeacher(await this.getState(), userId);
  }

  async getAccessibleStudentsForTeacher(userId: string) {
    return getAccessibleStudentsForTeacher(await this.getState(), userId);
  }

  async canTeacherAccessClass(userId: string, classId: string) {
    return canTeacherAccessClass(await this.getState(), userId, classId);
  }

  async reset() {
    return resetAcademicsState();
  }
}

type BackendStudent = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  admissionNumber: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  admissionDate?: string | null;
  nationality?: string | null;
  email?: string;
  phone?: string;
  address?: string;
  photoUrl?: string | null;
  medicalNotes?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  status: string;
  schoolId: string;
  classId?: string | null;
  currentClassId?: string | null;
  userId?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  parentIds?: string[];
  guardianIds?: string[];
  parents?: BackendParent[];
  guardians?: BackendParent[];
  parent?: BackendParent | null;
  guardian?: BackendParent | null;
  createdAt: string;
  updatedAt: string;
  class?: BackendClass | null;
  sessionEnrollments?: Array<{
    id: string;
    schoolId: string;
    studentId: string;
    sessionId: string;
    classId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

type BackendClass = {
  id: string;
  name: string;
  level?: string;
  section?: string | null;
  arm?: string | null;
  academicYear: string;
  capacity?: number | null;
  status: string;
  schoolId: string;
  classTeacherId?: string | null;
  assignedTeacherIds?: string[];
  classOwnerAssignments?: Array<{ userId: string; assignmentRole: "MAIN" | "CO"; name?: string }>;
  classTeacher?: { id: string; name: string } | null;
  assignedTeachers?: Array<{ id: string; name: string }>;
  studentIds?: string[];
  createdAt: string;
  updatedAt: string;
  students?: BackendStudent[];
  teacherAssignments?: Array<{
    id?: string;
    teacherUserId?: string;
    teacherId?: string;
    classId: string;
    subjectId: string;
    subject?: BackendSubject | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
  periodTeacherAssignments?: Array<{
    id: string;
    teacherUserId: string;
    classId: string;
    subjectId?: string | null;
    assignmentType: "CLASS_TEACHER" | "SUBJECT_TEACHER" | "GENERAL_ACCESS";
    assignmentRole?: "MAIN" | "CO" | null;
    academicSessionId: string;
    termId: string;
    isSnapshot?: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
};

type BackendClassResponse = BackendClass | { class: BackendClass };

type BackendStaff = {
  id: string;
  userId?: string;
  schoolId: string;
  name: string;
  email: string;
  role: "TEACHER" | "STAFF" | string;
  status: string;
  staffId?: string | null;
  employeeNumber?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  phone?: string | null;
  salaryAmount?: number | null;
  isTeachingStaff?: boolean;
  assignedClassIds?: string[];
  classTeacherClassIds?: string[];
  subjectIds?: string[];
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  subjects?: BackendSubject[];
  teachingAssignments?: Array<{
    classId: string;
    subjectId: string;
    subject?: BackendSubject | null;
  }>;
  periodAssignments?: Array<{
    id: string;
    classId: string;
    teacherId: string;
    assignmentType: "CLASS_TEACHER" | "SUBJECT_TEACHER" | "GENERAL_ACCESS";
    subjectId?: string | null;
    assignmentRole?: "MAIN" | "CO" | null;
    academicSessionId: string;
    termId: string;
    isSnapshot?: boolean;
    className?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  assignedClasses?: BackendClass[];
  classTeacherClasses?: BackendClass[];
  createdAt: string;
  updatedAt: string;
  staffProfile?: {
    employeeNumber?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    phone?: string | null;
    salaryAmount?: number | null;
    isTeachingStaff?: boolean;
    gender?: string | null;
    dateOfBirth?: string | null;
    address?: string | null;
    photoUrl?: string | null;
  } | null;
};

type BackendSubject = {
  id: string;
  schoolId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  level?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type BackendParent = {
  id: string;
  userId?: string | null;
  schoolId?: string | null;
  fullName?: string;
  name?: string;
  relationship?: string;
  phone: string;
  email?: string;
  address?: string | null;
  dateOfBirth?: string | null;
  photoUrl?: string | null;
  accountStatus?: string | null;
  status?: string | null;
  user?: {
    id?: string | null;
    email?: string | null;
    status?: string | null;
    role?: string | null;
  } | null;
  parentProfile?: {
    relationship?: string | null;
    phone?: string | null;
    address?: string | null;
    dateOfBirth?: string | null;
    photoUrl?: string | null;
  } | null;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  createdAt?: string;
  updatedAt?: string;
  childrenCount?: number;
};

type BackendCreateStudentBody = {
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  admissionDate?: string;
  nationality?: string;
  address?: string;
  photoUrl?: string;
  medicalNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  temporaryPassword?: string;
};

type BackendCreateClassBody = {
  name: string;
  level?: ConfiguredSchoolLevel;
  capacity?: number;
  section?: string;
  academicYear: string;
  classTeacherId?: string;
  assignedTeacherIds?: string[];
};

type BackendList<T> =
  | T[]
  | {
      data?: T[];
      items?: T[];
      results?: T[];
      classes?: T[];
      staff?: T[];
      subjects?: T[];
      students?: T[];
      children?: T[];
      parents?: T[];
      guardians?: T[];
    };
type BackendStudentResponse =
  | BackendList<BackendStudent>
  | BackendStudent
  | {
      student?: BackendStudent;
      profile?: { student?: BackendStudent | null } | null;
      data?: BackendStudent | BackendStudent[];
    };

function unwrapList<T>(data: BackendList<T>) {
  if (Array.isArray(data)) return data;
  return data.data ?? data.items ?? data.results ?? data.classes ?? data.staff ?? data.subjects ?? data.students ?? data.children ?? data.parents ?? data.guardians ?? [];
}

function unwrapStudentList(data: BackendStudentResponse): BackendStudent[] {
  if (Array.isArray(data)) return data;
  if ("firstName" in data && "lastName" in data) return [data];
  const record = data as {
    student?: BackendStudent;
    profile?: { student?: BackendStudent | null } | null;
    data?: BackendStudent | BackendStudent[];
  };
  if (record.student) return [record.student];
  if (record.profile?.student) return [record.profile.student];
  if (Array.isArray(record.data)) return record.data;
  if (record.data && "firstName" in record.data && "lastName" in record.data) return [record.data];
  return unwrapList(data as BackendList<BackendStudent>);
}

async function fetchCurrentStudentList() {
  let lastError: unknown;
  for (const path of ["/me/students", "/me/student", "/students"]) {
    try {
      const students = unwrapStudentList(await apiRequest<BackendStudentResponse>(path));
      if (students.length || path === "/students") return students;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Student profile could not be loaded.");
}

function backendLevel(
  value?: string,
  className?: string,
): ConfiguredSchoolLevel {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "PRIMARY" || normalized === "SECONDARY") {
    return normalized;
  }

  const template = inferTemplate(className ?? value ?? "");
  if (template) return template.level;

  return /^(CRECHE|PRE[- ]?NURSERY|NURSERY|KG|RECEPTION|PRIMARY)\b/i.test(
    className ?? value ?? "",
  )
    ? "PRIMARY"
    : "SECONDARY";
}

function backendClassStatus(value?: string): ClassStatus {
  const upper = value?.toUpperCase();
  if (upper === "ARCHIVED" || upper === "INACTIVE") return upper;
  return "ACTIVE";
}

function backendStudentStatus(value?: string): StudentStatus {
  const upper = value?.toUpperCase();
  if (
    upper === "INACTIVE" ||
    upper === "GRADUATED" ||
    upper === "WITHDRAWN" ||
    upper === "SUSPENDED"
  ) {
    return upper;
  }
  return "ACTIVE";
}

function backendGender(value?: Student["gender"]): BackendCreateStudentBody["gender"] {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return upper === "MALE" || upper === "FEMALE" || upper === "OTHER"
    ? upper
    : undefined;
}

function displayGender(value?: BackendStudent["gender"]): Student["gender"] {
  if (value === "MALE") return "Male";
  if (value === "FEMALE") return "Female";
  return value;
}

function displayStaffGender(value?: string | null): StaffMember["gender"] {
  if (value === "MALE") return "Male";
  if (value === "FEMALE") return "Female";
  if (value === "OTHER" || value === "Male" || value === "Female") return value;
  return undefined;
}

function splitClassName(name?: string | null, section?: string | null) {
  const normalizedName = name?.trim().replace(/\s+/g, " ") || "Class";
  const normalizedSection = section?.trim().replace(/\s+/g, " ") || undefined;
  if (normalizedSection) return { baseName: normalizedName, suffix: normalizedSection };
  const [baseName, ...rest] = normalizedName.split(/\s+/);
  return { baseName: rest.length ? [baseName, ...rest].join(" ") : normalizedName, suffix: undefined };
}

function mapBackendClass(item: BackendClass, index = 0): SchoolClass {
  const suffix = item.section ?? item.arm ?? undefined;
  const { baseName } = splitClassName(item.name, suffix);
  const rawName = item.name?.trim().replace(/\s+/g, " ") || baseName;
  const rawSuffix = suffix?.trim().replace(/\s+/g, " ") || undefined;
  const displayName =
    rawSuffix && rawName.toLowerCase().endsWith(rawSuffix.toLowerCase())
      ? rawName
      : [rawName, rawSuffix].filter(Boolean).join(" ");
  const template = inferTemplate(rawName);
  const ownerName = (userId: string) =>
    (item.classTeacher?.id === userId ? item.classTeacher.name : undefined) ??
    item.assignedTeachers?.find((teacher) => teacher.id === userId)?.name;
  const classOwnerAssignments = (item.classOwnerAssignments?.length
    ? item.classOwnerAssignments
    : item.classTeacherId
      ? [{ userId: item.classTeacherId, assignmentRole: "MAIN" as const }]
      : []
  ).map((owner) => ({ ...owner, name: owner.name ?? ownerName(owner.userId) }));
  return {
    id: item.id,
    schoolId: item.schoolId,
    level: backendLevel(item.level, rawName),
    source: template ? "STANDARD" : "CUSTOM",
    templateKey: template?.key,
    baseName,
    suffix: rawSuffix,
    arm: rawSuffix,
    section: item.section,
    name: rawName,
    academicYear: item.academicYear,
    displayName,
    sortOrder: index * 10,
    capacity:
      typeof item.capacity === "number" && item.capacity > 0
        ? Math.round(item.capacity)
        : undefined,
    classTeacherUserId: item.classTeacherId ?? undefined,
    classTeacherId: item.classTeacherId ?? null,
    assignedTeacherUserIds: item.assignedTeacherIds ?? [],
    assignedTeacherIds: item.assignedTeacherIds ?? [],
    classOwnerAssignments,
    studentIds: item.studentIds ?? item.students?.map((student) => student.id) ?? [],
    teachingAssignments: item.teacherAssignments?.map((assignment) => ({
      id: assignment.id,
      teacherUserId: assignment.teacherUserId ?? assignment.teacherId ?? "",
      classId: assignment.classId,
      subjectId: assignment.subjectId,
      subject: assignment.subject ? mapBackendSubject(assignment.subject) : undefined,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    })).filter((assignment) => assignment.teacherUserId && assignment.subjectId) ?? [],
    periodTeacherAssignments: item.periodTeacherAssignments?.map((assignment) => ({
      id: assignment.isSnapshot ? `period-snapshot:${assignment.academicSessionId}:${assignment.termId}:${assignment.classId}` : assignment.id,
      schoolId: item.schoolId,
      teacherUserId: assignment.teacherUserId,
      classId: assignment.classId,
      academicSessionId: assignment.academicSessionId,
      termId: assignment.termId,
      assignmentType: assignment.assignmentType,
      assignmentRole: assignment.assignmentRole ?? undefined,
      isRemoved: assignment.isSnapshot || undefined,
      subjectIds: assignment.subjectId ? [assignment.subjectId] : [],
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    })) ?? [],
    status: backendClassStatus(item.status),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function mapBackendStudent(item: BackendStudent, parentById = new Map<string, Guardian>()): Student {
  const classId = item.classId ?? item.currentClassId ?? "";
  const embeddedParents = [
    ...(item.parents ?? []),
    ...(item.guardians ?? []),
    item.parent,
    item.guardian,
  ].filter((parent): parent is BackendParent => Boolean(parent));
  const embeddedGuardians = embeddedParents.map(mapBackendParent);
  const parentIds = [
    ...(item.parentIds ?? item.guardianIds ?? []),
    ...embeddedGuardians.map((parent) => parent.id),
  ].filter((id, index, ids) => id && ids.indexOf(id) === index);
  const primaryGuardian =
    parentIds.map((id) => parentById.get(id)).find(Boolean) ??
    embeddedGuardians[0];
  return {
    id: item.id,
    schoolId: item.schoolId,
    userId: item.userId ?? undefined,
    currentClassId: item.currentClassId ?? null,
    admissionNumber: item.admissionNumber,
    firstName: item.firstName,
    middleName: item.middleName ?? undefined,
    lastName: item.lastName,
    gender: displayGender(item.gender),
    dateOfBirth: item.dateOfBirth,
    admissionDate: item.admissionDate ?? undefined,
    nationality: item.nationality ?? undefined,
    email: item.email,
    phone: item.phone,
    address: item.address,
    photoUrl: item.photoUrl ?? undefined,
    medicalNotes: item.medicalNotes ?? undefined,
    emergencyContactName: item.emergencyContactName ?? undefined,
    emergencyContactPhone: item.emergencyContactPhone ?? undefined,
    schoolLevel: backendLevel(item.class?.level),
    classId,
    parentIds,
    guardianIds: parentIds,
    guardianName: primaryGuardian?.fullName ?? item.guardianName ?? (parentIds.length ? "Linked parent" : ""),
    guardianPhone: primaryGuardian?.phone || item.guardianPhone || "",
    guardianEmail: primaryGuardian?.email ?? item.guardianEmail ?? undefined,
    status: backendStudentStatus(item.status),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function mapBackendStaff(item: BackendStaff): StaffMember {
  const fullName = item.name?.trim() || "Unnamed staff";
  const { firstName, lastName } = splitName(fullName);
  const isTeachingStaff = Boolean(item.isTeachingStaff ?? item.staffProfile?.isTeachingStaff ?? item.role === "TEACHER");
  const status = item.status === "SUSPENDED" ? "SUSPENDED" : item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const employeeNumber = item.employeeNumber ?? item.staffId ?? item.staffProfile?.employeeNumber ?? undefined;
  const assignedClassIds = [
    ...(item.assignedClassIds ?? []),
    ...(item.assignedClasses ?? []).map((schoolClass) => schoolClass.id),
  ].filter((id, index, ids) => ids.indexOf(id) === index);
  const classTeacherClassIds = [
    ...(item.classTeacherClassIds ?? []),
    ...(item.classTeacherClasses ?? []).map((schoolClass) => schoolClass.id),
  ].filter((id, index, ids) => ids.indexOf(id) === index);
  const subjectIds = [
    ...(item.subjectIds ?? []),
    ...(item.subjects ?? []).map((subject) => subject.id),
    ...(item.teachingAssignments ?? []).map((assignment) => assignment.subjectId),
  ].filter((id, index, ids) => ids.indexOf(id) === index);
  return {
    id: item.id,
    userId: item.userId ?? item.id,
    schoolId: item.schoolId,
    staffId: employeeNumber,
    employeeNumber,
    firstName,
    lastName,
    fullName,
    email: item.email,
    phone: item.phone ?? item.staffProfile?.phone ?? undefined,
    salaryAmount: item.salaryAmount ?? item.staffProfile?.salaryAmount ?? undefined,
    gender: displayStaffGender(item.gender ?? item.staffProfile?.gender),
    dateOfBirth: item.dateOfBirth ?? item.staffProfile?.dateOfBirth ?? undefined,
    address: item.address ?? item.staffProfile?.address ?? undefined,
    photoUrl: item.photoUrl ?? item.staffProfile?.photoUrl ?? undefined,
    role: isTeachingStaff ? "TEACHER" : "STAFF",
    jobTitle: item.jobTitle ?? item.staffProfile?.jobTitle ?? (isTeachingStaff ? "Teacher" : "Staff"),
    department: item.department ?? item.staffProfile?.department ?? undefined,
    isTeachingStaff,
    assignedClassIds,
    classTeacherClassIds,
    subjectIds,
    teachingAssignments: item.teachingAssignments?.map((assignment) => ({
      classId: assignment.classId,
      subjectId: assignment.subjectId,
      subject: assignment.subject ? mapBackendSubject(assignment.subject) : undefined,
    })),
    periodAssignments: item.periodAssignments?.map((assignment) => ({
      id: assignment.isSnapshot ? `period-snapshot:${assignment.academicSessionId}:${assignment.termId}:${assignment.classId}` : assignment.id,
      schoolId: item.schoolId,
      teacherUserId: assignment.teacherId,
      classId: assignment.classId,
      className: assignment.className,
      academicSessionId: assignment.academicSessionId,
      termId: assignment.termId,
      assignmentType: assignment.assignmentType,
      assignmentRole: assignment.assignmentRole ?? undefined,
      isRemoved: assignment.isSnapshot || undefined,
      subjectIds: assignment.subjectId ? [assignment.subjectId] : [],
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    })),
    subjects: item.subjects?.map(mapBackendSubject),
    assignedClasses: item.assignedClasses?.map(mapBackendClass),
    classTeacherClasses: item.classTeacherClasses?.map(mapBackendClass),
    status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function backendSubjectStatus(value?: string): Subject["status"] {
  return value?.toUpperCase() === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
}

function mapBackendSubject(item: BackendSubject): Subject {
  return {
    id: item.id,
    schoolId: item.schoolId,
    name: item.name,
    code: item.code ?? undefined,
    description: item.description ?? undefined,
    level: backendLevel(item.level),
    status: backendSubjectStatus(item.status),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function subjectKey(item: Pick<Subject, "level" | "name">) {
  return `${item.level}:${item.name.trim().toLowerCase()}`;
}

function mergeSubjects(remoteSubjects: Subject[], localSubjects: Subject[]) {
  const remoteKeys = new Set(remoteSubjects.map(subjectKey));
  return [
    ...remoteSubjects,
    ...localSubjects.filter(
      (subject) =>
        !remoteKeys.has(subjectKey(subject)) &&
        !remoteSubjects.some((item) => item.id === subject.id),
    ),
  ];
}

function teacherAssignmentsFromStaff(staff: StaffMember[]): TeacherClassAssignment[] {
  return staff.flatMap((item) => {
    const legacyAssignments: TeacherClassAssignment[] = (() => {
    const teachingAssignments = item.teachingAssignments?.length
      ? item.teachingAssignments
      : item.assignedClassIds.flatMap((classId) => item.subjectIds.map((subjectId) => ({ classId, subjectId })));
    const subjectAssignments = teachingAssignments.map((assignment) => ({
      id: `staff-assignment-${item.userId}-${assignment.classId}-${assignment.subjectId}`,
      schoolId: item.schoolId,
      teacherUserId: item.userId,
      classId: assignment.classId,
      assignmentType: "SUBJECT_TEACHER" as const,
      subjectIds: [assignment.subjectId],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
    const generalAssignments = item.assignedClassIds
      .map((classId) => ({
        id: `staff-assignment-${item.userId}-${classId}-general`,
        schoolId: item.schoolId,
        teacherUserId: item.userId,
        classId,
        assignmentType: "GENERAL_ACCESS" as const,
        subjectIds: [],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    const classTeacherAssignments = item.classTeacherClassIds.map((classId) => ({
      id: `staff-assignment-${item.userId}-${classId}-class-teacher`,
      schoolId: item.schoolId,
      teacherUserId: item.userId,
      classId,
      assignmentType: "CLASS_TEACHER" as const,
      subjectIds: [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
    return [...subjectAssignments, ...generalAssignments, ...classTeacherAssignments];
    })();
    return [...legacyAssignments, ...(item.periodAssignments ?? [])];
  });
}

function studentBody(input: StudentInput | Partial<StudentInput>): BackendCreateStudentBody {
  return {
    admissionNumber: input.admissionNumber ?? "",
    firstName: input.firstName ?? "",
    middleName: input.middleName || undefined,
    lastName: input.lastName ?? "",
    email: input.email || undefined,
    phone: input.phone || undefined,
    gender: backendGender(input.gender),
    dateOfBirth: input.dateOfBirth || undefined,
    admissionDate: input.admissionDate || undefined,
    nationality: input.nationality || undefined,
    address: input.address || undefined,
    photoUrl: input.photoUrl || undefined,
    medicalNotes: input.medicalNotes || undefined,
    emergencyContactName: input.emergencyContactName || undefined,
    emergencyContactPhone: input.emergencyContactPhone || undefined,
    guardianName: input.guardianName || undefined,
    guardianPhone: input.guardianPhone || undefined,
    guardianEmail: input.guardianEmail || undefined,
    temporaryPassword: input.temporaryPassword || undefined,
  };
}

function mergeStudentFallback(remote: Student, fallback?: Partial<StudentInput> | Student): Student {
  if (!fallback) return remote;
  if (
    "updatedAt" in fallback &&
    fallback.updatedAt &&
    remote.updatedAt &&
    fallback.updatedAt > remote.updatedAt
  ) {
    const local = fallback as Student;
    return {
      ...remote,
      ...local,
      id: remote.id,
      schoolId: remote.schoolId,
      userId: remote.userId ?? local.userId,
      classId: remote.classId,
      currentClassId: remote.currentClassId ?? remote.classId,
    };
  }
  const hasGuardianLinks = remote.guardianIds.length > 0;
  return {
    ...remote,
    middleName: remote.middleName ?? fallback.middleName,
    dateOfBirth: remote.dateOfBirth ?? fallback.dateOfBirth,
    admissionDate: remote.admissionDate ?? fallback.admissionDate,
    nationality: remote.nationality ?? fallback.nationality,
    email: remote.email ?? fallback.email,
    phone: remote.phone ?? fallback.phone,
    address: remote.address ?? fallback.address,
    photoUrl: remote.photoUrl ?? fallback.photoUrl,
    medicalNotes: remote.medicalNotes ?? fallback.medicalNotes,
    emergencyContactName: remote.emergencyContactName ?? fallback.emergencyContactName,
    emergencyContactPhone: remote.emergencyContactPhone ?? fallback.emergencyContactPhone,
    schoolLevel: remote.schoolLevel || fallback.schoolLevel || "SECONDARY",
    classId: remote.classId || fallback.classId || "",
    parentIds: remote.parentIds ?? fallback.parentIds ?? fallback.guardianIds,
    guardianIds: remote.guardianIds ?? fallback.guardianIds ?? fallback.parentIds ?? [],
    guardianName: hasGuardianLinks
      ? remote.guardianName || fallback.guardianName || ""
      : remote.guardianName,
    guardianPhone: hasGuardianLinks
      ? remote.guardianPhone || fallback.guardianPhone || ""
      : remote.guardianPhone,
    guardianEmail: hasGuardianLinks
      ? remote.guardianEmail ?? fallback.guardianEmail
      : remote.guardianEmail,
  };
}

export interface EnrollmentContext {
  schoolId: string;
  academicSessionId: string;
  academicSessionName?: string;
  previousAcademicSessionId?: string;
}

function mergeStaffFallback(remote: StaffMember, fallback?: StaffMember): StaffMember {
  if (!fallback) return remote;
  if (fallback.updatedAt && remote.updatedAt && fallback.updatedAt > remote.updatedAt) {
    return {
      ...remote,
      ...fallback,
      id: remote.id,
      schoolId: remote.schoolId,
      userId: remote.userId,
    };
  }
  return {
    ...remote,
    salaryAmount: remote.salaryAmount ?? fallback.salaryAmount,
    phone: remote.phone ?? fallback.phone,
    department: remote.department ?? fallback.department,
    gender: remote.gender ?? fallback.gender,
    dateOfBirth: remote.dateOfBirth ?? fallback.dateOfBirth,
    address: remote.address ?? fallback.address,
    photoUrl: remote.photoUrl ?? fallback.photoUrl,
    assignedClassIds: remote.assignedClassIds.length ? remote.assignedClassIds : fallback.assignedClassIds,
    classTeacherClassIds: remote.classTeacherClassIds.length ? remote.classTeacherClassIds : fallback.classTeacherClassIds,
    subjectIds: remote.subjectIds.length ? remote.subjectIds : fallback.subjectIds,
  };
}

function unwrapStaffResponse(response: BackendStaff | { staff: BackendStaff }) {
  return "staff" in response ? response.staff : response;
}

function unwrapClassResponse(response: BackendClassResponse) {
  return "class" in response ? response.class : response;
}

function unwrapStudentResponse(response: BackendStudent | { student: BackendStudent }) {
  return "student" in response ? response.student : response;
}

function mapBackendParent(item: BackendParent): Guardian {
  const now = new Date().toISOString();
  return {
    id: item.id,
    schoolId: item.schoolId ?? "school-001",
    userId: item.userId ?? item.user?.id ?? undefined,
    fullName: item.fullName ?? item.name ?? "Parent",
    relationship: item.parentProfile?.relationship ?? item.relationship ?? "Parent",
    phone: item.parentProfile?.phone ?? item.phone ?? "",
    email: item.email ?? item.user?.email ?? undefined,
    address: item.parentProfile?.address ?? item.address ?? undefined,
    dateOfBirth: item.parentProfile?.dateOfBirth ?? item.dateOfBirth ?? undefined,
    photoUrl: item.photoUrl ?? item.parentProfile?.photoUrl ?? undefined,
    accountStatus: item.accountStatus ?? item.user?.status ?? item.status ?? undefined,
    isPrimaryContact: item.isPrimaryContact ?? true,
    isEmergencyContact: item.isEmergencyContact ?? true,
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  };
}

function classBody(input: CreateClassInput | UpdateClassInput): BackendCreateClassBody {
  const arm = "arm" in input ? input.arm : undefined;
  const section = input.suffix ?? arm;
  return {
    name: input.baseName ?? ("displayName" in input ? input.displayName : undefined) ?? "",
    level: input.level,
    capacity: input.capacity,
    section,
    academicYear: input.academicYear || "2026/2027",
    classTeacherId: input.classTeacherUserId,
    assignedTeacherIds: input.assignedTeacherUserIds,
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

function storedBackendUserId() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as { id?: string }).id : undefined;
  } catch {
    return undefined;
  }
}

function teacherAssignmentsFromClasses(classes: SchoolClass[], teacherUserId: string): TeacherClassAssignment[] {
  return classes
    .filter((item) => item.status === "ACTIVE")
    .flatMap((item) => {
      const subjectIds = [
        ...new Set(
          (item.teachingAssignments ?? [])
            .filter((assignment) => assignment.teacherUserId === teacherUserId)
            .map((assignment) => assignment.subjectId)
            .filter(Boolean),
        ),
      ];
      const baseAssignment: TeacherClassAssignment = {
        id: `class-assignment-${teacherUserId}-${item.id}`,
        schoolId: item.schoolId,
        teacherUserId,
        classId: item.id,
        assignmentType:
          item.classTeacherUserId === teacherUserId
            ? "CLASS_TEACHER" as const
            : "GENERAL_ACCESS" as const,
        subjectIds: [],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
      if (!subjectIds.length) return [baseAssignment];
      return [
        baseAssignment,
        {
          id: `subject-assignment-${teacherUserId}-${item.id}`,
          schoolId: item.schoolId,
          teacherUserId,
          classId: item.id,
          assignmentType: "SUBJECT_TEACHER" as const,
          subjectIds,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
      ];
    });
}

class BackendAcademicsRepository extends LocalAcademicsRepository {
  private hasSession() {
    return Boolean(readStoredToken());
  }

  private async saveLocalGuardian(guardian: Guardian) {
    const state = await super.getState();
    state.guardians = [
      guardian,
      ...state.guardians.filter((item) => item.id !== guardian.id),
    ];
    await saveAcademicsState(state);
  }

  private async saveLocalStudent(student: Student) {
    const state = await super.getState();
    state.students = [
      student,
      ...state.students.filter((item) => item.id !== student.id),
    ];
    for (const schoolClass of state.classes) {
      schoolClass.studentIds = state.students
        .filter((item) => item.classId === schoolClass.id)
        .map((item) => item.id);
    }
    await saveAcademicsState(state);
  }

  private async saveLocalStaff(staff: StaffMember) {
    const state = await super.getState();
    state.staff = [
      staff,
      ...state.staff.filter((item) => item.id !== staff.id && item.userId !== staff.userId),
    ];
    state.teachers = state.staff.map(staffToTeacher).filter((item): item is Teacher => item !== null);
    await saveAcademicsState(state);
  }

  private async saveLocalClass(schoolClass: SchoolClass) {
    const state = await super.getState();
    state.classes = sortClasses([
      schoolClass,
      ...state.classes.filter((item) => item.id !== schoolClass.id),
    ]);
    await saveAcademicsState(state);
  }

  async getState(): Promise<AcademicsState> {
    if (!this.hasSession()) return super.getState();
    const local = await super.getState();
    const role = storedBackendRole();
    const userId = storedBackendUserId();
    const classPath =
      role === "TEACHER" || role === "STUDENT" ? "/me/classes" : "/classes";
    const studentPath =
      role === "TEACHER"
        ? "/me/students"
        : role === "PARENT"
          ? "/me/children"
          : "/students";
    const shouldLoadParents = role !== "TEACHER" && role !== "STUDENT";
    const [classesResponse, studentsResponse, staffResponse, subjectsResponse, parentsResponse] = await Promise.allSettled([
      apiRequest<BackendList<BackendClass>>(classPath),
      role === "STUDENT"
        ? fetchCurrentStudentList()
        : apiRequest<BackendList<BackendStudent>>(studentPath).then(unwrapList),
      apiRequest<BackendList<BackendStaff>>("/staff"),
      apiRequest<BackendList<BackendSubject>>("/subjects"),
      shouldLoadParents
        ? apiRequest<BackendList<BackendParent>>(role === "PARENT" ? "/me/parents" : "/parents")
        : Promise.resolve([]),
    ]);
    if (classesResponse.status === "rejected" && (role === "PARENT" || role === "STUDENT")) {
      throw classesResponse.reason;
    }
    let classes =
      classesResponse.status === "fulfilled"
        ? unwrapList(classesResponse.value).map(mapBackendClass)
        : local.classes;
    const classById = new Map(classes.map((item) => [item.id, item]));
    const fetchedGuardians =
      parentsResponse.status === "fulfilled"
        ? unwrapList(parentsResponse.value).map(mapBackendParent)
        : local.guardians;
    const embeddedGuardians =
      studentsResponse.status === "fulfilled"
        ? studentsResponse.value
            .flatMap((item) => [
              ...(item.parents ?? []),
              ...(item.guardians ?? []),
              item.parent,
              item.guardian,
            ])
            .filter((parent): parent is BackendParent => Boolean(parent))
            .map(mapBackendParent)
        : [];
    const guardians = [...fetchedGuardians];
    for (const guardian of embeddedGuardians) {
      if (!guardians.some((item) => item.id === guardian.id)) guardians.push(guardian);
    }
    for (const guardian of local.guardians) {
      if (!guardians.some((item) => item.id === guardian.id)) guardians.push(guardian);
    }
    const parentById = new Map(guardians.map((item) => [item.id, item]));
    const remoteStudents =
      studentsResponse.status === "fulfilled"
        ? studentsResponse.value.map((item) => {
            const mapped = mapBackendStudent(item, parentById);
            const localStudent = local.students.find((student) => student.id === mapped.id);
            const merged = mergeStudentFallback(mapped, localStudent);
            const schoolClass = classById.get(merged.classId);
            return schoolClass ? { ...merged, schoolLevel: schoolClass.level } : merged;
          })
        : local.students;
    // A successful authenticated response is the student roster for this user.
    // Browser records may belong to another role, session, or an old class and
    // must not create extra students in the current dashboard.
    const students = remoteStudents;
    const studentEnrollments = studentsResponse.status === "fulfilled"
      ? studentsResponse.value.flatMap((student) =>
          (student.sessionEnrollments ?? []).map((enrollment) => ({
            id: enrollment.id,
            schoolId: enrollment.schoolId,
            studentId: enrollment.studentId,
            academicSessionId: enrollment.sessionId,
            classId: enrollment.classId,
            status: enrollment.status as StudentEnrollment["status"],
            createdAt: enrollment.createdAt,
            updatedAt: enrollment.updatedAt,
          })),
        )
      : local.studentEnrollments;
    const localStaffById = new Map<string, StaffMember>();
    for (const item of local.staff) {
      localStaffById.set(item.id, item);
      localStaffById.set(item.userId, item);
    }
    const staff =
      staffResponse.status === "fulfilled"
        ? unwrapList(staffResponse.value).map((item) => {
            const mapped = mapBackendStaff(item);
            return mergeStaffFallback(mapped, localStaffById.get(mapped.id) ?? localStaffById.get(mapped.userId));
          })
        : local.staff;
    const ownTeacher = role === "TEACHER"
      ? staff.find((item) => item.userId === userId || item.id === userId)
        ?? local.staff.find((item) => item.userId === userId || item.id === userId)
      : undefined;
    if (ownTeacher) {
      const classMap = new Map(classes.map((item) => [item.id, item]));
      for (const assignedClass of [...(ownTeacher.assignedClasses ?? []), ...(ownTeacher.classTeacherClasses ?? [])]) {
        classMap.set(assignedClass.id, classMap.get(assignedClass.id) ?? assignedClass);
      }
      const teacherClassIds = new Set([...ownTeacher.assignedClassIds, ...ownTeacher.classTeacherClassIds]);
      for (const localClass of local.classes) {
        if (teacherClassIds.has(localClass.id) && !classMap.has(localClass.id)) classMap.set(localClass.id, localClass);
      }
      classes = [...classMap.values()];
    }
    const embeddedClassSubjects = classes
      .flatMap((item) => item.teachingAssignments ?? [])
      .map((assignment) => assignment.subject)
      .filter((subject): subject is Subject => Boolean(subject));
    const subjects =
      subjectsResponse.status === "fulfilled"
        ? mergeSubjects(
            mergeSubjects(unwrapList(subjectsResponse.value).map(mapBackendSubject), embeddedClassSubjects),
            local.subjects,
          )
        : mergeSubjects(embeddedClassSubjects, local.subjects);
    const teachers = staff.map(staffToTeacher).filter((item): item is Teacher => item !== null);
    let teacherAssignments = teacherAssignmentsFromStaff(
      role === "TEACHER" && ownTeacher ? [ownTeacher] : staff,
    );
    const assignmentIds = new Set(teacherAssignments.map((item) => item.id));
    for (const assignment of classes.flatMap((item) => item.periodTeacherAssignments ?? [])) {
      if (!assignmentIds.has(assignment.id)) {
        teacherAssignments.push(assignment);
        assignmentIds.add(assignment.id);
      }
    }
    const storedPeriodAssignments = local.teacherAssignments.filter((item) => item.academicSessionId && item.termId);
    const mergedAssignmentIds = new Set(teacherAssignments.map((item) => item.id));
    teacherAssignments.push(...storedPeriodAssignments.filter((item) => !mergedAssignmentIds.has(item.id)));
    if (role === "TEACHER" && userId) {
      const assignmentMap = new Map<string, TeacherClassAssignment>();
      for (const assignment of [...teacherAssignments, ...teacherAssignmentsFromClasses(classes, userId)]) {
        const key = `${assignment.teacherUserId}:${assignment.classId}:${assignment.assignmentType}:${assignment.academicSessionId ?? ""}:${assignment.termId ?? ""}`;
        const current = assignmentMap.get(key);
        assignmentMap.set(key, current
          ? { ...current, subjectIds: [...new Set([...current.subjectIds, ...assignment.subjectIds])] }
          : assignment);
      }
      teacherAssignments = [...assignmentMap.values()];
    }
    const localClassById = new Map(local.classes.map((item) => [item.id, item]));
    return {
      ...local,
      classes: classes.map((item) => ({
        ...item,
        capacity: item.capacity ?? localClassById.get(item.id)?.capacity,
        academicYear: item.academicYear ?? localClassById.get(item.id)?.academicYear,
        academicSessionId: item.academicSessionId ?? localClassById.get(item.id)?.academicSessionId,
        level:
          getClassTemplate(item.templateKey)?.level ??
          localClassById.get(item.id)?.level ??
          item.level,
        status: item.status,
        classTeacherUserId:
          (role === "TEACHER"
            ? undefined
            : staff.find((person) => person.classTeacherClassIds.includes(item.id))?.userId) ??
          item.classTeacherUserId,
        studentIds: students
          .filter((student) => student.classId === item.id)
          .map((student) => student.id),
      })),
      students,
      studentEnrollments,
      staff,
      teachers,
      subjects,
      teacherAssignments,
      guardians,
    };
  }

  async getAllClasses() {
    return sortClasses((await this.getState()).classes);
  }

  async createClass(input: CreateClassInput) {
    if (!this.hasSession()) return super.createClass(input);
    const created = mapBackendClass(unwrapClassResponse(await apiRequest<BackendClassResponse>("/classes", {
      method: "POST",
      body: JSON.stringify(classBody(input)),
    })));
    const merged = { ...created, schoolId: input.schoolId ?? created.schoolId, academicYear: input.academicYear, academicSessionId: input.academicSessionId, capacity: input.capacity ?? created.capacity, level: input.level ?? created.level, status: input.status ?? created.status };
    await this.saveLocalClass(merged);
    return merged;
  }

  async updateClass(id: string, input: UpdateClassInput) {
    if (!this.hasSession()) return super.updateClass(id, input);
    const existing = (await super.getState()).classes.find((item) => item.id === id);
    const updated = mapBackendClass(unwrapClassResponse(await apiRequest<BackendClassResponse>(`/classes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(classBody(input)),
    })));
    const merged = { ...updated, capacity: input.capacity ?? existing?.capacity ?? updated.capacity, level: input.level ?? existing?.level ?? updated.level, status: input.status ?? existing?.status ?? updated.status };
    await this.saveLocalClass(merged);
    return merged;
  }

  async setClassOwners(classId: string, classOwnerUserId: string, coOwnerUserIds: string[]) {
    if (!this.hasSession()) return super.setClassOwners(classId, classOwnerUserId, coOwnerUserIds);
    await apiRequest(`/classes/${classId}/owners`, {
      method: "PATCH",
      body: JSON.stringify({ classOwnerUserId, coOwnerUserIds }),
    });
  }

  async setClassStatus(id: string, status: ClassStatus) {
    if (!this.hasSession()) return super.setClassStatus(id, status);
    await apiRequest(
      `/classes/${id}/${status === "ACTIVE" ? "activate" : "archive"}`,
      { method: "PATCH" },
    );
  }

  async removeClass(id: string) {
    if (!this.hasSession()) return super.removeClass(id);
    await apiRequest<void>(`/classes/${id}`, { method: "DELETE" });
    return "REMOVED" as const;
  }

  async moveStudents(studentIds: string[], classId: string, context: EnrollmentContext) {
    if (!this.hasSession() || !isUuid(context.academicSessionId)) return super.moveStudents(studentIds, classId, context);
    await apiRequest(`/classes/${classId}/students`, {
      method: "PATCH",
      body: JSON.stringify({ studentIds }),
    });
  }

  async saveTeacherAssignments(input: {
    teacherUserId: string;
    classIds: string[];
    assignmentType: TeacherClassAssignmentType;
    subjectIds: string[];
    assignmentPolicy?: "CO" | "MAIN" | "REPLACE";
    assignmentSnapshot?: TeacherClassAssignment[];
    subjectAssignments?: Array<{ classId: string; subjectIds: string[] }>;
    schoolId?: string;
    academicSessionId?: string;
    termId?: string;
  }) {
    if (!this.hasSession() || !isUuid(input.academicSessionId) || !isUuid(input.termId)) return super.saveTeacherAssignments(input);
    if (!input.teacherUserId || !input.classIds.length) {
      throw new Error("Select a teacher and at least one class.");
    }
    if (
      input.assignmentType === "SUBJECT_TEACHER" &&
      !input.subjectIds.length
    ) {
      throw new Error("Select at least one subject for a subject teacher.");
    }
    const state = await this.getState();
    const staff = state.staff.find(
      (item) => item.userId === input.teacherUserId || item.id === input.teacherUserId,
    );
    const staffId = staff?.id ?? input.teacherUserId;
    const assignedClassIds = new Set(staff?.assignedClassIds ?? []);
    const classTeacherClassIds = new Set(staff?.classTeacherClassIds ?? []);
    const targetClassIds = new Set(input.classIds);
    const subjectAssignments = new Map<string, Set<string>>();
    for (const assignment of state.teacherAssignments.filter(
      (item) => item.teacherUserId === input.teacherUserId && !targetClassIds.has(item.classId),
    )) {
      if (!assignment.subjectIds.length) continue;
      const subjects = subjectAssignments.get(assignment.classId) ?? new Set<string>();
      assignment.subjectIds.forEach((subjectId) => subjects.add(subjectId));
      subjectAssignments.set(assignment.classId, subjects);
    }
    for (const assignment of input.subjectAssignments ?? input.classIds.map((classId) => ({ classId, subjectIds: input.subjectIds }))) {
      subjectAssignments.set(assignment.classId, new Set(assignment.subjectIds));
    }
    if (input.assignmentType === "CLASS_TEACHER") {
      input.classIds.forEach((classId) => classTeacherClassIds.add(classId));
    } else {
      input.classIds.forEach((classId) => assignedClassIds.add(classId));
    }
    const subjectPayload = [...subjectAssignments.entries()].map(([classId, subjects]) => ({
      classId,
      subjectIds: [...subjects],
    })).filter((assignment) => assignment.subjectIds.length > 0);
    const subjectIds = [...new Set(subjectPayload.flatMap((assignment) => assignment.subjectIds))];
    await apiRequest(`/staff/${staffId}/classes`, {
      method: "PATCH",
      body: JSON.stringify({
        academicSessionId: input.academicSessionId,
        termId: input.termId,
        periodClassId: input.classIds[0],
        periodAssignmentType: input.assignmentType,
        periodSubjectIds: input.subjectIds,
        assignmentPolicy: input.assignmentPolicy,
        periodAssignments: (input.assignmentSnapshot ?? [])
          .filter((item) => item.classId === input.classIds[0] && !item.isRemoved && item.assignmentType !== "GENERAL_ACCESS")
          .map((item) => ({
            teacherId: item.teacherUserId,
            classId: item.classId,
            assignmentType: item.assignmentType,
            subjectId: item.assignmentType === "SUBJECT_TEACHER" ? item.subjectIds[0] : undefined,
            assignmentRole: item.assignmentRole,
          })),
        assignedClassIds: [...assignedClassIds],
        classTeacherClassIds: [...classTeacherClassIds],
        subjectIds,
        subjectAssignments: subjectPayload,
      }),
    });
    const localState = await super.getState();
    const localKeys = new Set(localState.teacherAssignments.map((item) => `${item.teacherUserId}:${item.classId}:${item.assignmentType}:${item.subjectIds.join(",")}:${item.academicSessionId ?? ""}:${item.termId ?? ""}`));
    for (const assignment of state.teacherAssignments.filter((item) => input.classIds.includes(item.classId) && !item.academicSessionId && !item.termId)) {
      const assignmentKey = `${assignment.teacherUserId}:${assignment.classId}:${assignment.assignmentType}:${assignment.subjectIds.join(",")}:${input.academicSessionId}:${input.termId}`;
      if (localKeys.has(assignmentKey)) continue;
      localState.teacherAssignments.push({
        ...assignment,
        id: createId("tca"),
        academicSessionId: input.academicSessionId,
        termId: input.termId,
        className: state.classes.find((item) => item.id === assignment.classId)?.displayName ?? assignment.className,
        assignmentRole: assignment.assignmentType === "CLASS_TEACHER" || assignment.assignmentType === "SUBJECT_TEACHER" ? "MAIN" : undefined,
      });
      localKeys.add(assignmentKey);
    }
    await saveAcademicsState(localState);
    return super.saveTeacherAssignments(input);
  }

  async createStaff(input: StaffInput) {
    if (!this.hasSession()) return super.createStaff(input);
    const response = await apiRequest<{ staff: BackendStaff }>("/staff", {
      method: "POST",
      body: JSON.stringify({
        ...input,
        gender: input.gender === "Male" ? "MALE" : input.gender === "Female" ? "FEMALE" : input.gender,
      }),
    });
    return mapBackendStaff(response.staff);
  }

  async updateStaff(id: string, input: Partial<StaffInput>) {
    if (!this.hasSession()) return super.updateStaff(id, input);
    const response = await apiRequest<BackendStaff | { staff: BackendStaff }>(`/staff/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...input,
        gender: input.gender === "Male" ? "MALE" : input.gender === "Female" ? "FEMALE" : input.gender,
      }),
    });
    const local = (await super.getState()).staff.find((item) => item.id === id || item.userId === id);
    const updated = mergeStaffFallback(mapBackendStaff(unwrapStaffResponse(response)), {
      ...(local ?? mapBackendStaff(unwrapStaffResponse(response))),
      fullName: input.name?.trim().replace(/\s+/g, " ") || local?.fullName || mapBackendStaff(unwrapStaffResponse(response)).fullName,
      email: input.email?.trim().toLowerCase() || local?.email || mapBackendStaff(unwrapStaffResponse(response)).email,
      jobTitle: input.jobTitle?.trim() || local?.jobTitle || mapBackendStaff(unwrapStaffResponse(response)).jobTitle,
      employeeNumber: input.employeeNumber ?? local?.employeeNumber,
      staffId: input.employeeNumber ?? local?.staffId,
      phone: input.phone ?? local?.phone,
      department: input.department ?? local?.department,
      salaryAmount: input.salaryAmount ?? local?.salaryAmount,
      gender: input.gender ?? local?.gender,
      dateOfBirth: input.dateOfBirth ?? local?.dateOfBirth,
      address: input.address ?? local?.address,
      photoUrl: input.photoUrl ?? local?.photoUrl,
      isTeachingStaff: input.isTeachingStaff ?? local?.isTeachingStaff ?? mapBackendStaff(unwrapStaffResponse(response)).isTeachingStaff,
      role: input.isTeachingStaff === false ? "STAFF" : input.isTeachingStaff === true ? "TEACHER" : local?.role ?? mapBackendStaff(unwrapStaffResponse(response)).role,
      updatedAt: new Date().toISOString(),
    });
    if (!updated.isTeachingStaff) {
      updated.assignedClassIds = [];
      updated.classTeacherClassIds = [];
      updated.subjectIds = [];
    }
    await this.saveLocalStaff(updated);
    return updated;
  }

  async createGuardian(input: Omit<Guardian, "id" | "schoolId" | "createdAt" | "updatedAt">) {
    if (!this.hasSession()) return super.createGuardian(input);
    if (!input.email) throw new Error("Parent email is required so they can set a password.");
    const response = await apiRequest<{ parent: BackendParent }>("/parents", {
      method: "POST",
      body: JSON.stringify({
        name: input.fullName,
        email: input.email,
        phone: input.phone,
        relationship: input.relationship,
          address: input.address,
          dateOfBirth: input.dateOfBirth,
        photoUrl: input.photoUrl,
      }),
    });
    const parent = mapBackendParent(response.parent);
    await this.saveLocalGuardian(parent);
    return parent;
  }

  async updateGuardian(id: string, input: Partial<Omit<Guardian, "id" | "schoolId" | "createdAt" | "updatedAt">>) {
    if (!this.hasSession()) return super.updateGuardian(id, input);
    const response = await apiRequest<{ parent: BackendParent }>(`/parents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
          ...input,
          name: input.fullName,
      }),
    });
    const parent = mapBackendParent(response.parent);
    await this.saveLocalGuardian(parent);
    return parent;
  }

  async assignStaffClasses(staffId: string, input: { assignedClassIds: string[]; classTeacherClassIds: string[]; subjectIds?: string[] }) {
    if (!this.hasSession()) return super.assignStaffClasses(staffId, input);
    const response = await apiRequest<BackendStaff | { staff: BackendStaff }>(`/staff/${staffId}/classes`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    const local = (await super.getState()).staff.find((item) => item.id === staffId || item.userId === staffId);
    const updated = {
      ...mergeStaffFallback(mapBackendStaff(unwrapStaffResponse(response)), local),
      assignedClassIds: input.assignedClassIds,
      classTeacherClassIds: input.classTeacherClassIds,
      subjectIds: input.subjectIds ?? local?.subjectIds ?? [],
      updatedAt: new Date().toISOString(),
    };
    await this.saveLocalStaff(updated);
    return updated;
  }

  async removeTeacherAssignment(assignmentId: string, assignmentSnapshot?: TeacherClassAssignment[], period?: { academicSessionId?: string; termId?: string }) {
    if (!this.hasSession()) return super.removeTeacherAssignment(assignmentId, assignmentSnapshot, period);
    const state = await this.getState();
    const inheritedParts = assignmentId.startsWith("inherited:") ? assignmentId.split(":") : undefined;
    const sourceId = inheritedParts?.[4];
    const source = sourceId
      ? state.teacherAssignments.find((item) => item.id === sourceId) ?? assignmentSnapshot?.find((item) => item.id === sourceId)
      : undefined;
    const assignment = state.teacherAssignments.find((item) => item.id === assignmentId) ?? (source && inheritedParts ? {
      ...source,
      id: assignmentId,
      classId: inheritedParts[3],
      academicSessionId: inheritedParts[1],
      termId: inheritedParts[2],
    } : undefined);
    if (!assignment) return super.removeTeacherAssignment(assignmentId, assignmentSnapshot);
    const staff = state.staff.find(
      (item) => item.userId === assignment.teacherUserId || item.id === assignment.teacherUserId,
    );
    if (!staff) return super.removeTeacherAssignment(assignmentId);
    const assignmentSessionId = assignment.academicSessionId ?? period?.academicSessionId;
    const assignmentTermId = assignment.termId ?? period?.termId;
    if (assignmentSessionId && assignmentTermId && isUuid(assignmentSessionId) && isUuid(assignmentTermId)) {
      const exactMarkerId = `period-snapshot:${assignmentSessionId}:${assignmentTermId}:${assignment.classId}`;
      const hasExactSnapshot = state.teacherAssignments.some((item) => item.id === exactMarkerId);
      const classLabel = assignment.className ?? state.classes.find((item) => item.id === assignment.classId)?.displayName;
      let currentRows = state.teacherAssignments.filter((item) =>
        item.classId === assignment.classId && item.academicSessionId === assignmentSessionId && item.termId === assignmentTermId && !item.isRemoved && item.assignmentType !== "GENERAL_ACCESS",
      );
      if (!hasExactSnapshot) {
        currentRows = state.teacherAssignments.filter((item) =>
          !item.isRemoved && item.assignmentType !== "GENERAL_ACCESS" &&
          ((source && item.academicSessionId === source.academicSessionId && item.termId === source.termId && (item.classId === source.classId || Boolean(classLabel && item.className?.toLowerCase() === classLabel.toLowerCase()))) ||
            (!source && !item.academicSessionId && !item.termId && item.classId === assignment.classId)),
        ).map((item) => ({ ...item, classId: assignment.classId, className: classLabel }));
      }
      const snapshot = currentRows
        .filter((item) => !(item.teacherUserId === assignment.teacherUserId && item.assignmentType === assignment.assignmentType && item.subjectIds.join(",") === assignment.subjectIds.join(",")))
        .map((item) => ({
          teacherId: item.teacherUserId,
          classId: item.classId,
          assignmentType: item.assignmentType,
          subjectId: item.assignmentType === "SUBJECT_TEACHER" ? item.subjectIds[0] : undefined,
          assignmentRole: item.assignmentRole,
        }));
      await apiRequest(`/staff/${staff.id}/classes`, {
        method: "PATCH",
        body: JSON.stringify({
          academicSessionId: assignmentSessionId,
          termId: assignmentTermId,
          periodClassId: assignment.classId,
          periodAssignmentType: "GENERAL_ACCESS",
          assignmentSnapshotOnly: true,
          periodAssignments: snapshot,
        }),
      });
      await super.removeTeacherAssignment(assignmentId, assignmentSnapshot);
      return;
    }
    const remaining = state.teacherAssignments.filter(
      (item) =>
        item.id !== assignmentId &&
        item.teacherUserId === assignment.teacherUserId &&
        (assignment.assignmentType === "SUBJECT_TEACHER" ||
          item.classId !== assignment.classId),
    );
    const assignedClassIds = new Set(staff.assignedClassIds);
    const classTeacherClassIds = new Set(staff.classTeacherClassIds);
    const subjectIds = new Set(staff.subjectIds);
    if (assignment.assignmentType === "CLASS_TEACHER") {
      classTeacherClassIds.delete(assignment.classId);
      assignedClassIds.delete(assignment.classId);
    } else if (
      assignment.assignmentType === "GENERAL_ACCESS" ||
      !remaining.some(
        (item) =>
          item.classId === assignment.classId &&
          item.assignmentType !== "CLASS_TEACHER",
      )
    ) {
      assignedClassIds.delete(assignment.classId);
    }
    if (assignment.assignmentType !== "SUBJECT_TEACHER") {
      const removedSubjectIds = new Set(
        state.teacherAssignments
          .filter(
            (item) =>
              item.teacherUserId === assignment.teacherUserId &&
              item.classId === assignment.classId,
          )
          .flatMap((item) => item.subjectIds),
      );
      for (const subjectId of removedSubjectIds) {
        if (!remaining.some((item) => item.subjectIds.includes(subjectId))) {
          subjectIds.delete(subjectId);
        }
      }
    } else {
      for (const subjectId of assignment.subjectIds) {
        if (!remaining.some((item) => item.subjectIds.includes(subjectId))) {
          subjectIds.delete(subjectId);
        }
      }
    }
    await apiRequest(`/staff/${staff.id}/classes`, {
      method: "PATCH",
      body: JSON.stringify({
        assignedClassIds: [...assignedClassIds],
        classTeacherClassIds: [...classTeacherClassIds],
        subjectIds: [...subjectIds],
      }),
    });
    await super.removeTeacherAssignment(assignmentId);
  }

  async setStaffStatus(staffId: string, status: "ACTIVE" | "SUSPENDED") {
    if (!this.hasSession()) return super.setStaffStatus(staffId, status);
    const response = await apiRequest<{ staff: BackendStaff }>(`/staff/${staffId}/${status === "ACTIVE" ? "activate" : "suspend"}`, {
      method: "PATCH",
    });
    return mapBackendStaff(response.staff);
  }

  async removeStaff(staffId: string) {
    if (!this.hasSession()) return super.removeStaff(staffId);
    await apiRequest<void>(`/staff/${staffId}`, { method: "DELETE" });
  }

  async createSubject(input: SubjectInput) {
    const [subject] = await this.createSubjects([input]);
    return subject;
  }

  async createSubjects(inputs: SubjectInput[]) {
    if (!this.hasSession()) return super.createSubjects(inputs);
    const body = inputs.map((input) => {
      const code = input.code?.trim();
      return {
        ...input,
        name: input.name.trim(),
        code: code ? code.toUpperCase() : undefined,
        description: input.description?.trim() || undefined,
      };
    });
    const created = await Promise.all(
      body.map((item) =>
        apiRequest<{ subject: BackendSubject }>("/subjects", {
          method: "POST",
          body: JSON.stringify(item),
        }),
      ),
    );
    return created.map((response) => mapBackendSubject(response.subject));
  }

  async setSubjectStatus(id: string, status: Subject["status"]) {
    if (!this.hasSession()) return super.setSubjectStatus(id, status);
    const response = await apiRequest<{ subject: BackendSubject }>(`/subjects/${id}/${status === "ACTIVE" ? "activate" : "archive"}`, {
      method: "PATCH",
    });
    return mapBackendSubject(response.subject);
  }

  async removeSubject(id: string) {
    if (!this.hasSession()) return super.removeSubject(id);
    await apiRequest<void>(`/subjects/${id}`, { method: "DELETE" });
  }

  async createStudent(input: StudentInput, context: EnrollmentContext) {
    if (!this.hasSession() || !isUuid(context.academicSessionId)) return super.createStudent(input, context);
    const response = await apiRequest<BackendStudent | { student: BackendStudent }>("/students", {
      method: "POST",
      body: JSON.stringify({
        ...studentBody(input),
        classId: input.classId || undefined,
        parentIds: input.parentIds ?? input.guardianIds,
      }),
    });
    const student = "student" in response ? response.student : response;
    let created = mergeStudentFallback(mapBackendStudent(student), input);
    if (input.status && created.status !== input.status) {
      const response = await apiRequest<{ student: BackendStudent }>(`/students/${student.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: input.status }),
      });
      created = mergeStudentFallback(mapBackendStudent(response.student), {
        ...input,
        status: input.status,
      });
    }
    await this.saveLocalStudent(created);
    await super.ensureSessionEnrollments(context, true);
    return created;
  }

  async updateStudent(id: string, input: Partial<StudentInput>) {
    if (!this.hasSession()) return super.updateStudent(id, input);
    const existing = (await super.getState()).students.find((item) => item.id === id);
    let updated = mergeStudentFallback(mapBackendStudent(unwrapStudentResponse(await apiRequest<BackendStudent | { student: BackendStudent }>(`/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(studentBody(input)),
    }))), { ...existing, ...input, updatedAt: new Date().toISOString() } as Student);
    if (input.status && updated.status !== input.status) {
      const response = await apiRequest<{ student: BackendStudent }>(`/students/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: input.status }),
      });
      updated = mergeStudentFallback(mapBackendStudent(response.student), {
        ...existing,
        ...input,
        status: input.status,
      });
    }
    await this.saveLocalStudent(updated);
    return updated;
  }

  async assignStudentParents(studentId: string, guardianIds: string[]) {
    if (!this.hasSession()) return super.assignStudentParents(studentId, guardianIds);
    const response = await apiRequest<BackendStudent | { student: BackendStudent }>(`/students/${studentId}/parents`, {
      method: "PATCH",
      body: JSON.stringify({ parentIds: guardianIds }),
    });
    const local = await super.getState();
    const existing = local.students.find((item) => item.id === studentId);
    const updated = mergeStudentFallback(mapBackendStudent(unwrapStudentResponse(response)), {
      ...existing,
      guardianIds,
      parentIds: guardianIds,
      updatedAt: new Date().toISOString(),
    });
    await this.saveLocalStudent(updated);
    return updated;
  }

  async moveStudentToClass(input: { studentId: string; classId: string; effectiveDate: string; reason: string }, context: EnrollmentContext) {
    if (!this.hasSession() || !isUuid(context.academicSessionId)) {
      return super.moveStudentToClass({
        ...input,
      }, context);
    }
    const local = await super.getState();
    const existing = local.students.find((item) => item.id === input.studentId);
    const updated = mergeStudentFallback(mapBackendStudent(unwrapStudentResponse(await apiRequest<BackendStudent | { student: BackendStudent }>(`/students/${input.studentId}/class`, {
      method: "PATCH",
      body: JSON.stringify({ classId: input.classId }),
    }))), { ...existing, classId: input.classId, updatedAt: new Date().toISOString() } as Student);
    await this.saveLocalStudent(updated);
    if (local.classes.some((item) => item.id === input.classId && item.schoolId === context.schoolId)) {
      await super.moveStudentToClass(input, context);
    }
    return updated;
  }

  async updateStudentStatus(id: string, status: StudentStatus) {
    if (!this.hasSession()) return super.updateStudentStatus(id, status);
    const response = await apiRequest<BackendStudent | { student: BackendStudent }>(`/students/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    const existing = (await super.getState()).students.find((item) => item.id === id);
    const updated = mergeStudentFallback(mapBackendStudent(unwrapStudentResponse(response)), {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    } as Student);
    await this.saveLocalStudent(updated);
    return updated;
  }
}

export const academicsRepository: AcademicsRepository =
  new BackendAcademicsRepository();
