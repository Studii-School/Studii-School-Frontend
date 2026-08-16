export type ResultStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "PUBLISHED";

export interface AssessmentComponent {
  id?: string;
  name: string;
  weight: number;
  isActive?: boolean;
}

export interface GradeBand {
  id?: string;
  grade: string;
  minScore: number;
  maxScore: number;
  remark: string;
}

export interface ResultSettings {
  passMark: number;
  positionEnabled: boolean;
  promotionRule?: string;
  components: AssessmentComponent[];
  gradeBands: GradeBand[];
}

export interface SubjectScore {
  id: string;
  subjectId: string;
  subject?: { id: string; name: string; code?: string };
  components: Record<string, number>;
  total: number;
  grade: string;
  remark: string;
  status: ResultStatus;
  locked: boolean;
}

export interface StudentResult {
  id: string;
  studentId: string;
  classId: string;
  sessionId: string;
  termId: string;
  total: number;
  average: number;
  grade?: string;
  remark?: string;
  position?: number;
  status: ResultStatus;
  locked: boolean;
  attendanceSummary?: { total?: number; present?: number; absent?: number };
  teacherComment?: string;
  principalComment?: string;
  student?: { id: string; firstName: string; middleName?: string; lastName: string; admissionNumber: string };
  class?: { id: string; name: string; section?: string };
  subjectScores: SubjectScore[];
}

export interface ResultClassSummary {
  id: string;
  name: string;
  section?: string;
  studentCount: number;
  subjectCount: number;
  resultCount: number;
  publishedCount: number;
  average: number;
}

export interface ResultSubject {
  id: string;
  name: string;
  code?: string;
}

export interface ResultStudentRow {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  admissionNumber: string;
  results: StudentResult[];
}

export interface TeacherResultAssignment {
  id: string;
  classId: string;
  subjectId: string;
  class: { id: string; name: string; section?: string };
  subject: { id: string; name: string; code?: string };
}
