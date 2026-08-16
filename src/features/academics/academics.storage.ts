import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from "@/lib/storage";
import { inferTemplate } from "./academics.class-templates";
import { buildClassDisplayName, sortClasses } from "./academics.class-utils";
import type { AcademicsState, SchoolClass } from "./academics.types";

export const ACADEMICS_STORAGE_KEY = "schoolos.academics.v2";
const LEGACY_STORAGE_KEY = "schoolos.academics.v1";
const emptyAcademicsState: AcademicsState = {
  version: 2,
  classes: [],
  students: [],
  staff: [],
  teachers: [],
  subjects: [],
  teacherAssignments: [],
  guardians: [],
  studentDocuments: [],
  studentActivities: [],
  studentClassHistory: [],
};
const demoClassIds = new Set([
  "class-jss1-gold",
  "class-jss1-blue",
  "class-jss2",
  "class-jss3",
  "class-ss1-science",
  "class-ss2-commercial",
  "class-ss3-arts",
]);
const demoStudentIds = new Set([
  "student-yusuf",
  "student-david",
  "student-favour",
  "student-ifeoma",
  "student-zainab",
  "student-tobi",
  "student-chidera",
  "student-amina",
]);
const demoTeacherIds = new Set(["teacher-001", "teacher-002", "teacher-003"]);
const defaults = () => structuredClone(emptyAcademicsState);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function migrateClass(value: unknown, index: number): SchoolClass | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const baseName =
    typeof value.baseName === "string" ? value.baseName.trim() : "";
  if (!baseName) return null;
  const suffix =
    typeof value.suffix === "string"
      ? value.suffix.trim() || undefined
      : typeof value.arm === "string"
        ? value.arm.trim() || undefined
        : undefined;
  const template = inferTemplate(baseName);
  const level = value.level === "PRIMARY" ? "PRIMARY" : "SECONDARY";
  const now = new Date().toISOString();
  return {
    id: value.id,
    schoolId:
      typeof value.schoolId === "string" ? value.schoolId : "school-001",
    level,
    source:
      value.source === "CUSTOM" || value.source === "STANDARD"
        ? value.source
        : template
          ? "STANDARD"
          : "CUSTOM",
    templateKey:
      typeof value.templateKey === "string"
        ? value.templateKey
        : template?.key,
    baseName,
    suffix,
    arm: suffix,
    displayName: buildClassDisplayName(baseName, suffix),
    sortOrder:
      typeof value.sortOrder === "number" && Number.isFinite(value.sortOrder)
        ? value.sortOrder
        : (template?.defaultSortOrder ?? 1000) + index,
    capacity:
      typeof value.capacity === "number" && value.capacity > 0
        ? Math.round(value.capacity)
        : undefined,
    classTeacherUserId:
      typeof value.classTeacherUserId === "string"
        ? value.classTeacherUserId
        : undefined,
    assignedTeacherUserIds: Array.isArray(value.assignedTeacherUserIds)
      ? value.assignedTeacherUserIds.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    studentIds: Array.isArray(value.studentIds)
      ? value.studentIds.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    status:
      value.status === "INACTIVE" || value.status === "ARCHIVED"
        ? value.status
        : "ACTIVE",
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt:
      typeof value.updatedAt === "string" ? value.updatedAt : now,
  };
}

function migrateState(value: unknown): AcademicsState {
  if (!isRecord(value)) return defaults();
  const fallback = defaults();
  const classes = Array.isArray(value.classes)
    ? value.classes
        .map(migrateClass)
        .filter((item): item is SchoolClass => item !== null)
    : fallback.classes;
  const migrated: AcademicsState = {
    version: 2,
    classes: sortClasses(classes),
    students: Array.isArray(value.students)
      ? (value.students as AcademicsState["students"])
      : fallback.students,
    staff: Array.isArray(value.staff)
      ? (value.staff as AcademicsState["staff"])
      : fallback.staff,
    teachers: Array.isArray(value.teachers)
      ? (value.teachers as AcademicsState["teachers"])
      : fallback.teachers,
    subjects: Array.isArray(value.subjects)
      ? (value.subjects as AcademicsState["subjects"])
      : fallback.subjects,
    teacherAssignments: Array.isArray(value.teacherAssignments)
      ? (value.teacherAssignments as AcademicsState["teacherAssignments"])
      : fallback.teacherAssignments,
    guardians: Array.isArray(value.guardians)
      ? (value.guardians as AcademicsState["guardians"])
      : fallback.guardians,
    studentDocuments: Array.isArray(value.studentDocuments)
      ? (value.studentDocuments as AcademicsState["studentDocuments"])
      : fallback.studentDocuments,
    studentActivities: Array.isArray(value.studentActivities)
      ? (value.studentActivities as AcademicsState["studentActivities"])
      : fallback.studentActivities,
    studentClassHistory: Array.isArray(value.studentClassHistory)
      ? (value.studentClassHistory as AcademicsState["studentClassHistory"])
      : fallback.studentClassHistory,
  };
  return removeDemoRecords(migrated);
}

function isDemoClass(item: SchoolClass) {
  return demoClassIds.has(item.id) || item.id.startsWith("class-template-primary-");
}

function isValidStudent(
  item: AcademicsState["students"][number],
) {
  return Boolean(
    item?.id &&
      item.firstName?.trim() &&
      item.lastName?.trim() &&
      item.admissionNumber?.trim(),
  );
}

function removeDemoRecords(state: AcademicsState): AcademicsState {
  const classes = state.classes.filter((item) => !isDemoClass(item));
  const classIds = new Set(classes.map((item) => item.id));
  const students = state.students.filter(
    (item) =>
      isValidStudent(item) &&
      !demoStudentIds.has(item.id) &&
      (!item.classId || classIds.has(item.classId)),
  );
  const studentIds = new Set(students.map((item) => item.id));
  return {
    ...state,
    classes: classes.map((item) => ({
      ...item,
      studentIds: item.studentIds.filter((id) => studentIds.has(id)),
    })),
    students,
    staff: state.staff ?? [],
    teachers: state.teachers.filter((item) => !demoTeacherIds.has(item.id)),
    teacherAssignments: state.teacherAssignments.filter((item) =>
      classIds.has(item.classId),
    ),
    guardians: state.guardians.filter((item) =>
      students.some((student) => student.guardianIds.includes(item.id)),
    ),
    studentDocuments: state.studentDocuments.filter((item) =>
      studentIds.has(item.studentId),
    ),
    studentActivities: state.studentActivities.filter((item) =>
      studentIds.has(item.studentId),
    ),
    studentClassHistory: state.studentClassHistory.filter(
      (item) =>
        (!item.fromClassId || classIds.has(item.fromClassId)) &&
        classIds.has(item.toClassId),
    ),
  };
}

export async function getAcademicsState() {
  const current = readStoredJson<unknown>(ACADEMICS_STORAGE_KEY, null);
  const legacy =
    current ?? readStoredJson<unknown>(LEGACY_STORAGE_KEY, emptyAcademicsState);
  const migrated = migrateState(legacy);
  writeStoredJson(ACADEMICS_STORAGE_KEY, migrated);
  return migrated;
}

export async function saveAcademicsState(state: AcademicsState) {
  const saved = migrateState(state);
  writeStoredJson(ACADEMICS_STORAGE_KEY, saved);
  return saved;
}

export async function resetAcademicsState() {
  removeStoredValue(ACADEMICS_STORAGE_KEY);
  removeStoredValue(LEGACY_STORAGE_KEY);
  return defaults();
}
