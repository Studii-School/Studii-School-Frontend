export type TimetableDay = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

export interface TimetableEntry {
  id: string;
  schoolId: string;
  classId: string;
  teacherUserId: string;
  subjectId: string;
  day: TimetableDay;
  startTime: string;
  endTime: string;
  room?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableInput {
  classId: string;
  subjectId: string;
  day: TimetableDay;
  startTime: string;
  endTime: string;
  room?: string;
  note?: string;
}
