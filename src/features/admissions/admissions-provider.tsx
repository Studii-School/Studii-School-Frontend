"use client";
/* eslint-disable react-hooks/set-state-in-effect -- browser repository hydration */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdmissionsContext } from "./admissions-context";
import { ADMISSIONS_FORM_STORAGE_KEY, ADMISSIONS_STORAGE_KEY, admissionsRepository, defaultAdmissionFormConfig } from "./admissions.repository";
import type { AdmissionApplication, AdmissionDocument, AdmissionFormConfig, AdmissionInput, AdmissionStatus } from "./admissions.types";
export function AdmissionsProvider({ children }: { children: React.ReactNode }) {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]), [isLoading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState<AdmissionFormConfig>(defaultAdmissionFormConfig);
  const refresh = useCallback(async () => { const [items, config] = await Promise.all([admissionsRepository.getAll(), admissionsRepository.getFormConfig()]); setApplications(items); setFormConfig(config); setLoading(false); }, []);
  useEffect(() => { void refresh(); const sync = (event: StorageEvent) => { if (event.key === ADMISSIONS_STORAGE_KEY || event.key === ADMISSIONS_FORM_STORAGE_KEY) void refresh(); }; window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, [refresh]);
  const create = useCallback(async (input: AdmissionInput) => { const item = await admissionsRepository.create(input); await refresh(); return item; }, [refresh]);
  const saveFormConfig = useCallback(async (config: AdmissionFormConfig) => { await admissionsRepository.saveFormConfig(config); await refresh(); }, [refresh]);
  const updateStatus = useCallback(async (id: string, status: AdmissionStatus, note?: string, studentId?: string) => { await admissionsRepository.updateStatus(id, status, note, studentId); await refresh(); }, [refresh]);
  const updateInterview = useCallback(async (id: string, date: string, outcome: string, notes: string) => { await admissionsRepository.updateInterview(id, date, outcome, notes); await refresh(); }, [refresh]);
  const addDocument = useCallback(async (id: string, input: Omit<AdmissionDocument, "id" | "uploadedAt">) => { await admissionsRepository.addDocument(id, input); await refresh(); }, [refresh]);
  const value = useMemo(() => ({ applications, formConfig, isLoading, create, saveFormConfig, updateStatus, updateInterview, addDocument, refresh }), [applications, formConfig, isLoading, create, saveFormConfig, updateStatus, updateInterview, addDocument, refresh]);
  return <AdmissionsContext.Provider value={value}>{children}</AdmissionsContext.Provider>;
}
