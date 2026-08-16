import { getClassTemplate } from "./academics.class-templates";
import type {
  AcademicsState,
  ClassOptionFilters,
  SchoolClass,
} from "./academics.types";

export function buildClassDisplayName(baseName?: string | null, suffix?: string | null) {
  return [baseName?.trim(), suffix?.trim()].filter(Boolean).join(" ");
}

export function sortClasses(classes: SchoolClass[]) {
  return [...classes].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName),
  );
}

export function getClassCategory(schoolClass: SchoolClass) {
  if (schoolClass.source === "CUSTOM") return "CUSTOM" as const;
  return getClassTemplate(schoolClass.templateKey)?.category ?? "CUSTOM";
}

export function getClassOptions(
  state: AcademicsState,
  filters: ClassOptionFilters = {},
) {
  return sortClasses(
    state.classes.filter(
      (item) =>
        (!filters.level || item.level === filters.level) &&
        (item.status === "ACTIVE" ||
          (filters.includeInactive && item.status === "INACTIVE") ||
          (filters.includeArchived && item.status === "ARCHIVED")),
    ),
  ).map((item) => ({
    value: item.id,
    label: item.displayName,
    description: `${item.level === "PRIMARY" ? "Primary" : "Secondary"} · ${item.status.toLowerCase()}`,
  }));
}
