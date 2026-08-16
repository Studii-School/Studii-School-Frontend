import { sortClasses } from "./academics.class-utils";
import type { AcademicsState, SchoolClass } from "./academics.types";

export const getClassById = (state: AcademicsState, id: string) =>
  state.classes.find((item) => item.id === id);

export const getTeacherByUserId = (state: AcademicsState, userId: string) =>
  state.teachers.find((item) => item.userId === userId);

export const getStudentById = (state: AcademicsState, id: string) =>
  state.students.find((item) => item.id === id);

export const getActiveClasses = (state: AcademicsState) =>
  sortClasses(state.classes.filter((item) => item.status === "ACTIVE"));

export const getClassesBySchoolLevel = (
  state: AcademicsState,
  level: SchoolClass["level"],
) => sortClasses(state.classes.filter((item) => item.level === level));

export const getStudentsByClass = (state: AcademicsState, classId: string) =>
  state.students.filter((item) => item.classId === classId);

export const getTeachersByClass = (
  state: AcademicsState,
  classId: string,
) => {
  const schoolClass = getClassById(state, classId);
  const ids = new Set([
    ...state.teacherAssignments
      .filter((item) => item.classId === classId)
      .map((item) => item.teacherUserId),
    ...(schoolClass?.classTeacherUserId ? [schoolClass.classTeacherUserId] : []),
    ...(schoolClass?.assignedTeacherUserIds ?? []),
  ]);
  return state.teachers.filter((item) => ids.has(item.userId) || ids.has(item.id));
};

export const getTeacherClassAssignments = (
  state: AcademicsState,
  userId: string,
) =>
  state.teacherAssignments.filter(
    (item) => item.teacherUserId === userId,
  );

export const getClassesForTeacher = (
  state: AcademicsState,
  userId: string,
) => {
  const ids = new Set(
    getTeacherClassAssignments(state, userId).map((item) => item.classId),
  );
  return sortClasses(
    state.classes.filter(
      (item) =>
        item.status === "ACTIVE" &&
        (ids.has(item.id) ||
          item.classTeacherUserId === userId ||
          item.assignedTeacherUserIds.includes(userId)),
    ),
  );
};

export const getStudentClass = (
  state: AcademicsState,
  studentId: string,
) => getClassById(state, getStudentById(state, studentId)?.classId ?? "");

export const getGuardianChildren = (
  state: AcademicsState,
  guardianId: string,
) =>
  state.students.filter((item) => item.guardianIds.includes(guardianId));

export const canTeacherAccessClass = (
  state: AcademicsState,
  userId: string,
  classId: string,
) => {
  const schoolClass = getClassById(state, classId);
  return Boolean(
    getTeacherClassAssignments(state, userId).some(
      (item) => item.classId === classId,
    ) ||
      schoolClass?.classTeacherUserId === userId ||
      schoolClass?.assignedTeacherUserIds.includes(userId),
  );
};


export const isClassTeacherForClass = (
  state: AcademicsState,
  userId: string,
  classId: string,
) => {
  const schoolClass = getClassById(state, classId);
  return Boolean(
    schoolClass?.classTeacherUserId === userId ||
      schoolClass?.assignedTeacherUserIds.includes(userId),
  );
};

export const getClassTeacherClassesForTeacher = (
  state: AcademicsState,
  userId: string,
) =>
  sortClasses(
    state.classes.filter(
      (item) => item.status === "ACTIVE" && isClassTeacherForClass(state, userId, item.id),
    ),
  );

export const getClassTeacherStudentsForTeacher = (
  state: AcademicsState,
  userId: string,
) => {
  const classIds = new Set(getClassTeacherClassesForTeacher(state, userId).map((item) => item.id));
  return state.students.filter((student) => classIds.has(student.classId));
};
export const canTeacherAccessStudent = (
  state: AcademicsState,
  userId: string,
  studentId: string,
) => {
  const student = getStudentById(state, studentId);
  return Boolean(
    student && canTeacherAccessClass(state, userId, student.classId),
  );
};

export const getAccessibleClassesForTeacher = getClassesForTeacher;

export const getAccessibleStudentsForTeacher = (
  state: AcademicsState,
  userId: string,
) =>
  state.students.filter((student) =>
    canTeacherAccessStudent(state, userId, student.id),
  );


