"use client";

import { createContext, useContext } from "react";
import type { ConfiguredSchoolLevel } from "@/types/school-settings";
import type {
  AcademicsState,
  ClassStatus,
  ClassUsage,
  CreateClassInput,
  Guardian,
  StaffInput,
  StaffMember,
  Student,
  StudentDocument,
  StudentInput,
  StudentStatus,
  Subject,
  SubjectInput,
  TeacherClassAssignmentType,
  UpdateClassInput,
} from "./academics.types";

export interface AcademicsContextValue {
  state: AcademicsState;
  isLoading: boolean;
  error?: string;
  createClass(input: CreateClassInput): Promise<void>;
  createStandardClass(
    templateKey: string,
    input?: Partial<CreateClassInput>,
  ): Promise<void>;
  createCustomClass(input: CreateClassInput): Promise<void>;
  updateClass(id: string, input: UpdateClassInput): Promise<void>;
  duplicateClass(id: string, suffix?: string): Promise<void>;
  reorderClasses(ids: string[]): Promise<void>;
  setClassStatus(id: string, status: ClassStatus): Promise<void>;
  archiveClass(id: string): Promise<void>;
  removeClass(id: string): Promise<"REMOVED" | "ARCHIVED">;
  getClassUsage(id: string): Promise<ClassUsage>;
  setSchoolLevels(levels: ConfiguredSchoolLevel[]): Promise<void>;
  moveStudents(studentIds: string[], classId: string): Promise<void>;
  saveTeacherAssignments(input: {
    teacherUserId: string;
    classIds: string[];
    assignmentType: TeacherClassAssignmentType;
    subjectIds: string[];
    subjectAssignments?: Array<{ classId: string; subjectIds: string[] }>;
  }): Promise<number>;
  createStaff(input: StaffInput): Promise<StaffMember>;
  assignStaffClasses(staffId: string, input: { assignedClassIds: string[]; classTeacherClassIds: string[]; subjectIds?: string[] }): Promise<StaffMember>;
  setStaffStatus(staffId: string, status: "ACTIVE" | "SUSPENDED"): Promise<StaffMember>;
  removeStaff(staffId: string): Promise<void>;
  createSubject(input: SubjectInput): Promise<Subject>;
  createSubjects(inputs: SubjectInput[]): Promise<Subject[]>;
  setSubjectStatus(id: string, status: Subject["status"]): Promise<Subject>;
  removeSubject(id: string): Promise<void>;
  removeTeacherAssignment(id: string): Promise<void>;
  createGuardian(input: Omit<Guardian, "id" | "schoolId" | "createdAt" | "updatedAt">): Promise<Guardian>;
  createStudent(input: StudentInput): Promise<Student>;
  updateStudent(id: string, input: Partial<StudentInput>): Promise<Student>;
  assignStudentParents(studentId: string, guardianIds: string[]): Promise<Student>;
  moveStudentToClass(input: { studentId: string; classId: string; effectiveDate: string; reason: string }): Promise<Student>;
  updateStudentStatus(id: string, status: StudentStatus): Promise<Student>;
  addStudentDocument(studentId: string, input: Omit<StudentDocument, "id" | "studentId" | "uploadedAt">): Promise<StudentDocument>;
  removeStudentDocument(id: string): Promise<void>;
  refresh(): Promise<void>;
}

export const AcademicsContext =
  createContext<AcademicsContextValue | null>(null);

export function useAcademics() {
  const value = useContext(AcademicsContext);
  if (!value) {
    throw new Error("useAcademics must be used within AcademicsProvider");
  }
  return value;
}
