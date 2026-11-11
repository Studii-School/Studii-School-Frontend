import { academicsRepository } from "@/features/academics/academics.repository";
import type { AcademicPeriodScope } from "@/features/academic-period/academic-period-context";
import { isUuid } from "@/features/academic-period/academic-period.repository";
import { filterAssignmentsByPeriod } from "./assignments-period-utils";
import { assignmentRemovalPolicy } from "@/features/action-feedback/record-action.policy";
import { apiRequest, readStoredToken } from "@/lib/api";
import { getAssignmentsState, saveAssignmentsState } from "./assignments.storage";
import type { Assignment, AssignmentInput, AssignmentSubmission } from "./assignments.types";

const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function ensureSubmissionRows(
  state: { submissions: AssignmentSubmission[] },
  assignment: Assignment,
  studentIds: string[],
  now: string,
) {
  for (const studentId of studentIds) {
    if (
      !state.submissions.some(
        (entry) =>
          entry.assignmentId === assignment.id && entry.studentId === studentId,
      )
    ) {
      state.submissions.push({
        id: uid("submission"),
        assignmentId: assignment.id,
        studentId,
        status: "NOT_SUBMITTED",
        text: "",
        updatedAt: now,
      });
    }
  }
}

export class LocalAssignmentsRepository {
  async getState(context?: AcademicPeriodScope) {
    const state = await getAssignmentsState();
    if (!context?.isReady) return state;
    const assignments = filterAssignmentsByPeriod(state.assignments, context);
    const ids = new Set(assignments.map((item) => item.id));
    return { assignments, submissions: state.submissions.filter((item) => ids.has(item.assignmentId)) };
  }

  async saveTeacherAssignment(
    teacherUserId: string,
    input: AssignmentInput,
    assignmentId?: string,
  ) {
    if (
      !input.title.trim() ||
      !input.instructions.trim() ||
      !input.classId ||
      !input.subjectId ||
      !input.dueAt
    ) {
      throw new Error("Class, subject, title, instructions and due date are required.");
    }
    if (!(await academicsRepository.canTeacherAccessClass(teacherUserId, input.classId))) {
      throw new Error("You cannot create assignments for an unassigned class.");
    }

    const state = await this.getState();
    const now = new Date().toISOString();
    let item = assignmentId
      ? state.assignments.find((entry) => entry.id === assignmentId)
      : undefined;

    if (item) {
      if (item.teacherUserId !== teacherUserId) {
        throw new Error("You cannot edit another teacher's assignment.");
      }
      Object.assign(item, input, { updatedAt: now });
    } else {
      item = {
        ...input,
        id: uid("assignment"),
        schoolId: "school-001",
        teacherUserId,
        status: "DRAFT",
        createdAt: now,
        updatedAt: now,
      };
      state.assignments.unshift(item);
    }

    await saveAssignmentsState(state);
    return item;
  }

  async publish(teacherUserId: string, assignmentId: string) {
    const state = await this.getState();
    const item = state.assignments.find(
      (entry) => entry.id === assignmentId && entry.teacherUserId === teacherUserId,
    );
    if (!item) throw new Error("Assignment not found.");
    if (!(await academicsRepository.canTeacherAccessClass(teacherUserId, item.classId))) {
      throw new Error("Class access is no longer available.");
    }

    const academics = await academicsRepository.getState();
    const now = new Date().toISOString();
    item.status = "PUBLISHED";
    item.publishedAt = item.publishedAt ?? now;
    item.updatedAt = now;
    ensureSubmissionRows(
      state,
      item,
      academics.students
        .filter((entry) => academics.studentEnrollments.some((enrollment) => enrollment.studentId === entry.id && enrollment.academicSessionId === (item.academicSessionId ?? item.sessionId) && enrollment.classId === item.classId && enrollment.status === "ACTIVE"))
        .map((student) => student.id),
      now,
    );
    await saveAssignmentsState(state);
    return item;
  }

  async close(teacherUserId: string, id: string) {
    return this.setStatus(teacherUserId, id, "CLOSED");
  }

