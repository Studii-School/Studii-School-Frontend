import type { AnnouncementAudience } from "./announcements.types";

export const announcementAudienceOptions: { value: AnnouncementAudience; label: string }[] = [
  { value: "EVERYONE", label: "Everyone" },
  { value: "STUDENTS", label: "Students" },
  { value: "TEACHERS", label: "Teachers" },
  { value: "PARENTS", label: "Parents" },
  { value: "STAFF", label: "Staff" },
  { value: "SELECTED_CLASSES", label: "Selected classes" },
];
