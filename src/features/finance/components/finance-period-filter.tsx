"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFinancePeriodScope } from "../use-finance-period-scope";
import { hasPeriodScope } from "../finance-scope";
import { Select } from "@/components/ui/select";

export function FinancePeriodFilter() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const period = useFinancePeriodScope();
  return <div className="finance-period-filter mb-5 flex flex-wrap items-center gap-3 text-sm">
    <span className="font-medium">Finance period</span>
    <Select className="w-72 max-w-full" label="Finance period" value={params.get("financePeriod") !== "all" && hasPeriodScope(period) ? "term" : "all"} onChange={(value) => {
      const next = new URLSearchParams(params.toString());
      if (value === "all") next.set("financePeriod", "all");
      else next.delete("financePeriod");
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    }} options={[{ value: "term", label: `Active term: ${period.term} · ${period.academicSession}`, disabled: !hasPeriodScope(period) }, { value: "all", label: "All terms" }]}/>
    <span className="text-xs text-muted">Payments follow the term of their invoice.</span>
  </div>;
}
