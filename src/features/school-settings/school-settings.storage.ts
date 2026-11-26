import { apiRequest, readStoredToken, type AuthUser } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
import { academicPeriodRepository } from "@/features/academic-period/academic-period.repository";
import { academicTermLabel } from "@/features/academic-period/academic-period.types";
import { defaultSchoolSettings } from "./school-settings.defaults";
import type { AcademicTerm, ConfiguredSchoolLevel, OwnershipType, SchoolSettings, SchoolType } from "./school-settings.types";

type BackendSchoolSettings = {
  schoolId: string;
  name: string;
  shortName?: string | null;
  motto?: string | null;
  slogan?: string | null;
  description?: string | null;
  establishedYear?: number | null;
  schoolType?: string | null;
  schoolLevels?: ConfiguredSchoolLevel[] | null;
  ownershipType?: string | null;
  officialEmail?: string | null;
  primaryPhone?: string | null;
  secondaryPhone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  logoUrl?: string | null;
  crestUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  currentAcademicSession?: string | null;
  currentTerm?: string | null;
  resumptionDate?: string | null;
  closingDate?: string | null;
  historicalEditingEnabled?: boolean;
  updatedAt: string;
};

type SchoolSettingsResponse = {
  settings: BackendSchoolSettings;
};

type UpdateSchoolSettingsPayload = Partial<{
  name: string;
  shortName: string;
  motto: string;
  slogan: string;
  description: string;
  establishedYear: number;
  schoolType: string;
  schoolLevels: ConfiguredSchoolLevel[];
  ownershipType: string;
  officialEmail: string;
  primaryPhone: string;
  secondaryPhone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  logoUrl: string;
  crestUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  currentAcademicSession: string;
  currentTerm: string;
  resumptionDate: string;
  closingDate: string;
  historicalEditingEnabled: boolean;
}>;

type AcademicSettingsSnapshot = Pick<SchoolSettings, "currentAcademicSession" | "currentTerm" | "resumptionDate" | "closingDate" | "historicalEditingEnabled">;

const validSchoolTypes: SchoolType[] = ["Day School", "Boarding School", "Day and Boarding School"];
const validSchoolLevels: ConfiguredSchoolLevel[] = ["PRIMARY", "SECONDARY"];
const validOwnershipTypes: OwnershipType[] = ["Private", "Public", "Faith-based", "International"];
const validTerms: AcademicTerm[] = ["First Term", "Second Term", "Third Term"];

function optionalString(value: string | null | undefined) {
  return value ?? undefined;
}

function optionalDate(value: string | null | undefined) {
  return value?.slice(0, 10) || undefined;
}

function requiredString(value: string | null | undefined, fallback: string) {
  return value ?? fallback;
}

function validOption<T extends string>(value: string | null | undefined, options: readonly T[], fallback: T) {
  return options.includes(value as T) ? (value as T) : fallback;
}

function normaliseSchoolLevels(value?: ConfiguredSchoolLevel[] | null) {
  const levels = [...new Set((value ?? []).filter((level) => validSchoolLevels.includes(level)))];
  if (levels.length) return levels;
  return defaultSchoolSettings.schoolLevels;
}

function getStoredSchoolId(user?: AuthUser | null) {
  return user?.schoolId ?? user?.school?.id ?? readStoredUser()?.schoolId ?? readStoredUser()?.school?.id;
}

function isSuperAdmin(user?: AuthUser | null) {
  return (user?.role ?? "").toLowerCase().replace(/[\s_-]/g, "").includes("superadmin");
}

function hasSession() {
  return Boolean(readStoredToken());
}

function academicSettingsKey(schoolId?: string) {
  return `studii.school-settings.academic.${schoolId ?? getStoredSchoolId() ?? "school"}`;
}

function readAcademicSettings(schoolId?: string) {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(academicSettingsKey(schoolId)) ?? "{}") as Partial<AcademicSettingsSnapshot>;
  } catch {
    return {};
  }
}

