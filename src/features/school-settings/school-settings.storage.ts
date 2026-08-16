import { apiRequest, readStoredToken, type AuthUser } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
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
}>;

type AssetType = "logo" | "crest" | "favicon";

const validSchoolTypes: SchoolType[] = ["Day School", "Boarding School", "Day and Boarding School"];
const validSchoolLevels: ConfiguredSchoolLevel[] = ["PRIMARY", "SECONDARY"];
const validOwnershipTypes: OwnershipType[] = ["Private", "Public", "Faith-based", "International"];
const validTerms: AcademicTerm[] = ["First Term", "Second Term", "Third Term"];

function optionalString(value: string | null | undefined) {
  return value ?? undefined;
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

function endpointFor(schoolId?: string, user?: AuthUser | null) {
  if (schoolId) return `/schools/${schoolId}/settings`;
  if (isSuperAdmin(user)) return null;
  return "/schools/me/settings";
}

function mapFromBackend(response: SchoolSettingsResponse): SchoolSettings {
  const settings = response.settings;
  return {
    ...defaultSchoolSettings,
    id: settings.schoolId || defaultSchoolSettings.id,
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
    currentTerm: validOption(settings.currentTerm, validTerms, defaultSchoolSettings.currentTerm),
    resumptionDate: optionalString(settings.resumptionDate),
    closingDate: optionalString(settings.closingDate),
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
  };
}

function isPersistableUrl(value?: string) {
  if (!value || value.startsWith("data:")) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function getSchoolSettings(schoolId?: string, user?: AuthUser | null): Promise<SchoolSettings> {
  const endpoint = endpointFor(schoolId, user);
  if (!hasSession() || !endpoint) return defaultSchoolSettings;
  return mapFromBackend(await apiRequest<SchoolSettingsResponse>(endpoint));
}

export async function saveSchoolAsset(schoolId: string, assetType: AssetType, url: string) {
  return apiRequest<SchoolSettingsResponse>(`/schools/${schoolId}/assets`, {
    method: "POST",
    body: JSON.stringify({ assetType, url }),
  });
}

export async function saveSchoolSettings(settings: SchoolSettings, schoolId = settings.id): Promise<SchoolSettings> {
  if (!hasSession()) return { ...settings, updatedAt: new Date().toISOString() };

  const targetSchoolId = getStoredSchoolId() ?? schoolId;
  if (!targetSchoolId) throw new Error("School ID is required to save settings.");

  const updated = mapFromBackend(
    await apiRequest<SchoolSettingsResponse>(`/schools/${targetSchoolId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(mapToBackend(settings)),
    }),
  );

  const assets: Array<[AssetType, string | undefined]> = [
    ["logo", settings.logoUrl],
    ["crest", settings.crestUrl],
    ["favicon", settings.faviconUrl],
  ];

  await Promise.all(
    assets
      .filter(([, url]) => isPersistableUrl(url))
      .map(([assetType, url]) => saveSchoolAsset(targetSchoolId, assetType, url as string)),
  );

  return updated;
}

export async function resetSchoolSettings(schoolId?: string, user?: AuthUser | null): Promise<SchoolSettings> {
  return getSchoolSettings(schoolId, user);
}
