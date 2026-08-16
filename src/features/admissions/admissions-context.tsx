"use client";
import { createContext, useContext } from "react";
import type { AdmissionApplication, AdmissionDocument, AdmissionFormConfig, AdmissionInput, AdmissionStatus } from "./admissions.types";
interface AdmissionsValue {
  applications: AdmissionApplication[]; formConfig: AdmissionFormConfig; isLoading: boolean;
  create(input: AdmissionInput): Promise<AdmissionApplication>;
  saveFormConfig(config: AdmissionFormConfig): Promise<void>;
  updateStatus(id: string, status: AdmissionStatus, note?: string, enrolledStudentId?: string): Promise<void>;
  updateInterview(id: string, date: string, outcome: string, notes: string): Promise<void>;
  addDocument(id: string, input: Omit<AdmissionDocument, "id" | "uploadedAt">): Promise<void>;
  refresh(): Promise<void>;
}
export const AdmissionsContext = createContext<AdmissionsValue | null>(null);
export function useAdmissions() { const value = useContext(AdmissionsContext); if (!value) throw new Error("useAdmissions must be used within AdmissionsProvider"); return value; }
