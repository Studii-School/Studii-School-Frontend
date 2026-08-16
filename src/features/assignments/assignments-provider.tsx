"use client";

/* eslint-disable react-hooks/set-state-in-effect -- repository hydration is synchronized after each mutation. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { readStoredUser } from "@/lib/auth";
import { AssignmentsContext } from "./assignments-context";
import { assignmentsRepository } from "./assignments.repository";
import { ASSIGNMENTS_STORAGE_KEY, emptyAssignmentsState } from "./assignments.storage";
import type { AssignmentAsset, AssignmentInput, AssignmentsState } from "./assignments.types";

const fallbackTeacherId = "teacher-user-001";
const fallbackStudentId = "student-yusuf";

function teacherId() {
  return readStoredUser()?.id ?? fallbackTeacherId;
}

function studentId() {
  const user = readStoredUser();
  return user?.studentId ?? user?.id ?? fallbackStudentId;
}

export function AssignmentsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AssignmentsState>(emptyAssignmentsState);
  const [isLoading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setState(await assignmentsRepository.getState());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const sync = (event: StorageEvent) => {
      if (event.key === ASSIGNMENTS_STORAGE_KEY) void refresh();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [refresh]);

  const save = useCallback(async (input: AssignmentInput, id?: string) => {
    const item = await assignmentsRepository.saveTeacherAssignment(teacherId(), input, id);
    await refresh();
    return item.id;
  }, [refresh]);
  const publish = useCallback(async (id: string) => {
    await assignmentsRepository.publish(teacherId(), id);
    await refresh();
  }, [refresh]);
  const close = useCallback(async (id: string) => {
    await assignmentsRepository.close(teacherId(), id);
    await refresh();
  }, [refresh]);
  const duplicate = useCallback(async (id: string) => {
    await assignmentsRepository.duplicate(teacherId(), id);
    await refresh();
  }, [refresh]);
  const remove = useCallback(async (id: string) => {
    await assignmentsRepository.remove(teacherId(), id);
    await refresh();
  }, [refresh]);
  const submit = useCallback(async (id: string, text: string, asset?: AssignmentAsset, resolvedStudentId?: string, studentClassId?: string) => {
    await assignmentsRepository.submit(resolvedStudentId ?? studentId(), id, text, asset, studentClassId);
    await refresh();
  }, [refresh]);
  const grade = useCallback(async (assignmentId: string, submissionId: string, input: { score: number; maxScore?: number; feedback?: string }) => {
    await assignmentsRepository.gradeSubmission(teacherId(), assignmentId, submissionId, input);
    await refresh();
  }, [refresh]);
  const value = useMemo(() => ({ state, isLoading, save, publish, close, duplicate, remove, submit, grade, refresh }), [state, isLoading, save, publish, close, duplicate, remove, submit, grade, refresh]);

  return <AssignmentsContext.Provider value={value}>{children}</AssignmentsContext.Provider>;
}
