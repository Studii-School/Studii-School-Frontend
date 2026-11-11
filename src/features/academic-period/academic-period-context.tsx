"use client";

import { createContext, useContext } from "react";
import type { AcademicSessionRecord, AcademicTermRecord, HistoricalSessionInput, UpsertAcademicTermInput } from "./academic-period.types";

export type AcademicPeriodScope = {
  key: string;
  schoolId: string;
  academicSessionId: string;
  /** Compatibility alias. New code must use academicSessionId. */
  sessionId: string;
  termId: string;
  academicSession?: string;
  term?: string;
  startDate?: string;
  endDate?: string;
  requireStartDate: boolean;
  isReady: boolean;
  hasBackendIds: boolean;
  isCurrentPeriod: boolean;
};

export type AcademicPeriodContextValue = {
  sessions: AcademicSessionRecord[];
  terms: AcademicTermRecord[];
  sessionId: string;
  termId: string;
  selectedSession?: AcademicSessionRecord;
  selectedTerm?: AcademicTermRecord;
  scope: AcademicPeriodScope;
  setSessionId: (value: string) => void;
  setTermId: (value: string) => void;
  refresh: () => Promise<void>;
  importHistory: (sessions: HistoricalSessionInput[]) => Promise<{ importedSessions: number; importedTerms: number }>;
  upsertTerm: (input: UpsertAcademicTermInput) => Promise<{ session: AcademicSessionRecord; term: AcademicTermRecord }>;
  markTermEnded: (sessionId: string, termId: string, endDate: string) => Promise<void>;
  isLoading: boolean;
  error: string;
};

export const AcademicPeriodContext = createContext<AcademicPeriodContextValue | null>(null);

export function useAcademicPeriod() {
  const context = useContext(AcademicPeriodContext);
  if (!context) throw new Error("useAcademicPeriod must be used within AcademicPeriodProvider");
  return context;
}

export function useAcademicPeriodScope() {
  return useAcademicPeriod().scope;
}