function writeAcademicSettings(settings: SchoolSettings, schoolId?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    academicSettingsKey(schoolId ?? settings.id),
    JSON.stringify({
      currentAcademicSession: settings.currentAcademicSession,
      currentTerm: settings.currentTerm,
      resumptionDate: settings.resumptionDate,
      closingDate: settings.closingDate,
      historicalEditingEnabled: settings.historicalEditingEnabled,
    } satisfies AcademicSettingsSnapshot),
  );
}

function mergeAcademicSettings(settings: SchoolSettings, schoolId?: string) {
  const saved = readAcademicSettings(schoolId ?? settings.id);
  return {
    ...settings,
    currentAcademicSession: saved.currentAcademicSession || settings.currentAcademicSession,
    currentTerm: validOption(saved.currentTerm, validTerms, settings.currentTerm),
    resumptionDate: saved.resumptionDate ?? settings.resumptionDate,
    closingDate: saved.closingDate ?? settings.closingDate,
    historicalEditingEnabled: settings.historicalEditingEnabled ?? saved.historicalEditingEnabled ?? false,
  };
}

function endpointFor(schoolId?: string, user?: AuthUser | null) {
  if (schoolId) return `/schools/${schoolId}/settings`;
  if (isSuperAdmin(user)) return null;
  return "/schools/me/settings";
}

function mapFromBackend(response: SchoolSettingsResponse): SchoolSettings {
  const settings = response.settings;
  const schoolId = settings.schoolId || defaultSchoolSettings.id;
  return {
    ...defaultSchoolSettings,
    id: schoolId,
    name: requiredString(settings.name, defaultSchoolSettings.name),
    shortName: requiredString(settings.shortName, defaultSchoolSettings.shortName),
    motto: requiredString(settings.motto, defaultSchoolSettings.motto),
    slogan: requiredString(settings.slogan, defaultSchoolSettings.slogan),
    description: requiredString(settings.description, defaultSchoolSettings.description),
    establishedYear: settings.establishedYear ?? undefined,
    schoolType: validOption(settings.schoolType, validSchoolTypes, defaultSchoolSettings.schoolType),
    schoolLevel: normaliseSchoolLevels(settings.schoolLevels)[0] === "PRIMARY" ? "Primary" : "Secondary",
    schoolLevels: normaliseSchoolLevels(settings.schoolLevels),
    ownershipType: validOption(settings.ownershipType, validOwnershipTypes, defaultSchoolSettings.ownershipType),
    email: requiredString(settings.officialEmail, defaultSchoolSettings.email),
    primaryPhone: requiredString(settings.primaryPhone, defaultSchoolSettings.primaryPhone),
    secondaryPhone: optionalString(settings.secondaryPhone),
    website: optionalString(settings.website),
    address: requiredString(settings.address, defaultSchoolSettings.address),
    city: requiredString(settings.city, defaultSchoolSettings.city),
    state: requiredString(settings.state, defaultSchoolSettings.state),
    country: requiredString(settings.country, defaultSchoolSettings.country),
    logoUrl: optionalString(settings.logoUrl),
    crestUrl: optionalString(settings.crestUrl),
    faviconUrl: optionalString(settings.faviconUrl),
    branding: {
      primaryColor: settings.primaryColor || defaultSchoolSettings.branding.primaryColor,
      secondaryColor: settings.secondaryColor || defaultSchoolSettings.branding.secondaryColor,
      accentColor: settings.accentColor || defaultSchoolSettings.branding.accentColor,
    },
    currentAcademicSession: requiredString(settings.currentAcademicSession, defaultSchoolSettings.currentAcademicSession),
    currentTerm: validOption(academicTermLabel(settings.currentTerm ?? undefined), validTerms, defaultSchoolSettings.currentTerm),
    resumptionDate: optionalDate(settings.resumptionDate),
    closingDate: optionalDate(settings.closingDate),
    historicalEditingEnabled: settings.historicalEditingEnabled ?? false,
    updatedAt: settings.updatedAt || defaultSchoolSettings.updatedAt,
  };
}

