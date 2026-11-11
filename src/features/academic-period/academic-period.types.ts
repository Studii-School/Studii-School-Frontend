export type AcademicTermName = "FIRST" | "SECOND" | "THIRD";

export type AcademicTermRecord = {
  id: string;
  name: AcademicTermName;
  status: string;
  sessionId: string;
  startDate: string;
  endDate: string;
};

export type AcademicSessionRecord = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  terms: AcademicTermRecord[];
};

export type HistoricalSessionInput = {
  name: string;
  startDate: string;
  endDate: string;
  terms: Array<{
    name: AcademicTermName;
    startDate: string;
    endDate: string;
  }>;
};

export type UpsertAcademicTermInput = {
  sessionName: string;
  sessionStartDate: string;
  sessionEndDate: string;
  termName: AcademicTermName;
  termStartDate: string;
  termEndDate: string;
  makeCurrent?: boolean;
};

export const academicTermLabel = (name?: string) => {
  if (name === "FIRST") return "First Term";
  if (name === "SECOND") return "Second Term";
  if (name === "THIRD") return "Third Term";
  return name?.replaceAll("_", " ") ?? "No term";
};

export const academicTermNameFromLabel = (label?: string): AcademicTermName => {
  const normalized = label?.trim().toUpperCase().replaceAll("_", " ");
  if (normalized === "SECOND" || normalized === "SECOND TERM") return "SECOND";
  if (normalized === "THIRD" || normalized === "THIRD TERM") return "THIRD";
  return "FIRST";
};
