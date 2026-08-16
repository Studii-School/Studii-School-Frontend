"use client";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { useFinance } from "./finance-context";
import { PaymentTable } from "./components/payment-table";
export function ParentHistoryScreen(){const {state}=useFinance();const invoices=state.invoices.filter((item)=>item.parentId==="parent-aisha");return <><PageHeader title="Payment History" description="Successful and attempted demo payments for your family."/><SectionCard title="All payments"><PaymentTable payments={state.payments.filter((item)=>invoices.some((invoice)=>invoice.id===item.invoiceId))}/></SectionCard></>}
