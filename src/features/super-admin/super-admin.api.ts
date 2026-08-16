"use client";

import { apiRequest } from "@/lib/api";
import type { SchoolAdminFormState, SchoolFormState, SchoolRecord } from "./super-admin.types";

function extractCollection<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }
  if (Array.isArray(record.data)) return record.data as T[];
  if (record.data && typeof record.data === "object") return extractCollection<T>(record.data, keys);
  return [];
}

export async function getSchools() {
  const data = await apiRequest<unknown>("/schools");
  return extractCollection<SchoolRecord>(data, ["schools", "items", "results"]);
}

export function createSchool(values: SchoolFormState) {
  return apiRequest<SchoolRecord>("/schools", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function suspendSchool(schoolId: string) {
  return apiRequest<SchoolRecord>(`/schools/${schoolId}/suspend`, { method: "PATCH" });
}

export function reactivateSchool(schoolId: string) {
  return apiRequest<SchoolRecord>(`/schools/${schoolId}/reactivate`, { method: "PATCH" });
}

export function deleteSchool(schoolId: string) {
  return apiRequest<void>(`/schools/${schoolId}`, { method: "DELETE" });
}

export function createSchoolAdmin({ schoolId, ...values }: SchoolAdminFormState) {
  return apiRequest(`/schools/${schoolId}/admins`, {
    method: "POST",
    body: JSON.stringify(values),
  });
}
