"use client";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useFinance } from "./finance-context";
import { ReceiptPreview } from "./components/receipt-preview";
export function ReceiptPageContent({id}:{id:string}){const {allState:state,isLoading}=useFinance();const receipt=state.receipts.find((item)=>item.id===id);if(isLoading)return <p className="text-sm text-muted">Loading receipt…</p>;if(!receipt)return <EmptyState title="Receipt not found" description="No receipt with this reference is available for your account."/>;return <><PageHeader title="Payment Receipt" description={receipt.receiptNumber} backFallback="/parent/payments"/><ReceiptPreview receipt={receipt}/></>}
