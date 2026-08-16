"use client";
/* eslint-disable react-hooks/set-state-in-effect -- repository hydration resolves asynchronously and storage events reuse the same refresh path. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { financeApi } from "./finance.api";
import { financeRepository } from "./finance.repository";
import { FinanceContext } from "./finance-context";
import type { CheckoutInput, DemoPaymentOutcome, FeeStructure, FinanceState, FinanceSummary, RecordExpenseInput, RecordPaymentInput } from "./finance.types";
import { FINANCE_STORAGE_KEY, emptyFinanceState } from "./finance.storage";

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
  try {
    const [state, summary] = await Promise.all([financeApi.getState(), financeApi.getSummary()]);
    return { state: { ...state, expenses: state.expenses ?? [] }, summary, source: "api" as const };
  } catch {
    const [state, summary] = await Promise.all([financeRepository.getState(), financeRepository.getFinanceSummary()]);
    return { state, summary, source: "local" as const };
  }
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FinanceState>(emptyFinanceState);
  const [summary, setSummary] = useState(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<"api" | "local">("local");
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      const next = await loadFinanceData();
      setState(next.state);
      setSummary({ ...emptySummary, ...next.summary });
      setSource(next.source);
      setError(next.source === "local" ? "Using local finance data until the backend is available." : undefined);
    } catch {
      setError("Finance data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const sync = (event: StorageEvent) => {
      if (event.key === FINANCE_STORAGE_KEY) void refresh();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [refresh]);

  const recordPayment = useCallback(async (input: RecordPaymentInput) => {
    const result = source === "api" ? await financeApi.recordPayment(input) : await financeRepository.recordPayment(input);
    await refresh();
    return result.receipt.id;
  }, [refresh, source]);

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
    if (source === "api") await financeApi.createFeeStructure(input);
    else await financeRepository.createFeeStructure(input);
    await refresh();
  }, [refresh, source]);

  const activateFeeStructure = useCallback(async (id: string) => {
    const result = source === "api" ? await financeApi.activateFeeStructure(id) : await financeRepository.activateFeeStructure(id);
    await refresh();
    return result.invoicesCreated;
  }, [refresh, source]);

  const matchTransaction = useCallback(async (transactionId: string, invoiceId: string) => {
    const result = await financeRepository.matchTransaction(transactionId, invoiceId);
    await refresh();
    return result.receipt.id;
  }, [refresh]);

  const resetDemo = useCallback(async () => {
    await financeRepository.reset();
    await refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    state,
    summary,
    isLoading,
    error,
    recordPayment,
    recordExpense,
    createFlutterwaveCheckout,
    simulatePayment,
    createFeeStructure,
    activateFeeStructure,
    matchTransaction,
    resetDemo,
    refresh,
  }), [state, summary, isLoading, error, recordPayment, recordExpense, createFlutterwaveCheckout, simulatePayment, createFeeStructure, activateFeeStructure, matchTransaction, resetDemo, refresh]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
