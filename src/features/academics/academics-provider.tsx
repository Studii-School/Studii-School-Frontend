"use client";

/* eslint-disable react-hooks/set-state-in-effect -- repository hydration synchronizes browser storage with provider state. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { readStoredUser } from "@/lib/auth";
import type { ConfiguredSchoolLevel } from "@/types/school-settings";
import { AcademicsContext } from "./academics-context";
import { academicsRepository } from "./academics.repository";
import { ACADEMICS_STORAGE_KEY } from "./academics.storage";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { matchingClassForAcademicSession, studentClassForAcademicSession } from "@/features/academic-period/academic-context";
import type {
  AcademicsState,
  ClassStatus,
  CreateClassInput,
  Guardian,
  StaffInput,
  StudentDocument,
  StudentInput,
  StudentStatus,
  Subject,
  SubjectInput,
  TeacherClassAssignment,
  TeacherClassAssignmentType,
  UpdateClassInput,
} from "./academics.types";

const emptyAcademicsState: AcademicsState = {
  version: 3,
  classes: [],
  students: [],
  staff: [],
  teachers: [],
  subjects: [],
  teacherAssignments: [],
  guardians: [],
  studentDocuments: [],
  studentActivities: [],
  studentClassHistory: [],
  studentEnrollments: [],
};

function mergeSubjects(state: AcademicsState, subjects: Subject[]): AcademicsState {
  if (!subjects.length) return state;
  const nextSubjects = [...state.subjects];
  for (const subject of subjects) {
    const index = nextSubjects.findIndex((item) => item.id === subject.id);
    if (index >= 0) {
      nextSubjects[index] = subject;
    } else {
      nextSubjects.push(subject);
    }
  }
  return { ...state, subjects: nextSubjects };
}

export function AcademicsProvider({ children }: { children: React.ReactNode }) {
  const { sessions, selectedSession, selectedTerm, scope } = useAcademicPeriod();
  const pathname = usePathname();
  const viewer = typeof window === "undefined" ? null : readStoredUser();
  const [state, setState] = useState<AcademicsState>(emptyAcademicsState);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const nextState = await academicsRepository.getState();
      if (sequence !== refreshSequence.current) return;
      setState(nextState);
      setError(undefined);
    } catch {
      if (sequence !== refreshSequence.current) return;
      setError("Academic records could not be loaded.");
    } finally {
      if (sequence === refreshSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const sync = (event: StorageEvent) => {
      if (event.key === ACADEMICS_STORAGE_KEY) void refresh();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [refresh]);

  useEffect(() => {
    if (!scope.isReady) return;
    const orderedSessions = [...sessions].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const activeSessions = orderedSessions.filter((session) => session.status === "ACTIVE");
    if (!activeSessions.length) return;
    void (async () => {
      for (const session of activeSessions) {
        const sessionIndex = orderedSessions.findIndex((item) => item.id === session.id);
        const previousSession = sessionIndex > 0 ? orderedSessions[sessionIndex - 1] : undefined;
        await academicsRepository.ensureSessionEnrollments(
          {
            schoolId: scope.schoolId,
            academicSessionId: session.id,
            academicSessionName: session.name,
            previousAcademicSessionId: previousSession?.id,
          },
          true,
        );
      }
      await refresh();
    })();
  }, [refresh, scope.isReady, scope.schoolId, sessions]);

  const createClass = useCallback(
    async (input: CreateClassInput) => {
      await academicsRepository.createClass({ ...input, schoolId: scope.schoolId, academicSessionId: scope.academicSessionId, academicYear: selectedSession?.name });
      await refresh();
    },
    [refresh, scope.academicSessionId, selectedSession?.name],
  );
  const createStandardClass = useCallback(
    async (templateKey: string, input?: Partial<CreateClassInput>) => {
      await academicsRepository.createStandardClass(templateKey, { ...input, schoolId: scope.schoolId, academicSessionId: scope.academicSessionId, academicYear: selectedSession?.name });
      await refresh();
    },
    [refresh, scope.academicSessionId, selectedSession?.name],
  );
  const createCustomClass = useCallback(
    async (input: CreateClassInput) => {
      await academicsRepository.createCustomClass({ ...input, schoolId: scope.schoolId, academicSessionId: scope.academicSessionId, academicYear: selectedSession?.name });
      await refresh();
    },
    [refresh, scope.academicSessionId, selectedSession?.name],
  );
  const updateClass = useCallback(
    async (id: string, input: UpdateClassInput) => {
      await academicsRepository.updateClass(id, input);
      await refresh();
    },
    [refresh],
  );
  const setClassOwners = useCallback(
    async (classId: string, classOwnerUserId: string, coOwnerUserIds: string[]) => {
      await academicsRepository.setClassOwners(classId, classOwnerUserId, coOwnerUserIds);
      await refresh();
    },
    [refresh],
  );
  const duplicateClass = useCallback(
    async (id: string, suffix?: string) => {
      await academicsRepository.duplicateClass(id, suffix);
      await refresh();
    },
    [refresh],
  );
  const reorderClasses = useCallback(
    async (ids: string[]) => {
      await academicsRepository.reorderClasses(ids);
      await refresh();
    },
    [refresh],
  );
  const setClassStatus = useCallback(
    async (id: string, status: ClassStatus) => {
      await academicsRepository.setClassStatus(id, status);
      await refresh();
    },
    [refresh],
  );
  const archiveClass = useCallback(
    async (id: string) => {
      await academicsRepository.archiveClass(id);
      await refresh();
    },
    [refresh],
  );
  const removeClass = useCallback(
    async (id: string) => {
      const result = await academicsRepository.removeClass(id);
      await refresh();
      return result;
    },
    [refresh],
  );
  const getClassUsage = useCallback(
    (id: string) => academicsRepository.getClassUsage(id),
    [],
  );
  const setSchoolLevels = useCallback(
    async (levels: ConfiguredSchoolLevel[]) => {
      await academicsRepository.setSchoolLevels(levels);
      await refresh();
    },
    [refresh],
  );
  const moveStudents = useCallback(
    async (ids: string[], classId: string) => {
      await academicsRepository.moveStudents(ids, classId, { schoolId: scope.schoolId, academicSessionId: scope.academicSessionId });
      await refresh();
    },
    [refresh, scope.academicSessionId, scope.schoolId],
  );
  const saveTeacherAssignments = useCallback(
    async (input: {
      teacherUserId: string;
      classIds: string[];
      assignmentType: TeacherClassAssignmentType;
      subjectIds: string[];
      assignmentPolicy?: "CO" | "MAIN" | "REPLACE";
      assignmentSnapshot?: TeacherClassAssignment[];
      subjectAssignments?: Array<{ classId: string; subjectIds: string[] }>;
    }) => {
      const items = await academicsRepository.saveTeacherAssignments({ ...input, schoolId: scope.schoolId, academicSessionId: scope.academicSessionId, termId: scope.termId });
      await refresh();
      return items.length;
    },
    [refresh, scope.academicSessionId, scope.schoolId, scope.termId],
  );
  const createStaff = useCallback(
    async (input: StaffInput) => {
      const item = await academicsRepository.createStaff(input);
      await refresh();
      return item;
    },
    [refresh],
  );
  const updateStaff = useCallback(
    async (id: string, input: Partial<StaffInput>) => {
      const item = await academicsRepository.updateStaff(id, input);
      await refresh();
      return item;
    },
    [refresh],
  );
  const assignStaffClasses = useCallback(
    async (
      staffId: string,
      input: { assignedClassIds: string[]; classTeacherClassIds: string[]; subjectIds?: string[] },
    ) => {
      const item = await academicsRepository.assignStaffClasses(staffId, input);
      await refresh();
      return item;
    },
    [refresh],
  );
  const setStaffStatus = useCallback(
    async (staffId: string, status: "ACTIVE" | "SUSPENDED") => {
      const item = await academicsRepository.setStaffStatus(staffId, status);
      await refresh();
      return item;
    },
    [refresh],
  );
  const removeStaff = useCallback(
    async (staffId: string) => {
      await academicsRepository.removeStaff(staffId);
      await refresh();
    },
    [refresh],
  );
  const createSubject = useCallback(
    async (input: SubjectInput) => {
      const item = await academicsRepository.createSubject(input);
      await refresh();
      setState((current) => mergeSubjects(current, [item]));
      return item;
    },
    [refresh],
  );
  const createSubjects = useCallback(
    async (inputs: SubjectInput[]) => {
      const items = await academicsRepository.createSubjects(inputs);
      await refresh();
      setState((current) => mergeSubjects(current, items));
      return items;
    },
    [refresh],
  );
  const setSubjectStatus = useCallback(
    async (id: string, status: Subject["status"]) => {
      const item = await academicsRepository.setSubjectStatus(id, status);
      await refresh();
      return item;
    },
    [refresh],
  );
  const removeSubject = useCallback(
    async (id: string) => {
      await academicsRepository.removeSubject(id);
      await refresh();
    },
    [refresh],
  );
  const removeTeacherAssignment = useCallback(
    async (id: string, assignmentSnapshot?: TeacherClassAssignment[]) => {
      await academicsRepository.removeTeacherAssignment(id, assignmentSnapshot, { academicSessionId: scope.academicSessionId, termId: scope.termId });
      await refresh();
      setState((current) => {
        const assignment = current.teacherAssignments.find((item) => item.id === id);
        if (!assignment) return current;
        const classRemoved = assignment.assignmentType !== "SUBJECT_TEACHER";
        const removedAssignmentIds = new Set(
          classRemoved
            ? current.teacherAssignments
                .filter(
                  (item) =>
                    item.teacherUserId === assignment.teacherUserId &&
                    item.classId === assignment.classId,
                )
                .map((item) => item.id)
            : [id],
        );
        const remaining = current.teacherAssignments.filter(
          (entry) => !removedAssignmentIds.has(entry.id) && entry.teacherUserId === assignment.teacherUserId,
        );
        return {
          ...current,
          teacherAssignments: current.teacherAssignments.filter((item) => !removedAssignmentIds.has(item.id)),
          staff: current.staff.map((item) => {
            if (item.userId !== assignment.teacherUserId) return item;
            const removedSubjectIds = new Set(
              current.teacherAssignments
                .filter((entry) => removedAssignmentIds.has(entry.id))
                .flatMap((entry) => entry.subjectIds),
            );
            return {
              ...item,
              assignedClassIds:
                classRemoved
                  ? item.assignedClassIds.filter((classId) => classId !== assignment.classId)
                  : item.assignedClassIds,
              classTeacherClassIds:
                classRemoved
                  ? item.classTeacherClassIds.filter((classId) => classId !== assignment.classId)
                  : item.classTeacherClassIds,
              subjectIds:
                removedSubjectIds.size
                  ? item.subjectIds.filter(
                      (subjectId) =>
                        !removedSubjectIds.has(subjectId) ||
                        remaining.some((entry) => entry.subjectIds.includes(subjectId)),
                    )
                  : item.subjectIds,
              updatedAt: new Date().toISOString(),
            };
          }),
          classes: current.classes.map((item) =>
            item.id === assignment.classId
              ? {
                  ...item,
                  classTeacherUserId:
                    item.classTeacherUserId === assignment.teacherUserId &&
                    assignment.assignmentType === "CLASS_TEACHER"
                      ? undefined
                      : item.classTeacherUserId,
                  assignedTeacherUserIds: classRemoved
                    ? item.assignedTeacherUserIds.filter(
                        (teacherUserId) => teacherUserId !== assignment.teacherUserId,
                      )
                    : item.assignedTeacherUserIds,
                }
              : item,
          ),
        };
      });
    },
    [refresh, scope.academicSessionId, scope.termId],
  );
  const createGuardian = useCallback(
    async (
      input: Omit<
        Guardian,
        "id" | "schoolId" | "createdAt" | "updatedAt"
      >,
    ) => {
      const item = await academicsRepository.createGuardian(input);
      await refresh();
      return item;
    },
    [refresh],
  );
  const updateGuardian = useCallback(
    async (
      id: string,
      input: Partial<Omit<Guardian, "id" | "schoolId" | "createdAt" | "updatedAt">>,
    ) => {
      const item = await academicsRepository.updateGuardian(id, input);
      await refresh();
      return item;
    },
    [refresh],
  );
  const createStudent = useCallback(
    async (input: StudentInput) => {
      const item = await academicsRepository.createStudent(input, { schoolId: scope.schoolId, academicSessionId: scope.academicSessionId });
      await refresh();
      return item;
    },
    [refresh, scope.academicSessionId, scope.schoolId],
  );
  const updateStudent = useCallback(
    async (id: string, input: Partial<StudentInput>) => {
      const { classId, ...identityInput } = input;
      const item = await academicsRepository.updateStudent(id, identityInput);
      if (classId) await academicsRepository.moveStudents([id], classId, { schoolId: scope.schoolId, academicSessionId: scope.academicSessionId });
      await refresh();
      return classId ? { ...item, classId, currentClassId: classId } : item;
    },
    [refresh, scope.academicSessionId, scope.schoolId],
  );
  const assignStudentParents = useCallback(
    async (studentId: string, guardianIds: string[]) => {
      const item = await academicsRepository.assignStudentParents(
        studentId,
        guardianIds,
      );
      await refresh();
      return item;
    },
    [refresh],
  );
  const moveStudentToClass = useCallback(
    async (input: {
      studentId: string;
      classId: string;
      effectiveDate: string;
      reason: string;
      academicSessionId?: string;
    }) => {
      const { academicSessionId, ...moveInput } = input;
      const item = await academicsRepository.moveStudentToClass(moveInput, { schoolId: scope.schoolId, academicSessionId: academicSessionId ?? scope.academicSessionId });
      await refresh();
      return item;
    },
    [refresh, scope.academicSessionId, scope.schoolId],
  );
  const updateStudentStatus = useCallback(
    async (id: string, status: StudentStatus) => {
      const item = await academicsRepository.updateStudentStatus(id, status);
      await refresh();
      return item;
    },
    [refresh],
  );
  const addStudentDocument = useCallback(
    async (
      studentId: string,
      input: Omit<StudentDocument, "id" | "studentId" | "uploadedAt">,
    ) => {
      const item = await academicsRepository.addStudentDocument(
        studentId,
        input,
      );
      await refresh();
      return item;
    },
    [refresh],
  );
  const removeStudentDocument = useCallback(
    async (id: string) => {
      await academicsRepository.removeStudentDocument(id);
      await refresh();
    },
    [refresh],
  );

  const scopedState = useMemo<AcademicsState>(() => {
    if (!selectedSession) return state;
    const selectedName = selectedSession.name.trim().toLowerCase();
    const periodClasses = state.classes.filter((item) => {
      if (item.schoolId !== scope.schoolId) return false;
      if (item.academicSessionId) return item.academicSessionId === scope.academicSessionId;
      if (item.academicYear?.trim()) return item.academicYear.trim().toLowerCase() === selectedName;
      return selectedSession.status === "ACTIVE";
    });
    const relationshipClassIds = new Set<string>();
    const portalRole = pathname.split("/")[1];
    if (viewer?.id && portalRole === "teacher") {
      const teacher = state.staff.find((item) => item.userId === viewer.id || item.id === viewer.id);
      const teacherUserId = teacher?.userId ?? viewer.id;
      [
        ...(teacher?.assignedClassIds ?? []),
        ...(teacher?.classTeacherClassIds ?? []),
        ...(teacher?.assignedClasses ?? []).map((item) => item.id),
        ...(teacher?.classTeacherClasses ?? []).map((item) => item.id),
        ...(teacher?.teachingAssignments ?? []).map((item) => item.classId),
        ...(teacher?.periodAssignments ?? []).map((item) => item.classId),
        ...state.teacherAssignments.filter((item) => item.teacherUserId === teacherUserId || item.teacherUserId === viewer.id).map((item) => item.classId),
        ...state.classes.filter((item) => item.classTeacherUserId === teacherUserId || item.assignedTeacherUserIds.includes(teacherUserId)).map((item) => item.id),
      ].forEach((classId) => relationshipClassIds.add(classId));
    } else if (viewer?.id && portalRole === "student") {
      const student = state.students.find((item) => item.userId === viewer.id || item.id === viewer.id);
      if (student?.classId) relationshipClassIds.add(student.classId);
      if (student?.currentClassId) relationshipClassIds.add(student.currentClassId);
    } else if (viewer?.id && portalRole === "parent") {
      const parentIds = new Set([
        viewer.id,
        ...state.guardians.filter((item) => item.userId === viewer.id || Boolean(item.email && viewer.email && item.email.toLowerCase() === viewer.email.toLowerCase())).map((item) => item.id),
      ]);
      state.students.filter((item) => item.guardianIds.some((id) => parentIds.has(id))).forEach((student) => {
        if (student.classId) relationshipClassIds.add(student.classId);
        if (student.currentClassId) relationshipClassIds.add(student.currentClassId);
      });
    }
    if ((portalRole === "parent" || portalRole === "student") && viewer?.id) {
      state.studentEnrollments
        .filter((item) => item.schoolId === scope.schoolId && item.academicSessionId === scope.academicSessionId && item.status === "ACTIVE")
        .forEach((item) => relationshipClassIds.add(item.classId));
    }
    const classes = [...periodClasses];
    for (const classId of relationshipClassIds) {
      const relatedClass = state.classes.find((item) => item.id === classId && item.schoolId === scope.schoolId && item.status === "ACTIVE");
      if (relatedClass && !matchingClassForAcademicSession(relatedClass, periodClasses)) classes.push(relatedClass);
    }
    const classIds = new Set(classes.map((item) => item.id));
    const enrollments = state.studentEnrollments.filter((item) => item.schoolId === scope.schoolId && item.academicSessionId === scope.academicSessionId);
    const enrollmentByStudent = new Map(enrollments.filter((item) => item.status === "ACTIVE").map((item) => [item.studentId, item]));
    const students = state.students.map((student) => {
      const enrollment = enrollmentByStudent.get(student.id);
      const previousClass = state.classes.find((item) => item.id === student.classId);
      const matchingClass = matchingClassForAcademicSession(previousClass, classes);
      const hasPersistedEnrollmentHistory = state.studentEnrollments.some((item) => item.studentId === student.id);
      const classId = periodClasses.some((item) => item.id === student.classId)
        ? student.classId
        : hasPersistedEnrollmentHistory
          ? enrollment?.classId ?? ""
          : studentClassForAcademicSession(student.classId, matchingClass?.id);
      return {
        ...student,
        classId,
        currentClassId: classId || student.currentClassId || student.classId || null,
      };
    });
    const scopedForPeriod = state.teacherAssignments.filter((item) => item.academicSessionId === scope.academicSessionId && item.termId === scope.termId);
    const teacherAssignments = state.teacherAssignments.filter((item) => {
      if (item.isRemoved) return false;
      if (!classIds.has(item.classId)) return false;
      if (item.academicSessionId || item.termId) return item.academicSessionId === scope.academicSessionId && item.termId === scope.termId;
      // Staff class and subject relationships are not period-scoped. Keep them
      // visible across sessions unless that teacher's matching role was changed.
      return !scopedForPeriod.some((scoped) =>
        scoped.classId === item.classId && scoped.teacherUserId === item.teacherUserId && scoped.assignmentType === item.assignmentType,
      );
    });
    if (selectedTerm && selectedSession) {
      const periods = sessions.flatMap((session) => session.terms.map((term) => ({
        sessionId: session.id,
        termId: term.id,
        startDate: term.startDate || session.startDate,
        sessionName: session.name,
      }))).sort((a, b) => a.startDate.localeCompare(b.startDate));
      const selectedIndex = periods.findIndex((item) => item.sessionId === scope.academicSessionId && item.termId === scope.termId);
      const classById = new Map(state.classes.map((item) => [item.id, item]));
      const inherited = classes.flatMap((targetClass) => {
        const normaliseClassName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
        const targetNames = [targetClass.displayName, targetClass.baseName].map(normaliseClassName);
        const matchesTargetClass = (item: AcademicsState["teacherAssignments"][number]) => {
          const sourceClass = classById.get(item.classId);
          const sourceNames = [item.className, sourceClass?.displayName, sourceClass?.baseName].filter(Boolean).map((name) => normaliseClassName(name!));
          return sourceNames.some((name) => targetNames.includes(name));
        };
        const sourcePeriod = [...periods.slice(0, Math.max(0, selectedIndex))].reverse().find((period) =>
          state.teacherAssignments.some((item) => item.academicSessionId === period.sessionId && item.termId === period.termId && matchesTargetClass(item)),
        );
        const sourcePeriodAssignments = sourcePeriod
          ? state.teacherAssignments.filter((item) => item.academicSessionId === sourcePeriod.sessionId && item.termId === sourcePeriod.termId && matchesTargetClass(item))
          : [];
        const sourceLegacyAssignments = state.teacherAssignments.filter((item) => !item.isRemoved && !item.academicSessionId && !item.termId && matchesTargetClass(item));
        const sourceAssignments = [
          ...sourcePeriodAssignments.filter((item) => !item.isRemoved),
          ...sourceLegacyAssignments.filter((legacy) => !sourcePeriodAssignments.some((periodAssignment) => {
            if (periodAssignment.teacherUserId === legacy.teacherUserId && periodAssignment.assignmentType === legacy.assignmentType) return true;
            if (legacy.assignmentType === "CLASS_TEACHER" && periodAssignment.assignmentType === "CLASS_TEACHER") {
              return periodAssignment.assignmentRole !== "CO" && legacy.assignmentRole !== "CO";
            }
            return legacy.assignmentType === "SUBJECT_TEACHER" && periodAssignment.assignmentType === "SUBJECT_TEACHER" &&
              periodAssignment.assignmentRole !== "CO" && legacy.subjectIds.some((subjectId) => periodAssignment.subjectIds.includes(subjectId));
          })),
        ];
        return sourceAssignments.flatMap((item) => {
          const exactForClass = teacherAssignments.filter((entry) => entry.classId === targetClass.id);
          const removed = state.teacherAssignments.some((entry) =>
            entry.isRemoved && entry.academicSessionId === scope.academicSessionId && entry.termId === scope.termId &&
            entry.teacherUserId === item.teacherUserId && entry.classId === targetClass.id &&
            entry.assignmentType === item.assignmentType && entry.subjectIds.join(",") === item.subjectIds.join(","),
          );
          if (removed || exactForClass.some((entry) => entry.teacherUserId === item.teacherUserId && entry.assignmentType === item.assignmentType)) return [];
          let inheritedSubjectIds = item.subjectIds;
          const mainAssignmentForType = exactForClass.find((entry) => entry.assignmentType === item.assignmentType && entry.assignmentRole !== "CO");
          if (item.assignmentType === "CLASS_TEACHER" && mainAssignmentForType && item.assignmentRole !== "CO") return [];
          if (item.assignmentType === "SUBJECT_TEACHER" && mainAssignmentForType) {
            inheritedSubjectIds = item.subjectIds.filter((subjectId) => !mainAssignmentForType.subjectIds.includes(subjectId));
            if (!inheritedSubjectIds.length) return [];
          }
          return [{
            ...item,
            id: `inherited:${scope.academicSessionId}:${scope.termId}:${targetClass.id}:${item.id}`,
            classId: targetClass.id,
            className: targetClass.displayName,
            subjectIds: inheritedSubjectIds,
            academicSessionId: scope.academicSessionId,
            termId: scope.termId,
          }];
        });
      });
      teacherAssignments.push(...inherited.filter((item) => !teacherAssignments.some((existing) => existing.id === item.id)));
    }
    return {
      ...state,
      classes: classes.map((item) => {
        const assignments = teacherAssignments.filter((entry) => entry.classId === item.id);
        return {
          ...item,
          studentIds: students.filter((student) => student.status === "ACTIVE" && student.classId === item.id).map((student) => student.id),
          classTeacherUserId: assignments.find((entry) => entry.assignmentType === "CLASS_TEACHER" && entry.assignmentRole !== "CO")?.teacherUserId ?? item.classTeacherUserId,
          assignedTeacherUserIds: [...new Set([...item.assignedTeacherUserIds, ...assignments.map((entry) => entry.teacherUserId)])],
        };
      }),
      students,
      studentEnrollments: enrollments,
      teacherAssignments,
      staff: state.staff.map((item) => ({
        ...item,
        assignedClassIds: [...new Set(teacherAssignments.filter((entry) => entry.teacherUserId === item.userId).map((entry) => entry.classId))],
        classTeacherClassIds: [...new Set(teacherAssignments.filter((entry) => entry.teacherUserId === item.userId && entry.assignmentType === "CLASS_TEACHER").map((entry) => entry.classId))],
      })),
    };
  }, [pathname, scope.academicSessionId, scope.schoolId, scope.termId, selectedSession, selectedTerm, sessions, state, viewer?.email, viewer?.id]);

  const value = useMemo(
    () => ({
      state: scopedState,
      isLoading,
      error,
      createClass,
      createStandardClass,
      createCustomClass,
      updateClass,
      setClassOwners,
      duplicateClass,
      reorderClasses,
      setClassStatus,
      archiveClass,
      removeClass,
      getClassUsage,
      setSchoolLevels,
      moveStudents,
      saveTeacherAssignments,
      createStaff,
      updateStaff,
      assignStaffClasses,
      setStaffStatus,
      removeStaff,
      createSubject,
      createSubjects,
      setSubjectStatus,
      removeSubject,
      removeTeacherAssignment,
      createGuardian,
      updateGuardian,
      createStudent,
      updateStudent,
      assignStudentParents,
      moveStudentToClass,
      updateStudentStatus,
      addStudentDocument,
      removeStudentDocument,
      refresh,
    }),
    [
      scopedState,
      isLoading,
      error,
      createClass,
      createStandardClass,
      createCustomClass,
      updateClass,
      setClassOwners,
      duplicateClass,
      reorderClasses,
      setClassStatus,
      archiveClass,
      removeClass,
      getClassUsage,
      setSchoolLevels,
      moveStudents,
      saveTeacherAssignments,
      createStaff,
      updateStaff,
      assignStaffClasses,
      setStaffStatus,
      removeStaff,
      createSubject,
      createSubjects,
      setSubjectStatus,
      removeSubject,
      removeTeacherAssignment,
      createGuardian,
      updateGuardian,
      createStudent,
      updateStudent,
      assignStudentParents,
      moveStudentToClass,
      updateStudentStatus,
      addStudentDocument,
      removeStudentDocument,
      refresh,
    ],
  );

  return (
    <AcademicsContext.Provider value={value}>
      {children}
    </AcademicsContext.Provider>
  );
}
