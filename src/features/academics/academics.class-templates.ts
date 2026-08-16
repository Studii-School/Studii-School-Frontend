import type { ClassTemplate } from "./academics.types";

export const classTemplates: ClassTemplate[] = [
  { key: "CRECHE", level: "PRIMARY", category: "EARLY_YEARS", defaultName: "Creche", defaultSortOrder: 0 },
  { key: "PRE_NURSERY", level: "PRIMARY", category: "EARLY_YEARS", defaultName: "Pre-Nursery", defaultSortOrder: 10 },
  { key: "NURSERY_1", level: "PRIMARY", category: "EARLY_YEARS", defaultName: "Nursery 1", defaultSortOrder: 20 },
  { key: "NURSERY_2", level: "PRIMARY", category: "EARLY_YEARS", defaultName: "Nursery 2", defaultSortOrder: 30 },
  { key: "KG_1", level: "PRIMARY", category: "EARLY_YEARS", defaultName: "KG 1", defaultSortOrder: 40 },
  { key: "KG_2", level: "PRIMARY", category: "EARLY_YEARS", defaultName: "KG 2", defaultSortOrder: 50 },
  { key: "RECEPTION", level: "PRIMARY", category: "EARLY_YEARS", defaultName: "Reception", defaultSortOrder: 60 },
  ...Array.from({ length: 6 }, (_, index): ClassTemplate => ({
    key: `PRIMARY_${index + 1}`,
    level: "PRIMARY",
    category: "PRIMARY",
    defaultName: `Primary ${index + 1}`,
    defaultSortOrder: 100 + index * 10,
  })),
  ...Array.from({ length: 3 }, (_, index): ClassTemplate => ({
    key: `JSS_${index + 1}`,
    level: "SECONDARY",
    category: "JUNIOR_SECONDARY",
    defaultName: `JSS${index + 1}`,
    defaultSortOrder: 200 + index * 10,
  })),
  ...Array.from({ length: 3 }, (_, index): ClassTemplate => ({
    key: `SS_${index + 1}`,
    level: "SECONDARY",
    category: "SENIOR_SECONDARY",
    defaultName: `SS${index + 1}`,
    defaultSortOrder: 300 + index * 10,
  })),
];

export const primaryClassTemplates = classTemplates.filter(
  (template) => template.level === "PRIMARY",
);
export const secondaryClassTemplates = classTemplates.filter(
  (template) => template.level === "SECONDARY",
);

export const classCategoryLabels = {
  EARLY_YEARS: "Early Years",
  PRIMARY: "Primary",
  JUNIOR_SECONDARY: "Junior Secondary",
  SENIOR_SECONDARY: "Senior Secondary",
  CUSTOM: "Custom",
} as const;

export function getClassTemplate(key?: string) {
  return classTemplates.find((template) => template.key === key);
}

export function inferTemplate(baseName: string) {
  const normalized = baseName.trim().toLowerCase();
  return classTemplates.find(
    (template) => template.defaultName.toLowerCase() === normalized,
  );
}
