"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFinancePeriodScope } from "../use-finance-period-scope";
import { Select } from "@/components/ui/select";

export function FinancePeriodFilter() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const period = useFinancePeriodScope();
  return <div className="finance-period-filter mb-5 flex flex-wrap items-center gap-3 text-sm">
    <span className="font-medium">Finance period</span>
    <Select className="w-72 max-w-full" label="Finance period" value={params.get("financePeriod") === "term" ? "term" : "all"} onChange={(value) => {
      const next = new URLSearchParams(params.toString());
      if (value === "term") next.set("financePeriod", "term");
      else next.delete("financePeriod");
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    }} options={[{ value: "all", label: "All terms" }, { value: "term", label: `Selected term: ${period.term} · ${period.academicSession}` }]}/>
    <span className="text-xs text-muted">Payments follow the term of their invoice.</span>
  </div>;
}
