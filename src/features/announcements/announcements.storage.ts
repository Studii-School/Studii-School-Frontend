import { readStoredJson, removeStoredValue, writeStoredJson } from "@/lib/storage";
import type { Announcement } from "./announcements.types";

export const ANNOUNCEMENTS_STORAGE_KEY = "schoolos.announcements.v1";
const defaults = (): Announcement[] => [];
export async function getStoredAnnouncements(): Promise<Announcement[]> { return readStoredJson(ANNOUNCEMENTS_STORAGE_KEY, defaults()); }
export async function saveStoredAnnouncements(items: Announcement[]) { writeStoredJson(ANNOUNCEMENTS_STORAGE_KEY, items); return items; }
export async function resetStoredAnnouncements() { removeStoredValue(ANNOUNCEMENTS_STORAGE_KEY); return defaults(); }
