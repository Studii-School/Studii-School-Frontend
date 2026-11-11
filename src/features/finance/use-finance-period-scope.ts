"use client";

import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { academicTermLabel } from "@/features/academic-period/academic-period.types";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import type { FinancePeriodScope } from "./finance-scope";

export function useFinancePeriodScope(): FinancePeriodScope {
  const { selectedSession, selectedTerm } = useAcademicPeriod();
  const { settings } = useSchoolSettings();
  return {
    academicSessionId: selectedSession?.id,
    termId: selectedTerm?.id,
    academicSession: selectedSession?.name || settings.currentAcademicSession,
    term: selectedTerm ? academicTermLabel(selectedTerm.name) : settings.currentTerm,
    startDate: selectedTerm?.startDate || settings.resumptionDate,
    endDate: selectedTerm?.endDate || settings.closingDate,
    requireStartDate: Boolean(selectedTerm),
  };
}
