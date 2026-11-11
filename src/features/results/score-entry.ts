import type { AssessmentComponent, ResultStudentRow } from "./results.types";

export type ScoreEdits = Record<string, Record<string, string>>;

export function buildScoreEntries(
  students: ResultStudentRow[],
  subjectId: string,
  edits: ScoreEdits,
  components: AssessmentComponent[],
  mode: "draft" | "submit",
) {
  const active = components.filter((component) => component.isActive !== false);
  return students.flatMap((student) => {
    const changes = edits[student.id];
    const existing = student.results[0]?.subjectScores.find((score) => score.subjectId === subjectId);
    const hasChanges = Boolean(changes && Object.keys(changes).length);
    if (!hasChanges && (mode === "draft" || !existing || existing.status !== "DRAFT" ||
      active.some((component) => !Object.hasOwn(existing.components, component.name)))) return [];
    if (existing?.locked || existing?.status === "PUBLISHED" || student.results[0]?.locked) {
      throw new Error(`The result for ${student.firstName} ${student.lastName} is locked. Reload the page.`);
    }

    const values = { ...(existing?.components ?? {}) };
    for (const component of active) {
      if (!changes || !Object.hasOwn(changes, component.name)) continue;
      const raw = changes[component.name].trim();
      if (!raw) {
        delete values[component.name];
        continue;
      }
      const score = Number(raw);
      if (!Number.isFinite(score) || score < 0 || score > component.weight) {
        throw new Error(`${student.firstName} ${student.lastName}: ${component.name} must be between 0 and ${component.weight}.`);
      }
      values[component.name] = score;
    }

    if (mode === "submit" && active.some((component) => !Object.hasOwn(values, component.name))) {
      throw new Error(`${student.firstName} ${student.lastName}: enter every assessment score before submitting for review.`);
    }
    if (!Object.keys(values).length && !existing) return [];
    return [{ studentId: student.id, components: values }];
  });
}
