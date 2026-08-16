"use client";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/currency";
import { useFinance } from "./finance-context";
import { FinanceNavigation } from "./components/finance-navigation";
import { ReceiptPreview } from "./components/receipt-preview";
export function ReceiptsScreen(){const {state}=useFinance();const [receiptId,setReceiptId]=useState("");const receipt=state.receipts.find((item)=>item.id===receiptId);return <><PageHeader title="Receipts" description="View, print and send professional payment receipts."/><FinanceNavigation/>{receipt&&<SectionCard title="Receipt preview"><div className="p-5"><ReceiptPreview receipt={receipt}/></div></SectionCard>}<SectionCard title="Issued receipts"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Receipt","Student","Payer","Invoice","Amount","Method","Date","Reference","Status","Action"].map((item)=><th key={item} className="px-4 py-3 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y">{state.receipts.map((item)=><tr key={item.id}><td className="px-4 py-3 font-medium">{item.receiptNumber}</td><td className="px-4 py-3">{item.student}</td><td className="px-4 py-3">{item.parentOrPayer}</td><td className="px-4 py-3">{item.invoiceNumber}</td><td className="px-4 py-3 font-semibold">{formatNaira(item.amount)}</td><td className="px-4 py-3">{item.paymentMethod}</td><td className="px-4 py-3">{item.paymentDate}</td><td className="px-4 py-3">{item.reference}</td><td className="px-4 py-3"><Badge tone={item.status==="Valid"?"success":"danger"}>{item.status}</Badge></td><td className="px-4 py-3"><Button variant="ghost" onClick={()=>setReceiptId(item.id)}>View</Button></td></tr>)}</tbody></table></div></SectionCard></>}
