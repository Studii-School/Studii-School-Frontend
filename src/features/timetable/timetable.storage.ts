import { readStoredJson, writeStoredJson } from "@/lib/storage";
import type { TimetableEntry } from "./timetable.types";

export const TIMETABLE_STORAGE_KEY = "schoolos.timetable.v1";

export function getStoredTimetable() {
  return readStoredJson<TimetableEntry[]>(TIMETABLE_STORAGE_KEY, []);
}

export function saveStoredTimetable(entries: TimetableEntry[]) {
  writeStoredJson(TIMETABLE_STORAGE_KEY, entries);
}
