"use client";

import { BadgeCent, ChartNoAxesCombined, Landmark, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BrandIcon, type BrandTone } from "@/components/ui/brand-icon";
import { formatNaira } from "@/lib/currency";
import { useFinance } from "../finance-context";
import { summarizeFinanceState } from "../finance-scope";

export function FinanceStatGrid() {
  const { allState, isLoading } = useFinance();
  const { totalExpected, amountCollected, outstandingAmount, collectionRate } = summarizeFinanceState(allState);
  const items = [
    { label: "Total expected", value: formatNaira(totalExpected), icon: Landmark, tone: "primary" },
    { label: "Amount collected", value: formatNaira(amountCollected), icon: BadgeCent, tone: "secondary" },
    { label: "Outstanding", value: formatNaira(outstandingAmount), icon: WalletCards, tone: "accent" },
    { label: "Collection rate", value: `${collectionRate}%`, icon: ChartNoAxesCombined, tone: "secondary" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <Card key={label} className="p-4 shadow-sm">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-2 text-xl font-bold">{isLoading ? "-" : value}</p>
              <p className="mt-2 text-xs text-muted">All terms</p>
            </div>
            <BrandIcon tone={tone as BrandTone} className="size-10 rounded-xl">
              <Icon size={18} />
            </BrandIcon>
          </div>
        </Card>
      ))}
    </div>
  );
}
