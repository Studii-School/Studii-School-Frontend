export type SchoolType = "Day School" | "Boarding School" | "Day and Boarding School";
export type SchoolLevel = "Primary" | "Secondary" | "Primary and Secondary" | "Nursery, Primary and Secondary";
export type ConfiguredSchoolLevel = "PRIMARY" | "SECONDARY";
export type OwnershipType = "Private" | "Public" | "Faith-based" | "International";
export type AcademicTerm = "First Term" | "Second Term" | "Third Term";

export interface SchoolBranding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface SchoolSettings {
  id: string;
  name: string;
  shortName: string;
  motto: string;
  slogan: string;
  description: string;
  establishedYear?: number;
  schoolType: SchoolType;
  schoolLevel: SchoolLevel;
  schoolLevels: ConfiguredSchoolLevel[];
  ownershipType: OwnershipType;
  email: string;
  primaryPhone: string;
  secondaryPhone?: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  logoUrl?: string;
  crestUrl?: string;
  faviconUrl?: string;
  branding: SchoolBranding;
  currentAcademicSession: string;
  currentTerm: AcademicTerm;
  historicalEditingEnabled?: boolean;
  resumptionDate?: string;
  closingDate?: string;
  updatedAt: string;
}