function mapToBackend(settings: SchoolSettings): UpdateSchoolSettingsPayload {
  const optional = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };
  return {
    name: settings.name,
    shortName: optional(settings.shortName),
    motto: optional(settings.motto),
    slogan: optional(settings.slogan),
    description: optional(settings.description),
    establishedYear: settings.establishedYear,
    schoolType: settings.schoolType,
    schoolLevels: settings.schoolLevels,
    ownershipType: settings.ownershipType,
    officialEmail: settings.email,
    primaryPhone: settings.primaryPhone,
    secondaryPhone: optional(settings.secondaryPhone),
    website: optional(settings.website),
    address: optional(settings.address),
    city: optional(settings.city),
    state: optional(settings.state),
    country: optional(settings.country),
    logoUrl: optional(settings.logoUrl),
    crestUrl: optional(settings.crestUrl),
    faviconUrl: optional(settings.faviconUrl),
    primaryColor: settings.branding.primaryColor,
    secondaryColor: settings.branding.secondaryColor,
    accentColor: settings.branding.accentColor,
    currentAcademicSession: settings.currentAcademicSession,
    currentTerm: settings.currentTerm,
    resumptionDate: optional(settings.resumptionDate),
    closingDate: optional(settings.closingDate),
    historicalEditingEnabled: settings.historicalEditingEnabled ?? false,
  };
}

export async function getSchoolSettings(schoolId?: string, user?: AuthUser | null): Promise<SchoolSettings> {
  const endpoint = endpointFor(schoolId, user);
  if (!hasSession() || !endpoint) {
    const id = schoolId ?? getStoredSchoolId(user) ?? defaultSchoolSettings.id;
    return { ...defaultSchoolSettings, id };
  }
  const settings = mergeAcademicSettings(
    mapFromBackend(await apiRequest<SchoolSettingsResponse>(endpoint)),
    schoolId ?? getStoredSchoolId(user),
  );
  try {
    const active = await academicPeriodRepository.getActiveTerm();
    if (active) {
      const current = {
        ...settings,
        currentAcademicSession: active.session.name,
        currentTerm: academicTermLabel(active.term.name) as AcademicTerm,
        resumptionDate: active.term.startDate,
        closingDate: active.term.endDate || undefined,
      };
      writeAcademicSettings(current, schoolId ?? getStoredSchoolId(user));
      return current;
    }
  } catch {
    // School settings remain available when the academic-period endpoint is unavailable.
  }
  return settings;
}

export async function saveSchoolSettings(settings: SchoolSettings, schoolId = settings.id): Promise<SchoolSettings> {
  if (!hasSession()) {
    const offline = { ...settings, updatedAt: new Date().toISOString() };
    writeAcademicSettings(offline, schoolId);
    return offline;
  }

  const targetSchoolId = getStoredSchoolId() ?? schoolId;
  if (!targetSchoolId) throw new Error("School ID is required to save settings.");
  const updated = mapFromBackend(
    await apiRequest<SchoolSettingsResponse>(`/schools/${targetSchoolId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(mapToBackend(settings)),
    }),
  );
  const merged = {
    ...updated,
    currentAcademicSession: settings.currentAcademicSession || updated.currentAcademicSession,
    currentTerm: settings.currentTerm || updated.currentTerm,
    resumptionDate: settings.resumptionDate ?? updated.resumptionDate,
    closingDate: settings.closingDate ?? updated.closingDate,
    historicalEditingEnabled: settings.historicalEditingEnabled ?? updated.historicalEditingEnabled ?? false,
  };

  writeAcademicSettings(merged, targetSchoolId);
  return merged;
}

export async function resetSchoolSettings(schoolId?: string, user?: AuthUser | null): Promise<SchoolSettings> {
  return getSchoolSettings(schoolId, user);
}