  async duplicate(teacherUserId: string, id: string) {
    const state = await this.getState();
    const source = state.assignments.find(
      (entry) => entry.id === id && entry.teacherUserId === teacherUserId,
    );
    if (!source) throw new Error("Assignment not found.");

    const now = new Date().toISOString();
    const copy: Assignment = {
      ...source,
      id: uid("assignment"),
      title: `${source.title} (copy)`,
      status: "DRAFT",
      publishedAt: undefined,
      createdAt: now,
      updatedAt: now,
    };
    state.assignments.unshift(copy);
    await saveAssignmentsState(state);
    return copy;
  }

  async remove(teacherUserId: string, id: string) {
    const state = await this.getState();
    const item = state.assignments.find(
      (entry) => entry.id === id && entry.teacherUserId === teacherUserId,
    );
    if (!item) throw new Error("Assignment not found.");

    const related = state.submissions.filter((entry) => entry.assignmentId === id);
    const policy = assignmentRemovalPolicy(
      item.status,
      related.filter((entry) => entry.status !== "NOT_SUBMITTED").length,
    );
    if (!policy.allowed) throw new Error(policy.reason);

    state.assignments = state.assignments.filter((entry) => entry.id !== id);
    state.submissions = state.submissions.filter((entry) => entry.assignmentId !== id);
    await saveAssignmentsState(state);
  }

  async submit(
    studentId: string,
    assignmentId: string,
    text: string,
    attachment?: AssignmentSubmission["attachment"],
    studentClassId?: string,
  ) {
    const state = await this.getState();
    const assignment = state.assignments.find(
      (entry) => entry.id === assignmentId && entry.status === "PUBLISHED",
    );
    const academics = await academicsRepository.getState();
    const resolvedClassId = academics.studentEnrollments.find((entry) => entry.studentId === studentId && entry.academicSessionId === (assignment?.academicSessionId ?? assignment?.sessionId) && entry.status === "ACTIVE")?.classId ?? studentClassId;
    let submission = state.submissions.find(
      (entry) => entry.assignmentId === assignmentId && entry.studentId === studentId,
    );

    if (!assignment || resolvedClassId !== assignment.classId) {
      throw new Error("This assignment is unavailable.");
    }
    if (!submission) {
      const now = new Date().toISOString();
      submission = {
        id: uid("submission"),
        assignmentId: assignment.id,
        studentId,
        status: "NOT_SUBMITTED",
        text: "",
        updatedAt: now,
      };
      state.submissions.push(submission);
    }
    if (submission.status !== "NOT_SUBMITTED") {
      throw new Error("This assignment has already been submitted.");
    }
    if (!text.trim() && !attachment) {
      throw new Error("Add a response or attachment before submitting.");
    }

    const now = new Date().toISOString();
    Object.assign(submission, {
      text: text.trim(),
      attachment,
      submittedAt: now,
      status: new Date(now) > new Date(assignment.dueAt) ? "LATE" : "SUBMITTED",
      updatedAt: now,
    });
    await saveAssignmentsState(state);
    return submission;
  }

  async gradeSubmission(
    teacherUserId: string,
    assignmentId: string,
    submissionId: string,
    input: { score: number; maxScore?: number; feedback?: string },
  ) {
    const state = await this.getState();
    const assignment = state.assignments.find((entry) => entry.id === assignmentId && entry.teacherUserId === teacherUserId);
    if (!assignment) throw new Error("Assignment not found.");
    const submission = state.submissions.find((entry) => entry.id === submissionId && entry.assignmentId === assignmentId);
    if (!submission) throw new Error("Submission not found.");
    const maxScore = input.maxScore ?? assignment.maxScore ?? 10;
    if (input.score < 0 || input.score > maxScore) throw new Error("Score must be within the maximum score.");
    Object.assign(submission, {
      score: input.score,
      feedback: input.feedback?.trim() || undefined,
      status: "GRADED" as const,
      updatedAt: new Date().toISOString(),
    });
    assignment.maxScore = maxScore;
    await saveAssignmentsState(state);
    return submission;
  }

  private async setStatus(
    teacherUserId: string,
    id: string,
    status: Assignment["status"],
  ) {
    const state = await this.getState();
    const item = state.assignments.find(
      (entry) => entry.id === id && entry.teacherUserId === teacherUserId,
    );
    if (!item) throw new Error("Assignment not found.");
    item.status = status;
    item.updatedAt = new Date().toISOString();
    await saveAssignmentsState(state);
    return item;
  }
}

type BackendAssignmentsResponse =
  | { assignments?: Assignment[]; submissions?: AssignmentSubmission[] }
  | Assignment[];

