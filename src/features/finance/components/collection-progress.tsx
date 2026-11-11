"use client";
import { formatNaira } from "@/lib/currency";
import { useFinance } from "../finance-context";
import { summarizeFinanceState } from "../finance-scope";

export function CollectionProgress() {
  const { allState } = useFinance();
  const { totalExpected, amountCollected, collectionRate } = summarizeFinanceState(allState);
  return <div className="p-5"><div className="flex items-end justify-between"><div><p className="text-3xl font-bold">{collectionRate}%</p><p className="mt-1 text-xs text-muted">{formatNaira(amountCollected)} collected · All terms</p></div><p className="text-xs text-muted">Target {formatNaira(totalExpected)}</p></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-[var(--school-secondary)]" style={{ width: `${Math.min(100, collectionRate)}%` }} /></div></div>;
}
