"use client";
/* eslint-disable react-hooks/set-state-in-effect -- repository hydration resolves asynchronously and storage events reuse the same refresh path. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readStoredToken } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
import { financeApi } from "./finance.api";
import { financeRepository } from "./finance.repository";
import { FinanceContext } from "./finance-context";
import type { CheckoutInput, DemoPaymentOutcome, FeeStructure, FinanceState, FinanceSummary, RecordExpenseInput, RecordPaymentInput } from "./finance.types";
import { FINANCE_STORAGE_KEY, emptyFinanceState } from "./finance.storage";
import { useAcademicPeriodScope } from "@/features/academic-period/academic-period-context";
import { filterFinanceStateByPeriod, summarizeFinanceState } from "./finance-scope";

const emptySummary: FinanceSummary = {
  totalExpected: 0,
  amountCollected: 0,
  outstandingAmount: 0,
  collectionRate: 0,
  transactionCount: 0,
  reconciliationRate: 0,
  needsReview: 0,
  totalExpenses: 0,
  currentBalance: 0,
};

async function loadFinanceData() {
  if (!readStoredToken()) {
    return { state: await financeRepository.getState(), source: "local" as const };
  }
  if (readStoredUser()?.role === "SUPER_ADMIN" || readStoredUser()?.features?.finance === false) {
    return { state: emptyFinanceState, source: "api" as const };
  }
  // Teachers use their dedicated, authorized payroll endpoint.
  if (readStoredUser()?.role === "TEACHER") {
    const result = await financeApi.getTeacherFinance();
    return { state: { ...emptyFinanceState, staffFinanceEntries: result.entries ?? [] }, source: "api" as const };
  }
  // Fetch the authorized complete ledger once; term/class views derive from it.
  // An API failure must never silently replace real balances with local zeros.
  const state = await financeApi.getState();
  return { state: { ...emptyFinanceState, ...state, expenses: state.expenses ?? [], staffFinanceEntries: state.staffFinanceEntries ?? [] }, source: "api" as const };
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const period = useAcademicPeriodScope();
  const [state, setState] = useState<FinanceState>(emptyFinanceState);
  const [summary, setSummary] = useState(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<"api" | "local">("local");
  const [error, setError] = useState<string>();
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    if (!period.isReady) return;
    const version = ++requestVersion.current;
    try {
      const next = await loadFinanceData();
      if (version !== requestVersion.current) return;
      const sorted = { ...next.state, payments: [...next.state.payments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)), receipts: [...next.state.receipts].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)) };
      setState(sorted);
      setSummary(summarizeFinanceState(sorted));
      setSource(next.source);
      setError(undefined);
    } catch {
      if (version !== requestVersion.current) return;
      if (readStoredToken()) setSource("api");
      setError("Finance data could not be refreshed. Displayed balances may be out of date. Please retry before recording a payment.");
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void refresh();
    const sync = (event: StorageEvent) => {
      if (event.key === FINANCE_STORAGE_KEY) void refresh();
    };
    const revalidateWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const poll = window.setInterval(revalidateWhenVisible, 30_000);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", revalidateWhenVisible);
    document.addEventListener("visibilitychange", revalidateWhenVisible);
    return () => {
      // This counter invalidates asynchronous requests; it is not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestVersion.current++;
      window.clearInterval(poll);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", revalidateWhenVisible);
      document.removeEventListener("visibilitychange", revalidateWhenVisible);
    };
  }, [refresh]);

  const recordPayment = useCallback(async (input: RecordPaymentInput) => {
    if (isLoading || error) throw new Error(error || "Wait for finance records to load.");
    const result = source === "api" ? await financeApi.recordPayment(input) : await financeRepository.recordPayment(input);
    await refresh();
    return result.receipt.id;
  }, [refresh, source, isLoading, error]);

  const recordExpense = useCallback(async (input: RecordExpenseInput) => {
    if (source === "api") await financeApi.recordExpense(input);
    else await financeRepository.recordExpense(input);
    await refresh();
  }, [refresh, source]);

  const createFlutterwaveCheckout = useCallback(async (input: CheckoutInput) => {
    return financeApi.createCheckout(input);
  }, []);

  const simulatePayment = useCallback(async (input: RecordPaymentInput, outcome: DemoPaymentOutcome) => {
    const result = await financeRepository.simulateOnlinePayment(input, outcome);
    await refresh();
    return result.receipt?.id;
  }, [refresh]);

  const createFeeStructure = useCallback(async (input: Omit<FeeStructure, "id" | "studentsAssigned" | "expectedRevenue">) => {
    const scopedInput = { ...input, schoolId: period.schoolId, academicSessionId: period.academicSessionId, termId: period.termId };
    const created = source === "api" ? await financeApi.createFeeStructure(scopedInput) : await financeRepository.createFeeStructure(scopedInput);
    await refresh();
    return created;
  }, [period.academicSessionId, period.schoolId, period.termId, refresh, source]);

  const activateFeeStructure = useCallback(async (id: string) => {
    const result = source === "api" ? await financeApi.activateFeeStructure(id) : await financeRepository.activateFeeStructure(id);
    await refresh();
    return result.invoicesCreated;
  }, [refresh, source]);

  const updateFeeStructure = useCallback(async (id: string, input: Partial<FeeStructure>) => {
    if (source === "api") await financeApi.updateFeeStructure(id, input);
    else await financeRepository.updateFeeStructure(id, input);
    await refresh();
  }, [refresh, source]);

  const deleteFeeStructure = useCallback(async (id: string) => {
    if (source === "api") await financeApi.deleteFeeStructure(id);
    else await financeRepository.deleteFeeStructure(id);
    await refresh();
  }, [refresh, source]);

  const matchTransaction = useCallback(async (transactionId: string, invoiceId: string) => {
    if (source === "api") throw new Error("Manual reconciliation is not supported by the connected finance API.");
    const result = await financeRepository.matchTransaction(transactionId, invoiceId);
    await refresh();
    return result.receipt.id;
  }, [refresh, source]);

  const resetDemo = useCallback(async () => {
    await financeRepository.reset();
    await refresh();
  }, [refresh]);

  const scopedState = useMemo(() => filterFinanceStateByPeriod(state, period), [period, state]);
  const scopedSummary = useMemo(() => period.isReady ? summarizeFinanceState(scopedState) : summary, [period.isReady, scopedState, summary]);
  const value = useMemo(() => ({
    state: scopedState,
    allState: state,
    source,
    allFeeStructures: state.feeStructures,
    summary: scopedSummary,
    isLoading,
    error,
    recordPayment,
    recordExpense,
    createFlutterwaveCheckout,
    simulatePayment,
    createFeeStructure,
    activateFeeStructure,
    updateFeeStructure,
    deleteFeeStructure,
    matchTransaction,
    resetDemo,
    refresh,
  }), [state, source, scopedState, scopedSummary, isLoading, error, recordPayment, recordExpense, createFlutterwaveCheckout, simulatePayment, createFeeStructure, activateFeeStructure, updateFeeStructure, deleteFeeStructure, matchTransaction, resetDemo, refresh]);

  return <FinanceContext.Provider value={value}>{error && <div role="alert" className="border-b border-warning bg-surface p-3 text-sm">{error} <button className="font-semibold underline" onClick={() => void refresh()}>Retry finance</button></div>}{children}</FinanceContext.Provider>;
}
