export type EventCategory = "Academic" | "Sports" | "Cultural" | "Examination" | "Holiday" | "Meeting" | "PTA" | "Excursion" | "Graduation" | "General";
export type EventAudience = "Everyone" | "Students" | "Teachers" | "Parents" | "Staff" | "Selected Classes";
export type PortalAudience = "admin" | "teacher" | "student" | "parent";

export interface SchoolEvent {
  id: string; schoolId: string; title: string; shortDescription: string; description?: string; category: EventCategory;
  startDate: string; startTime?: string; endDate?: string; endTime?: string; location?: string; audience: EventAudience[];
  selectedClasses?: string[]; color?: string; isFeatured: boolean; isPublished: boolean; createdAt: string; updatedAt: string;
}

export type SchoolEventInput = Omit<SchoolEvent, "id" | "schoolId" | "createdAt" | "updatedAt">;
