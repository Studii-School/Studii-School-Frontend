import type { SchoolLevel } from "@/features/academics/academics.types";

type ClassOption = { id: string; status: string; level: SchoolLevel };
type GuardianOption = { id: string };
type RequiredStudentFields = {
  firstName: string; lastName: string; dateOfBirth?: string;
  schoolLevel: SchoolLevel | ""; classId: string;
  guardianMode: "existing" | "new"; selectedGuardianIds: string[];
  guardianName: string; guardianPhone: string; guardianEmail?: string;
};

export function availableSchoolLevels(classes: ClassOption[], configured: SchoolLevel[]) {
  return [...new Set<SchoolLevel>([...configured, "PRIMARY", "SECONDARY"])].filter((level) => classes.some((item) => item.status === "ACTIVE" && item.level === level));
}

export function preferredSchoolLevel(levels: SchoolLevel[], configured: SchoolLevel[]): SchoolLevel | "" {
  if (levels.length === 1) return levels[0];
  if (levels.length > 1) return configured.find((level) => levels.includes(level)) ?? "";
  return "";
}

export function studentRequiredIssues(form: RequiredStudentFields, classes: ClassOption[], guardians: GuardianOption[]): string[][] {
  const activeClass = classes.some((item) => item.id === form.classId && item.status === "ACTIVE" && item.level === form.schoolLevel);
  return [
    [!form.firstName.trim() && "First name is required.", !form.lastName.trim() && "Last name is required.", form.dateOfBirth && Number.isNaN(Date.parse(form.dateOfBirth)) && "Enter a valid date of birth."].filter(Boolean) as string[],
    [!form.schoolLevel && "Choose a school type with active classes.", !activeClass && "Select an active class for that school type."].filter(Boolean) as string[],
    form.guardianMode === "existing"
      ? [!form.selectedGuardianIds.length && "Select an existing parent.", form.selectedGuardianIds.length > 2 && "Select no more than two parents.", form.selectedGuardianIds.some((id) => !guardians.some((item) => item.id === id)) && "A selected parent is no longer available."].filter(Boolean) as string[]
      : [!form.guardianName.trim() && "Parent name is required.", !form.guardianPhone.trim() && "Parent phone is required.", !form.guardianEmail?.trim() && "Parent login email is required.", form.selectedGuardianIds.length >= 2 && "A student can have no more than two parents."].filter(Boolean) as string[],
  ];
}
