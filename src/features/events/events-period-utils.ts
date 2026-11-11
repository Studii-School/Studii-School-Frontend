import type { DatePeriodScope } from "@/features/academic-period/period-scope-utils";
import type { SchoolEvent } from "./events.types";

export type EventPeriodScope = DatePeriodScope & {
  academicSessionId?: string;
  termId?: string;
  academicSession?: string;
  term?: string;
};

export function eventBelongsToPeriod(event: SchoolEvent, scope: EventPeriodScope, backendPeriodScoped = false) {
  if (event.academicSessionId || event.termId) {
    return Boolean(scope.academicSessionId && scope.termId) &&
      event.academicSessionId === scope.academicSessionId && event.termId === scope.termId;
  }
  if (event.academicSession || event.term) {
    return Boolean(scope.academicSession && scope.term) &&
      event.academicSession === scope.academicSession && event.term === scope.term;
  }
  // The authenticated /events request is already scoped by sessionId and termId.
  // Some API responses omit those fields, so the response itself is authoritative.
  return backendPeriodScoped && Boolean(scope.academicSessionId && scope.termId);
}

export function filterEventsByPeriod(events: SchoolEvent[], scope: EventPeriodScope, backendPeriodScoped = false) {
  return events.filter((event) => eventBelongsToPeriod(event, scope, backendPeriodScoped));
}
