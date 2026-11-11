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
  academicSessionId?: string;
  sessionId?: string;
  termId?: string;
  academicSession?: string;
  term?: string;
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
  academicSessionId?: string;
  termId?: string;
  academicSession?: string;
  term?: string;
}
