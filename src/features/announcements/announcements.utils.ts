import type { Announcement } from "./announcements.types";

export type AnnouncementViewerRole = "admin" | "teacher" | "student" | "parent";

export function canUserViewAnnouncement(role: AnnouncementViewerRole, announcement: Announcement, classIds: string[] = [], currentDate = new Date()) {
  if (role === "admin") return true;
  if (announcement.status !== "PUBLISHED") return false;
  if (announcement.publishAt && new Date(`${announcement.publishAt}T00:00:00`) > currentDate) return false;
  if (announcement.expiresAt && new Date(`${announcement.expiresAt}T23:59:59`) < currentDate) return false;
  if (announcement.audiences.includes("EVERYONE")) return true;
  if (role === "teacher" && announcement.audiences.some((item) => item === "TEACHERS" || item === "STAFF")) return true;
  if (role === "student" && announcement.audiences.includes("STUDENTS")) return true;
  if (role === "parent" && announcement.audiences.includes("PARENTS")) return true;
  return announcement.audiences.includes("SELECTED_CLASSES") && classIds.some((id) => announcement.selectedClassIds.includes(id));
}

export function getAnnouncementsForUser(items: Announcement[], role: AnnouncementViewerRole, classIds: string[] = [], currentDate = new Date()) {
  return items.filter((item) => canUserViewAnnouncement(role, item, classIds, currentDate)).sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (b.publishAt ?? b.createdAt).localeCompare(a.publishAt ?? a.createdAt));
}
