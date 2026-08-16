import { buildClassDisplayName } from "./academics.class-utils";
import type {
  CreateClassInput,
  SchoolClass,
  UpdateClassInput,
} from "./academics.types";

export function normalizeClassInput(input: CreateClassInput) {
  const rawSuffix = input.suffix ?? input.arm;
  const suffix = rawSuffix?.trim().replace(/\s+/g, " ") || undefined;
  const rawBaseName =
    input.baseName ??
    (suffix && input.displayName?.trim().endsWith(suffix)
      ? input.displayName.trim().slice(0, -suffix.length)
      : input.displayName) ??
    "";
  const baseName = rawBaseName.trim().replace(/\s+/g, " ");
  const displayName = buildClassDisplayName(baseName, suffix);
  if (!baseName || !displayName) throw new Error("Class name is required.");
  if (input.capacity !== undefined && (!Number.isInteger(input.capacity) || input.capacity <= 0)) {
    throw new Error("Class capacity must be a positive whole number.");
  }
  return {
    ...input,
    source: input.source ?? (input.templateKey ? "STANDARD" : "CUSTOM"),
    baseName,
    suffix,
    displayName,
  };
}

export function assertUniqueClassName(
  classes: SchoolClass[],
  displayName: string,
  excludingId?: string,
) {
  const normalized = displayName.toLocaleLowerCase();
  if (
    classes.some(
      (item) =>
        item.id !== excludingId &&
        item.status !== "ARCHIVED" &&
        item.displayName.toLocaleLowerCase() === normalized,
    )
  ) {
    throw new Error("Duplicate class name already exists.");
  }
}

export function normalizeClassUpdate(
  existing: SchoolClass,
  input: UpdateClassInput,
) {
  const baseName = input.baseName?.trim().replace(/\s+/g, " ") ?? existing.baseName;
  const suffix =
    input.suffix === undefined
      ? existing.suffix
      : input.suffix.trim().replace(/\s+/g, " ") || undefined;
  const displayName = buildClassDisplayName(baseName, suffix);
  if (input.capacity !== undefined && (!Number.isInteger(input.capacity) || input.capacity <= 0)) {
    throw new Error("Class capacity must be a positive whole number.");
  }
  return { ...input, baseName, suffix, displayName };
}
