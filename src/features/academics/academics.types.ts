import type { ConfiguredSchoolLevel as SchoolLevel } from "@/types/school-settings";

export type { SchoolLevel };
export type ClassSource = "STANDARD" | "CUSTOM";
export type ClassStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type ClassTemplateCategory =
  | "EARLY_YEARS"
  | "PRIMARY"
  | "JUNIOR_SECONDARY"
  | "SENIOR_SECONDARY";

export interface ClassTemplate {
  key: string;
  level: SchoolLevel;
  category: ClassTemplateCategory;
  defaultName: string;
  defaultSortOrder: number;
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  level: SchoolLevel;
  source: ClassSource;
  templateKey?: string;
  baseName: string;
  suffix?: string;
  /** Legacy alias retained while existing feature data migrates. */
  arm?: string;
  displayName: string;
  name?: string;
  section?: string | null;
  academicYear?: string;
  sortOrder: number;
  capacity?: number;
  classTeacherUserId?: string;
  classTeacherId?: string | null;
  assignedTeacherUserIds: string[];
  assignedTeacherIds?: string[];
  studentIds: string[];
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
  students?: Student[];
  assignedTeachers?: Teacher[];
  teachingAssignments?: Array<{
    id?: string;
    teacherUserId: string;
    classId: string;
    subjectId: string;
    subject?: Subject;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

export type StudentStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "GRADUATED"
  | "WITHDRAWN"
  | "SUSPENDED";
export interface Student {
  id: string;
  schoolId: string;
  userId?: string;
  currentClassId?: string | null;
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: "Male" | "Female" | "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  admissionDate?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  address?: string;
  photoUrl?: string;
  medicalNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  schoolLevel: SchoolLevel;
  classId: string;
  parentIds?: string[];
  guardianIds: string[];
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Guardian {
  id: string;
  schoolId: string;
  userId?: string;
  fullName: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  accountStatus?: string;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  name: string;
  type: string;
  dataUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface StudentActivity {
  id: string;
  studentId: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface StudentClassHistory {
  id: string;
  studentId: string;
  fromClassId?: string;
  toClassId: string;
  effectiveDate: string;
  reason: string;
  createdAt: string;
}

export interface StudentInput {
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: "Male" | "Female" | "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  admissionDate?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  address?: string;
  photoUrl?: string;
  medicalNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  schoolLevel: SchoolLevel;
  classId: string;
  parentIds?: string[];
  guardianIds: string[];
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  status: StudentStatus;
  temporaryPassword?: string;
}

export interface Teacher {
  id: string;
  schoolId: string;
  userId: string;
  staffId: string;
  firstName: string;
  lastName: string;
  role: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
  email?: string;
  subjectIds: string[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  id: string;
  schoolId: string;
  userId: string;
  staffId?: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  salaryAmount?: number;
  role: "TEACHER" | "STAFF";
  jobTitle: string;
  department?: string;
  isTeachingStaff: boolean;
  gender?: "Male" | "Female" | "MALE" | "FEMALE" | "OTHER" | null;
  dateOfBirth?: string | null;
  address?: string | null;
  assignedClassIds: string[];
  classTeacherClassIds: string[];
  subjectIds: string[];
  teachingAssignments?: Array<{
    classId: string;
    subjectId: string;
    subject?: Subject;
  }>;
  subjects?: Subject[];
  assignedClasses?: SchoolClass[];
  classTeacherClasses?: SchoolClass[];
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
}

export interface StaffInput {
  name: string;
  email: string;
  jobTitle: string;
  isTeachingStaff: boolean;
  employeeNumber?: string;
  department?: string;
  phone?: string;
  salaryAmount?: number;
  gender?: "Male" | "Female" | "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: string;
  address?: string;
  assignedClassIds?: string[];
  classTeacherClassIds?: string[];
  subjectIds?: string[];
}

export interface Subject {
  id: string;
  schoolId: string;
  name: string;
  code?: string;
  description?: string;
  level: SchoolLevel;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface SubjectInput {
  name: string;
  code?: string;
  level: SchoolLevel;
  description?: string;
}

export type TeacherClassAssignmentType =
  | "CLASS_TEACHER"
  | "SUBJECT_TEACHER"
  | "GENERAL_ACCESS";

export interface TeacherClassAssignment {
  id: string;
  schoolId: string;
  teacherUserId: string;
  classId: string;
  assignmentType: TeacherClassAssignmentType;
  subjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AcademicsState {
  version: 2;
  classes: SchoolClass[];
  students: Student[];
  staff: StaffMember[];
  teachers: Teacher[];
  subjects: Subject[];
  teacherAssignments: TeacherClassAssignment[];
  guardians: Guardian[];
  studentDocuments: StudentDocument[];
  studentActivities: StudentActivity[];
  studentClassHistory: StudentClassHistory[];
}

export interface CreateClassInput {
  level: SchoolLevel;
  source?: ClassSource;
  templateKey?: string;
  baseName?: string;
  suffix?: string;
  /** Accepted during migration from the previous form API. */
  arm?: string;
  /** Derived from baseName and suffix; accepted for legacy callers only. */
  displayName?: string;
  academicYear?: string;
  capacity?: number;
  classTeacherUserId?: string;
  assignedTeacherUserIds?: string[];
  status: ClassStatus;
}

export type UpdateClassInput = Partial<
  Omit<CreateClassInput, "source" | "templateKey" | "displayName" | "arm">
>;

export interface ClassUsage {
  students: number;
  teacherAssignments: number;
  attendanceRecords: number;
  assignments: number;
  financeRecords: number;
  total: number;
}

export interface ClassOptionFilters {
  level?: SchoolLevel;
  includeInactive?: boolean;
  includeArchived?: boolean;
}
