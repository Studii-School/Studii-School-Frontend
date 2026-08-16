export type AnnouncementAudience = "EVERYONE" | "STUDENTS" | "TEACHERS" | "PARENTS" | "STAFF" | "SELECTED_CLASSES";
export type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  summary: string;
  content: string;
  /** Legacy search alias retained for locally persisted announcement records. */
  body?: string;
  audiences: AnnouncementAudience[];
  selectedClassIds: string[];
  status: AnnouncementStatus;
  isPinned: boolean;
  publishAt?: string;
  expiresAt?: string;
  attachmentName?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementInput = Omit<Announcement, "id" | "schoolId" | "createdAt" | "updatedAt">;
