"use client";
import { createContext,useContext } from "react";
import type { CheckoutInput, CheckoutResponse, DemoPaymentOutcome, FeeStructure, FinanceState, FinanceSummary, RecordExpenseInput, RecordPaymentInput } from "./finance.types";
export interface FinanceContextValue{state:FinanceState;summary:FinanceSummary;isLoading:boolean;error?:string;recordPayment:(input:RecordPaymentInput)=>Promise<string>;recordExpense:(input:RecordExpenseInput)=>Promise<void>;createFlutterwaveCheckout:(input:CheckoutInput)=>Promise<CheckoutResponse>;simulatePayment:(input:RecordPaymentInput,outcome:DemoPaymentOutcome)=>Promise<string|undefined>;createFeeStructure:(input:Omit<FeeStructure,"id"|"studentsAssigned"|"expectedRevenue">)=>Promise<void>;activateFeeStructure:(id:string)=>Promise<number>;matchTransaction:(transactionId:string,invoiceId:string)=>Promise<string>;resetDemo:()=>Promise<void>;refresh:()=>Promise<void>}
export const FinanceContext=createContext<FinanceContextValue|null>(null);
export function useFinance(){const value=useContext(FinanceContext);if(!value)throw new Error("useFinance must be used within FinanceProvider");return value}
