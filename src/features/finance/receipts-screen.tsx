"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAcademics } from "@/features/academics/academics-context";
import { formatNaira } from "@/lib/currency";
import { useFinanceView } from "./use-finance-view";
import { FinanceNavigation } from "./components/finance-navigation";
import { ReceiptPreview } from "./components/receipt-preview";
import { selectedClassFromParams } from "./finance-scope";
export function ReceiptsScreen(){const {state,label}=useFinanceView();const {state:academics}=useAcademics();const params=useSearchParams();const selectedClassId=selectedClassFromParams(params);const selectedClass=academics.classes.find((item)=>item.id===selectedClassId);const receipts=state.receipts;const [receiptId,setReceiptId]=useState(params.get("receipt") ?? "");const receipt=receipts.find((item)=>item.id===receiptId);return <><PageHeader title={selectedClass?`${selectedClass.displayName} receipts`:"Receipts"} description={`View payment receipts · ${label}.`}/><FinanceNavigation/>{receipt&&<SectionCard title="Receipt preview"><div className="p-5"><ReceiptPreview receipt={receipt}/></div></SectionCard>}<SectionCard title="Issued receipts" description={`${receipts.length} receipt(s) · ${label}`}><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Receipt","Student","Payer","Invoice","Amount","Method","Date","Reference","Status","Action"].map((item)=><th key={item} className="px-4 py-3 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y">{receipts.map((item)=><ClickableTableRow key={item.id} label={`receipt ${item.receiptNumber}`} onRowClick={()=>setReceiptId(item.id)}><td className="px-4 py-3 font-medium">{item.receiptNumber}</td><td className="px-4 py-3">{item.student}</td><td className="px-4 py-3">{item.parentOrPayer}</td><td className="px-4 py-3">{item.invoiceNumber}</td><td className="px-4 py-3 font-semibold">{formatNaira(item.amount)}</td><td className="px-4 py-3">{item.paymentMethod}</td><td className="px-4 py-3">{item.paymentDate}</td><td className="px-4 py-3">{item.reference}</td><td className="px-4 py-3"><Badge tone={item.status==="Valid"?"success":"danger"}>{item.status}</Badge></td><td className="px-4 py-3"><Button variant="ghost" onClick={()=>setReceiptId(item.id)}>View</Button></td></ClickableTableRow>)}</tbody></table></div></SectionCard></>}
