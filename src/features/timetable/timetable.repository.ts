import { academicsRepository } from "@/features/academics/academics.repository";
import { apiRequest, readStoredToken } from "@/lib/api";
import { getStoredTimetable, saveStoredTimetable } from "./timetable.storage";
import type { TimetableEntry, TimetableInput } from "./timetable.types";

const uid = () => `timetable-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function overlaps(a: TimetableInput, b: TimetableEntry) {
  return a.classId === b.classId && a.day === b.day && a.startTime < b.endTime && a.endTime > b.startTime;
}

type TimetableListResponse = TimetableEntry[] | { entries?: TimetableEntry[]; data?: TimetableEntry[] };

function listFromResponse(value: TimetableListResponse) {
  return Array.isArray(value) ? value : value.entries ?? value.data ?? [];
}

function hasBackendSession() {
  return Boolean(readStoredToken());
}

export const timetableRepository = {
  async list() {
    if (hasBackendSession()) {
      return listFromResponse(await apiRequest<TimetableListResponse>("/timetable"));
    }
    return getStoredTimetable();
  },
  async save(teacherUserId: string, input: TimetableInput, entryId?: string) {
    if (!input.classId || !input.subjectId || !input.day || !input.startTime || !input.endTime) {
      throw new Error("Class, subject, day, start time and end time are required.");
    }
    if (input.startTime >= input.endTime) throw new Error("End time must be after start time.");
    if (!await academicsRepository.canTeacherAccessClass(teacherUserId, input.classId)) {
      throw new Error("You cannot manage timetable entries for an unassigned class.");
    }
    if (hasBackendSession()) {
      const response = await apiRequest<{ entry: TimetableEntry }>(entryId ? `/timetable/${entryId}` : "/timetable", {
        method: entryId ? "PATCH" : "POST",
        body: JSON.stringify(input),
      });
      return response.entry;
    }
    const entries = getStoredTimetable();
    const conflict = entries.find((entry) => entry.id !== entryId && overlaps(input, entry));
    if (conflict) throw new Error("This class already has a timetable entry in that time range.");
    const now = new Date().toISOString();
    const existing = entryId ? entries.find((entry) => entry.id === entryId) : undefined;
    if (existing) {
      if (existing.teacherUserId !== teacherUserId) throw new Error("You cannot edit another teacher's timetable entry.");
      Object.assign(existing, input, { room: input.room?.trim() || undefined, note: input.note?.trim() || undefined, updatedAt: now });
      saveStoredTimetable(entries);
      return existing;
    }
    const created: TimetableEntry = {
      ...input,
      id: uid(),
      schoolId: "school-001",
      teacherUserId,
      room: input.room?.trim() || undefined,
      note: input.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    saveStoredTimetable([created, ...entries]);
    return created;
  },
  async remove(teacherUserId: string, entryId: string) {
    if (hasBackendSession()) {
      await apiRequest(`/timetable/${entryId}`, { method: "DELETE" });
      return;
    }
    const entries = getStoredTimetable();
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) throw new Error("Timetable entry not found.");
    if (entry.teacherUserId !== teacherUserId) throw new Error("You cannot delete another teacher's timetable entry.");
    saveStoredTimetable(entries.filter((item) => item.id !== entryId));
  },
};
