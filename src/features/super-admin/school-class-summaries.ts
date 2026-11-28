export type SchoolClassSummary = {
  id: string;
  name: string;
  level?: string;
  academicYear?: string;
  status?: string;
  capacity?: number;
  studentCount: number | null;
};

type ClassSummaryResponse = {
  id?: string;
  schoolId?: string;
  name?: string;
  displayName?: string;
  section?: string | null;
  arm?: string | null;
  level?: string;
  academicYear?: string;
  status?: string;
  capacity?: number | null;
  studentCount?: number | null;
  _count?: { students?: number };
  studentIds?: string[];
  students?: unknown[];
};

function classRows(response: unknown): ClassSummaryResponse[] {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== "object") return [];
  const record = response as Record<string, unknown>;
  for (const key of ["classes", "items", "results", "data"]) {
    if (!(key in record)) continue;
    const rows = classRows(record[key]);
    if (rows.length || Array.isArray(record[key])) return rows;
  }
  return [];
}

export function schoolClassSummaries(response: unknown, schoolId: string): SchoolClassSummary[] {
  return classRows(response)
    .filter((item) => item.schoolId === schoolId && Boolean(item.id))
    .map((item) => {
      const name = item.displayName?.trim() || item.name?.trim() || "Unnamed class";
      const section = item.section?.trim() || item.arm?.trim();
      const displayName = section && !name.toLowerCase().endsWith(section.toLowerCase()) ? `${name} ${section}` : name;
      const count = item.studentCount ?? item._count?.students ?? item.studentIds?.length ?? item.students?.length;
      return {
        id: item.id!, name: displayName, level: item.level,
        academicYear: item.academicYear, status: item.status,
        capacity: typeof item.capacity === "number" ? item.capacity : undefined,
        studentCount: typeof count === "number" && Number.isFinite(count) ? count : null,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
}
