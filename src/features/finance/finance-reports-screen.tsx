"use client";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/currency";
import { useFinance } from "./finance-context";
import { FinanceNavigation } from "./components/finance-navigation";
export function FinanceReportsScreen(){const {summary}=useFinance();const reports=[{name:"Term collection report",detail:`${formatNaira(summary.amountCollected)} collected`},{name:"Outstanding balances report",detail:`${formatNaira(summary.outstandingAmount)} outstanding`},{name:"Payment methods report",detail:"Grouped by channel"},{name:"Reconciliation audit",detail:`${summary.reconciliationRate}% matched`}];return <><PageHeader title="Finance Reports" description="Download concise collection and reconciliation summaries."/><FinanceNavigation/><SectionCard title="Available reports"><div className="divide-y px-5">{reports.map((report)=><div key={report.name} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-semibold">{report.name}</p><p className="text-xs text-muted">{report.detail}</p></div><Button variant="outline"><Download size={15}/>Download</Button></div>)}</div></SectionCard></>}
