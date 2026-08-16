import { readStoredJson,removeStoredValue,writeStoredJson } from "@/lib/storage";
import type { FinanceState } from "./finance.types";
export const FINANCE_STORAGE_KEY="schoolos.finance-demo.v1";
export const emptyFinanceState:FinanceState={feeStructures:[],invoices:[],payments:[],receipts:[],expenses:[],reconciliationTransactions:[],paymentPlans:[],activity:[]};
const cloneDefaults=():FinanceState=>structuredClone(emptyFinanceState);
export async function getFinanceState(){return readStoredJson(FINANCE_STORAGE_KEY,cloneDefaults())}
export async function saveFinanceState(state:FinanceState){writeStoredJson(FINANCE_STORAGE_KEY,state);return state}
export async function resetFinanceState(){removeStoredValue(FINANCE_STORAGE_KEY);return cloneDefaults()}
