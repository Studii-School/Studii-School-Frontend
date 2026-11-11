"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useFinance } from "./finance-context";
import { selectFinanceView, summarizeFinanceState } from "./finance-scope";
import { useFinancePeriodScope } from "./use-finance-period-scope";

// Accounting defaults to the complete ledger. A term filter is always explicit
// and travels with the class when moving between finance sections.
export function useFinanceView() {
  const { allState } = useFinance();
  const params = useSearchParams();
  const period = useFinancePeriodScope();
  const selectedTermOnly = params.get("financePeriod") === "term";
  const classId = params.get("classId");
  const state = useMemo(() => selectFinanceView(allState, selectedTermOnly ? period : undefined, classId), [allState, selectedTermOnly, period, classId]);
  const summary = useMemo(() => summarizeFinanceState(state), [state]);
  const label = selectedTermOnly ? `${period.term} · ${period.academicSession}` : "All terms";
  return { state, summary, label, selectedTermOnly, period };
}
