export type AcademicPeriodIssue = { field: "session" | "resumptionDate" | "closingDate"; message: string };

export function sessionDateBounds(name: string) {
  const match = /^(\d{4})\/(\d{4})$/.exec(name.trim());
  if (!match || Number(match[2]) !== Number(match[1]) + 1) return null;
  return { start: `${match[1]}-01-01`, end: `${match[2]}-12-31` };
}

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function academicPeriodIssues(sessionName: string, startDate?: string, endDate?: string): AcademicPeriodIssue[] {
  const bounds = sessionDateBounds(sessionName);
  if (!bounds) return [{ field: "session", message: "Use consecutive years in the format 2026/2027." }];
  const issues: AcademicPeriodIssue[] = [];
  if (startDate && !isValidDateKey(startDate)) {
    issues.push({ field: "resumptionDate", message: "Enter a valid term start date." });
  } else if (startDate && (startDate < bounds.start || startDate > bounds.end)) {
    issues.push({ field: "resumptionDate", message: `Term start date must fall within ${sessionName}.` });
  }
  if (endDate && !isValidDateKey(endDate)) {
    issues.push({ field: "closingDate", message: "Enter a valid term end date." });
  } else if (endDate && (endDate < bounds.start || endDate > bounds.end)) {
    issues.push({ field: "closingDate", message: `Term end date must fall within ${sessionName}.` });
  }
  if (startDate && endDate && isValidDateKey(startDate) && isValidDateKey(endDate) && endDate <= startDate) {
    issues.push({ field: "closingDate", message: "Term end date must be after the start date." });
  }
  return issues;
}
