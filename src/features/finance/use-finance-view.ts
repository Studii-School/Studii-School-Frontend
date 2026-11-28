"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useFinance } from "./finance-context";
import { hasPeriodScope, selectFinanceView, summarizeFinanceState } from "./finance-scope";
import { useFinancePeriodScope } from "./use-finance-period-scope";

export function useFinanceView() {
  const { allState } = useFinance();
  const params = useSearchParams();
  const period = useFinancePeriodScope();
  const selectedTermOnly = params.get("financePeriod") !== "all" && hasPeriodScope(period);
  const classId = params.get("classId");
  const state = useMemo(() => selectFinanceView(allState, selectedTermOnly ? period : undefined, classId), [allState, selectedTermOnly, period, classId]);
  const summary = useMemo(() => summarizeFinanceState(state), [state]);
  const label = selectedTermOnly ? `${period.term} · ${period.academicSession}` : "All terms";
  return { state, summary, label, selectedTermOnly, period };
}