function hasBackendSession() {
  return Boolean(readStoredToken());
}

function normalizeAssignment(item: Assignment): Assignment {
  return {
    ...item,
    maxScore: item.maxScore === undefined || item.maxScore === null ? undefined : Number(item.maxScore),
    attachment: item.attachment ?? undefined,
    publishedAt: item.publishedAt ?? undefined,
  };
}

function normalizeSubmission(item: AssignmentSubmission): AssignmentSubmission {
  return {
    ...item,
    attachment: item.attachment ?? undefined,
    submittedAt: item.submittedAt ?? undefined,
    feedback: item.feedback ?? undefined,
    score: item.score === undefined || item.score === null ? undefined : Number(item.score),
  };
}

function unwrapState(data: BackendAssignmentsResponse) {
  if (Array.isArray(data)) return { assignments: data.map(normalizeAssignment), submissions: [] };
  return {
    assignments: (data.assignments ?? []).map(normalizeAssignment),
    submissions: (data.submissions ?? []).map(normalizeSubmission),
  };
}

class BackendAssignmentsRepository extends LocalAssignmentsRepository {
  async getState(context?: AcademicPeriodScope) {
    if (!hasBackendSession() || (context?.isReady && !context.hasBackendIds)) return super.getState(context);
    const query = context?.isReady ? `?sessionId=${encodeURIComponent(context.academicSessionId)}&termId=${encodeURIComponent(context.termId)}` : "";
    return unwrapState(await apiRequest<BackendAssignmentsResponse>(`/assignments${query}`));
  }

  async saveTeacherAssignment(
    teacherUserId: string,
    input: AssignmentInput,
    assignmentId?: string,
  ) {
    if (!hasBackendSession() || !isUuid(input.termId) || !isUuid(input.sessionId ?? input.academicSessionId)) return super.saveTeacherAssignment(teacherUserId, input, assignmentId);
    const body = { ...input };
    delete body.academicSessionId;
    const response = await apiRequest<{ assignment: Assignment }>(assignmentId ? `/assignments/${assignmentId}` : "/assignments", {
      method: assignmentId ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    return normalizeAssignment(response.assignment);
  }

  async publish(teacherUserId: string, assignmentId: string) {
    if (!hasBackendSession()) return super.publish(teacherUserId, assignmentId);
    const response = await apiRequest<{ assignment: Assignment }>(`/assignments/${assignmentId}/publish`, { method: "POST" });
    return normalizeAssignment(response.assignment);
  }

  async close(teacherUserId: string, id: string) {
    if (!hasBackendSession()) return super.close(teacherUserId, id);
    const response = await apiRequest<{ assignment: Assignment }>(`/assignments/${id}/close`, { method: "POST" });
    return normalizeAssignment(response.assignment);
  }

  async duplicate(teacherUserId: string, id: string) {
    if (!hasBackendSession()) return super.duplicate(teacherUserId, id);
    const response = await apiRequest<{ assignment: Assignment }>(`/assignments/${id}/duplicate`, { method: "POST" });
    return normalizeAssignment(response.assignment);
  }

  async remove(teacherUserId: string, id: string) {
    if (!hasBackendSession()) return super.remove(teacherUserId, id);
    await apiRequest(`/assignments/${id}`, { method: "DELETE" });
  }

  async submit(
    studentId: string,
    assignmentId: string,
    text: string,
    attachment?: AssignmentSubmission["attachment"],
    studentClassId?: string,
  ) {
    if (!hasBackendSession()) return super.submit(studentId, assignmentId, text, attachment, studentClassId);
    const response = await apiRequest<{ submission: AssignmentSubmission }>(`/assignments/${assignmentId}/submissions`, {
      method: "POST",
      body: JSON.stringify({ text, attachment }),
    });
    return normalizeSubmission(response.submission);
  }

  async gradeSubmission(
    teacherUserId: string,
    assignmentId: string,
    submissionId: string,
    input: { score: number; maxScore?: number; feedback?: string },
  ) {
    if (!hasBackendSession()) return super.gradeSubmission(teacherUserId, assignmentId, submissionId, input);
    const response = await apiRequest<{ submission: AssignmentSubmission }>(`/assignments/${assignmentId}/submissions/${submissionId}/grade`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return normalizeSubmission(response.submission);
  }
}

export const assignmentsRepository = new BackendAssignmentsRepository();
