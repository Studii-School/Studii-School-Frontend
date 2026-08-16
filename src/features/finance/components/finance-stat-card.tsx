"use client";
import { BadgeCent,ChartNoAxesCombined,Landmark,WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatNaira } from "@/lib/currency";
import { useFinance } from "../finance-context";
export function FinanceStatGrid(){const {summary,isLoading}=useFinance();const items=[{label:"Total expected",value:formatNaira(summary.totalExpected),icon:Landmark},{label:"Amount collected",value:formatNaira(summary.amountCollected),icon:BadgeCent},{label:"Outstanding",value:formatNaira(summary.outstandingAmount),icon:WalletCards},{label:"Collection rate",value:`${summary.collectionRate}%`,icon:ChartNoAxesCombined}];return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(({label,value,icon:Icon})=><Card key={label} className="p-4"><div className="flex justify-between"><div><p className="text-sm text-muted">{label}</p><p className="mt-2 text-xl font-bold">{isLoading?"—":value}</p><p className="mt-2 text-xs text-muted">First Term · 2026/2027</p></div><span className="h-fit rounded-[10px] bg-[color-mix(in_srgb,var(--school-primary)_12%,white)] p-2 text-[var(--school-primary)]"><Icon size={18}/></span></div></Card>)}</div>}
