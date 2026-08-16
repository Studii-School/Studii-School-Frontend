import { readStoredJson,removeStoredValue,writeStoredJson } from "@/lib/storage";
import type { AttendanceRegister } from "./attendance.types";
export const ATTENDANCE_STORAGE_KEY="schoolos.attendance.v1";
const defaults=():AttendanceRegister[]=>[];
export async function getStoredAttendance(){return readStoredJson<AttendanceRegister[]>(ATTENDANCE_STORAGE_KEY,defaults())}
export async function saveStoredAttendance(items:AttendanceRegister[]){writeStoredJson(ATTENDANCE_STORAGE_KEY,items);return items}
export async function resetStoredAttendance(){removeStoredValue(ATTENDANCE_STORAGE_KEY);return defaults()}
