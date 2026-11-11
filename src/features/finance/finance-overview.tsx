"use client";

import { BadgeCent, ChartNoAxesCombined, Landmark, WalletCards } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Card } from "@/components/ui/card";
import { formatNaira } from "@/lib/currency";
import { useAcademics } from "@/features/academics/academics-context";
import { FinanceNavigation } from "./components/finance-navigation";
import { PaymentTable } from "./components/payment-table";
import { selectedClassFromParams } from "./finance-scope";
import { useFinanceView } from "./use-finance-view";

export function FinanceOverview() {
  const { state, summary, label } = useFinanceView();
  const { state: academics } = useAcademics();
  const selectedClassId = selectedClassFromParams(useSearchParams());
  const selectedClass = academics.classes.find((item) => item.id === selectedClassId);
  const payments = state.payments;
  const { totalExpected, amountCollected, outstandingAmount: outstanding, collectionRate } = summary;
  const scope = selectedClass ? `${selectedClass.displayName} student finance` : "Student finance";
  const stats = [
    { label: "Total expected", value: formatNaira(totalExpected), icon: Landmark },
    { label: "Amount collected", value: formatNaira(amountCollected), icon: BadgeCent },
    { label: "Outstanding", value: formatNaira(outstanding), icon: WalletCards },
    { label: "Collection rate", value: `${collectionRate}%`, icon: ChartNoAxesCombined },
  ];

  return <>
    <PageHeader
      title={scope}
      description={`Fee collection, outstanding balances and recent student payments · ${label}.`}
      showBack={Boolean(selectedClass)}
      backFallback="/admin/finance/students"
    />
    <FinanceNavigation />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="p-4">
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-2 text-xl font-bold">{value}</p>
            </div>
            <span className="h-fit rounded-[8px] bg-[color-mix(in_srgb,var(--school-primary)_12%,white)] p-2 text-[var(--school-primary)]">
              <Icon size={18} />
            </span>
          </div>
        </Card>
      ))}
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <SectionCard title="Collection progress" description={`${amountCollected ? formatNaira(amountCollected) : "No payments"} collected`}>
        <div className="p-5">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold">{collectionRate}%</p>
            <p className="text-xs text-muted">Target {formatNaira(totalExpected)}</p>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-[var(--school-secondary)]" style={{ width: `${Math.min(100, collectionRate)}%` }} />
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Recent payments" description={`${payments.length} payment record(s)`}>
        <PaymentTable payments={payments.slice(0, 5)} />
      </SectionCard>
    </div>
  </>;
}
