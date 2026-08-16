"use client";
import { formatNaira } from "@/lib/currency";
import { useFinance } from "../finance-context";
export function CollectionProgress(){const {summary}=useFinance();return <div className="p-5"><div className="flex items-end justify-between"><div><p className="text-3xl font-bold">{summary.collectionRate}%</p><p className="mt-1 text-xs text-muted">{formatNaira(summary.amountCollected)} collected</p></div><p className="text-xs text-muted">Target {formatNaira(summary.totalExpected)}</p></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-[var(--school-secondary)]" style={{width:`${Math.min(100,summary.collectionRate)}%`}}/></div></div>}
