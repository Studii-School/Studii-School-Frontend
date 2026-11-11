import type { TimetableEntry, TimetableInput } from "./timetable.types";

type TimetablePeriod = Pick<TimetableInput, "academicSessionId" | "termId" | "academicSession" | "term"> & { isCurrentPeriod?: boolean };

function sameLabel(left?: string, right?: string) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());
}

function sameTerm(left?: string, right?: string) {
  const normalize = (value?: string) => value?.trim().toLowerCase().replace(/[_\s]+term$/, "").replaceAll("_", " ");
  return Boolean(left && right && normalize(left) === normalize(right));
}

export function timetableEntryBelongsToPeriod(entry: TimetableEntry, scope: TimetablePeriod) {
  const sessionId = entry.academicSessionId ?? entry.sessionId;
  if (sessionId || entry.termId) {
    if (sessionId && !entry.termId) return Boolean(scope.isCurrentPeriod && sessionId === scope.academicSessionId);
    return Boolean(scope.academicSessionId && scope.termId &&
      sessionId === scope.academicSessionId && entry.termId === scope.termId);
  }
  if (entry.academicSession && !entry.term) {
    return Boolean(scope.isCurrentPeriod && sameLabel(entry.academicSession, scope.academicSession));
  }
  if (!entry.academicSession && !entry.term) return scope.isCurrentPeriod === true;
  return sameLabel(entry.academicSession, scope.academicSession) && sameTerm(entry.term, scope.term);
}

export function filterTimetableByPeriod(
  entries: TimetableEntry[],
  scope: TimetablePeriod,
) {
  return entries.filter((entry) => timetableEntryBelongsToPeriod(entry, scope));
}

export function visibleTimetableEntries(entries: TimetableEntry[], scope: TimetablePeriod, isBackendTimetable: boolean) {
  // The backend stores one school-wide weekly timetable and has no period columns.
  return isBackendTimetable ? entries : filterTimetableByPeriod(entries, scope);
}

export function findTimetableConflict(entries: TimetableEntry[], input: TimetableInput, entryId?: string, isCurrentPeriod = false) {
  return entries.find((entry) => entry.id !== entryId &&
    timetableEntryBelongsToPeriod(entry, { ...input, isCurrentPeriod }) &&
    entry.classId === input.classId && entry.day === input.day &&
    input.startTime < entry.endTime && input.endTime > entry.startTime);
}
