import { apiRequest } from "@/lib/api";
import type {
  ResultClassSummary,
  ResultSettings,
  ResultStatus,
  ResultStudentRow,
  ResultSubject,
  StudentResult,
  TeacherResultAssignment,
} from "./results.types";

type List<T> = T[] | { data?: T[]; items?: T[]; results?: T[]; classes?: T[]; students?: T[]; assignments?: T[]; children?: T[] };

function unwrap<T>(value: List<T>) {
  return Array.isArray(value) ? value : value.data ?? value.items ?? value.results ?? value.classes ?? value.students ?? value.assignments ?? value.children ?? [];
}

const query = (params: { sessionId?: string; termId?: string } = {}) => {
  const search = new URLSearchParams();
  if (params.sessionId) search.set("sessionId", params.sessionId);
  if (params.termId) search.set("termId", params.termId);
  const text = search.toString();
  return text ? `?${text}` : "";
};

function settingsPayload(settings: ResultSettings): ResultSettings {
  return {
    passMark: Number(settings.passMark),
    positionEnabled: Boolean(settings.positionEnabled),
    promotionRule: settings.promotionRule?.trim() || undefined,
    components: settings.components.map((component) => ({
      name: component.name.trim(),
      weight: Number(component.weight),
      isActive: component.isActive !== false,
    })),
    gradeBands: settings.gradeBands.map((band) => ({
      grade: band.grade.trim(),
      minScore: Number(band.minScore),
      maxScore: Number(band.maxScore),
      remark: band.remark.trim(),
    })),
  };
}

export const resultsRepository = {
  getSettings() {
    return apiRequest<ResultSettings>("/results/settings");
  },
  saveSettings(settings: ResultSettings) {
    return apiRequest<ResultSettings>("/results/settings", { method: "PATCH", body: JSON.stringify(settingsPayload(settings)) });
  },
  getSessions() {
    return apiRequest<List<{ id: string; name: string; status: string; terms?: Array<{ id: string; name: string; status: string }> }>>("/academic-sessions").then(unwrap);
  },
  getTerms(sessionId?: string) {
    return apiRequest<List<{ id: string; name: string; status: string; sessionId: string }>>(`/academic-terms${sessionId ? `?sessionId=${sessionId}` : ""}`).then(unwrap);
  },
  getAdminClasses(params: { sessionId?: string; termId?: string }) {
    return apiRequest<{ classes?: ResultClassSummary[] } | ResultClassSummary[]>(`/results/classes${query(params)}`).then((data) => unwrap<ResultClassSummary>(data));
  },
  getClassResults(classId: string, params: { sessionId?: string; termId?: string }) {
    return apiRequest<{ class: { id: string; name: string; section?: string }; students: ResultStudentRow[]; subjects: ResultSubject[] }>(`/results/classes/${classId}${query(params)}`);
  },
  getStudentResults(studentId: string, params: { sessionId?: string; termId?: string }) {
    return apiRequest<{ results?: StudentResult[] } | StudentResult[]>(`/results/students/${studentId}${query(params)}`).then((data) => unwrap<StudentResult>(data));
  },
  getTeacherAssignments() {
    return apiRequest<{ assignments?: TeacherResultAssignment[] } | TeacherResultAssignment[]>("/results/teacher/assignments").then((data) => unwrap<TeacherResultAssignment>(data));
  },
  saveScores(status: "draft" | "submit", input: { sessionId: string; termId: string; classId: string; subjectId: string; scores: Array<{ studentId: string; components: Record<string, number>; teacherComment?: string }> }) {
    return apiRequest(`/results/scores/${status}`, { method: "POST", body: JSON.stringify(input) });
  },
  updateStatus(resultId: string, input: { status?: ResultStatus; locked?: boolean; teacherComment?: string; principalComment?: string }) {
    return apiRequest<{ result: StudentResult }>(`/results/${resultId}/status`, { method: "PATCH", body: JSON.stringify(input) });
  },
  getMine(params: { sessionId?: string; termId?: string }) {
    return apiRequest<{ results?: StudentResult[] } | StudentResult[]>(`/results/me${query(params)}`).then((data) => unwrap<StudentResult>(data));
  },
  getChildren(params: { sessionId?: string; termId?: string }) {
    return apiRequest<{ children?: StudentResult[] } | StudentResult[]>(`/results/children${query(params)}`).then((data) => unwrap<StudentResult>(data));
  },
};
