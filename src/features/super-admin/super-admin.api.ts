"use client";

import { apiRequest } from "@/lib/api";
import { isSuperAdminPreview } from "@/lib/super-admin-preview";
import type { DemoRequestRecord, SchoolAdminFormState, SchoolFormState, SchoolRecord } from "./super-admin.types";

const previewSchools: SchoolRecord[] = [
  { id: "preview-school-1", name: "Sample Academy", code: "SAMPLE", email: "hello@sample.example", phone: "+234 800 000 0001", address: "12 Sample Road, Lagos", status: "ACTIVE", createdAt: "2026-08-12T10:00:00Z", _count: { users: 186 } },
  { id: "preview-school-2", name: "Preview Learning Centre", code: "PREVIEW", email: "hello@preview.example", phone: "+234 800 000 0002", address: "48 Preview Avenue, Abuja", status: "SUSPENDED", createdAt: "2026-10-03T10:00:00Z", _count: { users: 72 } },
];

const previewRequests: DemoRequestRecord[] = [
  { id: "preview-request-1", schoolName: "Example Primary School", contactName: "Amina Bello", email: "amina@example.test", phone: "+234 800 000 0003", preferredDate: "2026-11-30", preferredTime: "10:00", schoolSize: "100_499", status: "NEW", createdAt: "2026-11-27T09:00:00Z" },
  { id: "preview-request-2", schoolName: "Example College", contactName: "Tunde Ade", email: "tunde@example.test", phone: "+234 800 000 0004", preferredDate: "2026-12-01", preferredTime: "14:00", schoolSize: "500_999", status: "CONTACTED", createdAt: "2026-11-26T11:00:00Z" },
];

function requireRealSession() {
  if (isSuperAdminPreview()) throw new Error("Actions are unavailable in the local preview.");
}

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
  if (isSuperAdminPreview()) return previewSchools;
  const data = await apiRequest<unknown>("/schools");
  return extractCollection<SchoolRecord>(data, ["schools", "items", "results"]);
}

export async function getSchool(schoolId: string) {
  if (isSuperAdminPreview()) {
    const school = previewSchools.find((item) => item.id === schoolId);
    if (!school) throw new Error("School not found.");
    return { ...school, totalUsers: school._count?.users ?? 0, schoolAdmins: [{ id: `preview-admin-${schoolId}`, name: "Sample School Admin", email: "admin@example.test", createdAt: "2026-08-12T10:00:00Z" }] } satisfies SchoolRecord;
  }
  return apiRequest<SchoolRecord>(`/schools/${encodeURIComponent(schoolId)}`);
}

export function updateSchool(schoolId: string, values: Partial<SchoolFormState>) {
  requireRealSession();
  return apiRequest<{ message: string; school: SchoolRecord }>(`/schools/${encodeURIComponent(schoolId)}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function createSchool(values: SchoolFormState) {
  requireRealSession();
  return apiRequest<{ message: string; school: SchoolRecord }>("/schools", {
    method: "POST",
    body: JSON.stringify({
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      ...(values.email.trim() ? { email: values.email.trim().toLowerCase() } : {}),
      ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
      ...(values.address.trim() ? { address: values.address.trim() } : {}),
    }),
  });
}

export function suspendSchool(schoolId: string) {
  requireRealSession();
  return apiRequest<SchoolRecord>(`/schools/${schoolId}/suspend`, { method: "PATCH" });
}

export function reactivateSchool(schoolId: string) {
  requireRealSession();
  return apiRequest<SchoolRecord>(`/schools/${schoolId}/reactivate`, { method: "PATCH" });
}

export function deleteSchool(schoolId: string) {
  requireRealSession();
  return apiRequest<void>(`/schools/${schoolId}`, { method: "DELETE" });
}

export function createSchoolAdmin({ schoolId, ...values }: SchoolAdminFormState) {
  requireRealSession();
  return apiRequest(`/schools/${schoolId}/admins`, {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export async function getDemoRequests() {
  if (isSuperAdminPreview()) return previewRequests;
  const data = await apiRequest<unknown>("/auth/demo-requests");
  return extractCollection<DemoRequestRecord>(data, ["demoRequests", "requests", "items", "results"]);
}
