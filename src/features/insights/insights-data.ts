import { resultsRepository } from "@/features/results/results.repository";
import type { ResultStatus } from "@/features/results/results.types";

export type InsightStudent = {
  id: string;
  classId: string;
  className: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  average: number;
  resultCount: number;
};

export type InsightClass = {
  id: string;
  name: string;
  average: number;
  studentCount: number;
};

export type InsightsData = {
  passMark: number;
  classes: InsightClass[];
  students: InsightStudent[];
};

const visibleStatuses = new Set<ResultStatus>(["PUBLISHED"]);

export async function loadInsightsData(
  classes: Array<{ id: string; displayName: string }>,
  params: { sessionId?: string; termId?: string } = {},
): Promise<InsightsData> {
  const settings = await resultsRepository.getSettings().catch(() => ({ passMark: 50 }));
  const responses = await Promise.allSettled(
    classes.map((schoolClass) => resultsRepository.getClassResults(schoolClass.id, params)),
  );
  const students: InsightStudent[] = [];
  const classRows: InsightClass[] = [];

  responses.forEach((response, index) => {
    if (response.status !== "fulfilled") return;
    const schoolClass = classes[index];
    const className = response.value.class?.name || schoolClass.displayName;
    const classStudents: InsightStudent[] = [];
    for (const row of response.value.students) {
      const results = row.results.filter((result) => visibleStatuses.has(result.status) && Number.isFinite(result.average));
      if (!results.length) continue;
      const average = results.reduce((sum, result) => sum + result.average, 0) / results.length;
      classStudents.push({
        id: row.id,
        classId: schoolClass.id,
        className,
        firstName: row.firstName,
        lastName: row.lastName,
        admissionNumber: row.admissionNumber,
        average: Math.round(average * 10) / 10,
        resultCount: results.length,
      });
    }
    students.push(...classStudents);
    if (classStudents.length) {
      classRows.push({
        id: schoolClass.id,
        name: className,
        average: Math.round((classStudents.reduce((sum, student) => sum + student.average, 0) / classStudents.length) * 10) / 10,
        studentCount: classStudents.length,
      });
    }
  });

  return {
    passMark: Number(settings.passMark) || 50,
    classes: classRows.sort((a, b) => b.average - a.average),
    students: students.sort((a, b) => b.average - a.average),
  };
}

export function birthdaysWithin<T extends { dateOfBirth?: string }>(people: T[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return people.flatMap((person) => {
    if (!person.dateOfBirth) return [];
    const birthDate = new Date(`${person.dateOfBirth.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return [];
    let next = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (next < today) next = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
    const daysAway = Math.round((next.getTime() - today.getTime()) / 86400000);
    return daysAway <= days ? [{ person, daysAway, nextBirthday: next }] : [];
  }).sort((a, b) => a.daysAway - b.daysAway);
}
