"use client";

/* eslint-disable react-hooks/set-state-in-effect -- repository hydration synchronizes browser storage with provider state. */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConfiguredSchoolLevel } from "@/types/school-settings";
import { AcademicsContext } from "./academics-context";
import { academicsRepository } from "./academics.repository";
import { ACADEMICS_STORAGE_KEY } from "./academics.storage";
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
  TeacherClassAssignmentType,
  UpdateClassInput,
} from "./academics.types";

const emptyAcademicsState: AcademicsState = {
  version: 2,
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
  const [state, setState] = useState<AcademicsState>(emptyAcademicsState);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      setState(await academicsRepository.getState());
      setError(undefined);
    } catch {
      setError("Academic records could not be loaded.");
    } finally {
      setLoading(false);
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

  const createClass = useCallback(
    async (input: CreateClassInput) => {
      await academicsRepository.createClass(input);
      await refresh();
    },
    [refresh],
  );
  const createStandardClass = useCallback(
    async (templateKey: string, input?: Partial<CreateClassInput>) => {
      await academicsRepository.createStandardClass(templateKey, input);
      await refresh();
    },
    [refresh],
  );
  const createCustomClass = useCallback(
    async (input: CreateClassInput) => {
      await academicsRepository.createCustomClass(input);
      await refresh();
    },
    [refresh],
  );
  const updateClass = useCallback(
    async (id: string, input: UpdateClassInput) => {
      await academicsRepository.updateClass(id, input);
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
      await academicsRepository.moveStudents(ids, classId);
      await refresh();
    },
    [refresh],
  );
  const saveTeacherAssignments = useCallback(
    async (input: {
      teacherUserId: string;
      classIds: string[];
      assignmentType: TeacherClassAssignmentType;
      subjectIds: string[];
      subjectAssignments?: Array<{ classId: string; subjectIds: string[] }>;
    }) => {
      const items = await academicsRepository.saveTeacherAssignments(input);
      await refresh();
      return items.length;
    },
    [refresh],
  );
  const createStaff = useCallback(
    async (input: StaffInput) => {
      const item = await academicsRepository.createStaff(input);
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
    async (id: string) => {
      await academicsRepository.removeTeacherAssignment(id);
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
    [refresh],
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
  const createStudent = useCallback(
    async (input: StudentInput) => {
      const item = await academicsRepository.createStudent(input);
      await refresh();
      return item;
    },
    [refresh],
  );
  const updateStudent = useCallback(
    async (id: string, input: Partial<StudentInput>) => {
      const item = await academicsRepository.updateStudent(id, input);
      await refresh();
      return item;
    },
    [refresh],
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
    }) => {
      const item = await academicsRepository.moveStudentToClass(input);
      await refresh();
      return item;
    },
    [refresh],
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

  const value = useMemo(
    () => ({
      state,
      isLoading,
      error,
      createClass,
      createStandardClass,
      createCustomClass,
      updateClass,
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
      assignStaffClasses,
      setStaffStatus,
      removeStaff,
      createSubject,
      createSubjects,
      setSubjectStatus,
      removeSubject,
      removeTeacherAssignment,
      createGuardian,
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
      state,
      isLoading,
      error,
      createClass,
      createStandardClass,
      createCustomClass,
      updateClass,
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
      assignStaffClasses,
      setStaffStatus,
      removeStaff,
      createSubject,
      createSubjects,
      setSubjectStatus,
      removeSubject,
      removeTeacherAssignment,
      createGuardian,
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
