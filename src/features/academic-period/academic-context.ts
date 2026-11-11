import type { SchoolClass } from "@/features/academics/academics.types";

export interface AcademicContextIdentity {
  schoolId: string;
  academicSessionId: string;
  termId: string;
  startDate?: string;
  endDate?: string;
}

export interface AcademicOwnedRecord {
  schoolId?: string;
  academicSessionId?: string;
  /** Temporary read compatibility for records created before academicSessionId was canonical. */
  sessionId?: string;
  termId?: string;
}

export function academicContextQuery(context: AcademicContextIdentity) {
  const query = new URLSearchParams();
  query.set("sessionId", context.academicSessionId);
  query.set("termId", context.termId);
  return query;
}

export function recordBelongsToAcademicContext(
  record: AcademicOwnedRecord,
  context: AcademicContextIdentity,
) {
  if (!context.schoolId || !context.academicSessionId || !context.termId) return false;
  if (record.schoolId && record.schoolId !== context.schoolId) return false;
  const sessionId = record.academicSessionId ?? record.sessionId;
  return sessionId === context.academicSessionId && record.termId === context.termId;
}

export function recordBelongsToAcademicSession(
  record: Omit<AcademicOwnedRecord, "termId">,
  context: Pick<AcademicContextIdentity, "schoolId" | "academicSessionId">,
) {
  if (!context.schoolId || !context.academicSessionId) return false;
  if (record.schoolId && record.schoolId !== context.schoolId) return false;
  return (record.academicSessionId ?? record.sessionId) === context.academicSessionId;
}

export function studentClassForAcademicSession(
  currentClassId: string,
  enrolledClassId: string | undefined,
  sessionClassIds?: ReadonlySet<string>,
) {
  // Keep the existing class relationship if no session-specific placement exists.
  const classId = enrolledClassId ?? currentClassId;
  return sessionClassIds && !sessionClassIds.has(classId) ? "" : classId;
}

export function matchingClassForAcademicSession(
  source: SchoolClass | undefined,
  sessionClasses: SchoolClass[],
) {
  if (!source) return undefined;
  const normalise = (value?: string | null) => value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
  return sessionClasses.find((target) => {
    if (target.level !== source.level) return false;
    if (target.id === source.id) return true;
    const sourceDisplayName = normalise(source.displayName || source.name);
    const targetDisplayName = normalise(target.displayName || target.name);
    if (sourceDisplayName && sourceDisplayName === targetDisplayName) return true;
    return normalise(source.baseName) === normalise(target.baseName) &&
      normalise(source.suffix ?? source.arm ?? source.section) === normalise(target.suffix ?? target.arm ?? target.section);
  });
}
