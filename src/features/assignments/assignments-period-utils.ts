import type { DatePeriodScope } from "@/features/academic-period/period-scope-utils";
import type { Assignment } from "./assignments.types";

export type AssignmentPeriodScope = DatePeriodScope & {
  academicSessionId?: string;
  sessionId?: string;
  termId?: string;
};

export function assignmentBelongsToPeriod(assignment: Assignment, scope: AssignmentPeriodScope) {
  const scopeSessionId = scope.academicSessionId ?? scope.sessionId;
  const assignmentSessionId = assignment.academicSessionId ?? assignment.sessionId;
  if (!scopeSessionId || !scope.termId) return false;
  return assignmentSessionId === scopeSessionId && assignment.termId === scope.termId;
}

export function filterAssignmentsByPeriod(assignments: Assignment[], scope: AssignmentPeriodScope) {
  return assignments.filter((assignment) => assignmentBelongsToPeriod(assignment, scope));
}
