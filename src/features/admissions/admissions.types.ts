import type { SchoolLevel } from "@/features/academics/academics.types";

export type AdmissionStatus = "NEW" | "UNDER_REVIEW" | "INTERVIEW" | "ACCEPTED" | "REJECTED" | "ENROLLED";
export interface AdmissionDocument { id: string; name: string; type: string; dataUrl?: string; uploadedAt: string }
export interface AdmissionDecision { id: string; status: AdmissionStatus; note?: string; changedAt: string; changedBy: string }
export interface AdmissionApplication {
  id: string;
  applicationNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  photoUrl?: string;
  gender?: "Male" | "Female";
  dateOfBirth?: string;
  nationality?: string;
  address?: string;
  schoolLevel: SchoolLevel;
  classId: string;
  parentName: string;
  relationship: string;
  parentPhone: string;
  parentEmail?: string;
  previousSchool?: string;
  previousClass?: string;
  reasonForLeaving?: string;
  medicalNotes?: string;
  interviewDate?: string;
  interviewOutcome?: string;
  interviewNotes?: string;
  customFields?: Record<string, string>;
  documents: AdmissionDocument[];
  status: AdmissionStatus;
  submittedAt: string;
  updatedAt: string;
  enrolledStudentId?: string;
  decisions: AdmissionDecision[];
}
export type AdmissionInput = Omit<AdmissionApplication, "id" | "applicationNumber" | "documents" | "status" | "submittedAt" | "updatedAt" | "enrolledStudentId" | "decisions">;

export type AdmissionFormFieldKey =
  | "photoUrl"
  | "firstName"
  | "middleName"
  | "lastName"
  | "gender"
  | "dateOfBirth"
  | "nationality"
  | "address"
  | "classId"
  | "parentName"
  | "relationship"
  | "parentPhone"
  | "parentEmail"
  | "previousSchool"
  | "previousClass"
  | "medicalNotes";

export type AdmissionFormFieldType = "text" | "email" | "phone" | "date" | "textarea" | "image";

export interface AdmissionFormField {
  key: AdmissionFormFieldKey | `custom-${string}`;
  label: string;
  enabled: boolean;
  required: boolean;
  type: AdmissionFormFieldType;
  builtIn?: boolean;
}

export interface AdmissionFormConfig {
  title: string;
  intro: string;
  isPublished: boolean;
  fields: AdmissionFormField[];
}
