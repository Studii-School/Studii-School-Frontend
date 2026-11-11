import type { DatePeriodScope } from "@/features/academic-period/period-scope-utils";
import type { Announcement } from "./announcements.types";

export type AnnouncementPeriodScope = DatePeriodScope & {
  academicSessionId?: string;
  sessionId?: string;
  termId?: string;
};

export function announcementBelongsToPeriod(
  announcement: Announcement,
  scope: AnnouncementPeriodScope,
) {
  const announcementSessionId = announcement.academicSessionId ?? announcement.sessionId;
  // Backend announcements belong to the school and have no term fields.
  if (!announcementSessionId && !announcement.termId) return true;
  const scopeSessionId = scope.academicSessionId ?? scope.sessionId;
  if (!scopeSessionId || !scope.termId) return false;
  return announcementSessionId === scopeSessionId && announcement.termId === scope.termId;
}

export function filterAnnouncementsByPeriod(
  announcements: Announcement[],
  scope: AnnouncementPeriodScope,
) {
  return announcements.filter((item) => announcementBelongsToPeriod(item, scope));
}
