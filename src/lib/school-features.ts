"use client";

import type { FeatureKey, NavigationItem } from "@/types";
import { apiRequest } from "./api";

export const DEFAULT_SCHOOL_ID = "school-001";
export const SCHOOL_FEATURES_EVENT = "schoolos:school-features-updated";

export type SchoolFeature = {
  key: FeatureKey;
  label: string;
  description: string;
};

export type SchoolFeatureSettings = Record<FeatureKey, boolean>;

export const schoolFeatures: SchoolFeature[] = [
  { key: "students", label: "Students", description: "Student records, parent child lists and student directories." },
  { key: "admissions", label: "Admissions", description: "Applications, admission review and enrollment flows." },
  { key: "staff", label: "Staff & HR", description: "Staff records, teacher profiles and assignments." },
  { key: "academics", label: "Academics", description: "Classes, academic structures and teacher class access." },
  { key: "attendance", label: "Attendance", description: "Attendance capture and attendance visibility." },
  { key: "finance", label: "Payments & Finance", description: "Fees, invoices, payments, receipts and reconciliation." },
  { key: "communications", label: "Communications", description: "Announcements and school messages." },
  { key: "events", label: "Events", description: "School calendar and event pages." },
  { key: "results", label: "Results", description: "Result entry and result viewing." },
  { key: "timetable", label: "Timetable", description: "Timetable pages for teachers and learners." },
  { key: "assignments", label: "Assignments", description: "Classwork, homework and assignment workflows." },
];

export const defaultFeatureSettings = schoolFeatures.reduce((result, feature) => {
  result[feature.key] = true;
  return result;
}, {} as SchoolFeatureSettings);

const storageKey = (schoolId: string) => `schoolos:features:${schoolId || DEFAULT_SCHOOL_ID}`;

type FeatureSettingsResponse = {
  features?: Partial<Record<FeatureKey, boolean>>;
};

export function featureLabel(feature: FeatureKey) {
  return schoolFeatures.find((item) => item.key === feature)?.label ?? "Feature";
}

export function normaliseFeatureSettings(features?: Partial<Record<FeatureKey, boolean>> | null): SchoolFeatureSettings {
  return { ...defaultFeatureSettings, ...(features ?? {}) };
}

export function loadSchoolFeatureSettings(schoolId?: string): SchoolFeatureSettings {
  if (typeof window === "undefined") return defaultFeatureSettings;
  try {
    const raw = localStorage.getItem(storageKey(schoolId || DEFAULT_SCHOOL_ID));
    const parsed = raw ? (JSON.parse(raw) as Partial<Record<FeatureKey, boolean>>) : {};
    return normaliseFeatureSettings(parsed);
  } catch {
    return defaultFeatureSettings;
  }
}

export function cacheSchoolFeatureSettings(schoolId: string, settings: Partial<Record<FeatureKey, boolean>>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(schoolId), JSON.stringify(normaliseFeatureSettings(settings)));
  window.dispatchEvent(new CustomEvent(SCHOOL_FEATURES_EVENT, { detail: { schoolId } }));
}

export const saveSchoolFeatureSettings = cacheSchoolFeatureSettings;

export async function getSchoolFeatureSettings(schoolId: string) {
  const data = await apiRequest<FeatureSettingsResponse>(`/schools/${schoolId}/features`);
  const settings = normaliseFeatureSettings(data.features);
  cacheSchoolFeatureSettings(schoolId, settings);
  return settings;
}

export async function updateSchoolFeatureSettings(schoolId: string, features: Partial<Record<FeatureKey, boolean>>) {
  const data = await apiRequest<FeatureSettingsResponse>(`/schools/${schoolId}/features`, {
    method: "PATCH",
    body: JSON.stringify({ features }),
  });
  const settings = normaliseFeatureSettings(data.features);
  cacheSchoolFeatureSettings(schoolId, settings);
  return settings;
}

export function resolveUserSchoolId(user?: { schoolId?: string | null; role?: string } | null) {
  if (user?.role === "Super Administrator") return "platform";
  return user?.schoolId || DEFAULT_SCHOOL_ID;
}

export function isFeatureEnabled(settings: SchoolFeatureSettings, feature?: FeatureKey) {
  return !feature || settings[feature] !== false;
}

export function filterNavigationByFeatures(navigation: NavigationItem[], settings: SchoolFeatureSettings) {
  return navigation.filter((item) => isFeatureEnabled(settings, item.feature));
}

export function disabledFeatureForPath(pathname: string, navigation: NavigationItem[], settings: SchoolFeatureSettings) {
  const matched = [...navigation]
    .filter((item) => item.feature && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return matched && !isFeatureEnabled(settings, matched.feature) ? matched.feature : null;
}
