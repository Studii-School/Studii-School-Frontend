import type { SchoolSettings } from "./school-settings.types";

export const defaultSchoolSettings: SchoolSettings = {
  id: "school", name: "School", shortName: "School", motto: "",
  slogan: "", description: "",
  schoolType: "Day School", schoolLevel: "Secondary", schoolLevels: ["SECONDARY"], ownershipType: "Private",
  email: "", primaryPhone: "",
  address: "", city: "", state: "", country: "",
  branding: { primaryColor: "#075985", secondaryColor: "#0F766E", accentColor: "#F59E0B" },
  currentAcademicSession: "", currentTerm: "First Term",
  updatedAt: "",
};
