"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFinancePeriodScope } from "../use-finance-period-scope";

export function FinancePeriodFilter() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const period = useFinancePeriodScope();
  return <label className="mb-5 flex flex-wrap items-center gap-3 text-sm">
    <span className="font-medium">Finance period</span>
    <select aria-label="Finance period" className="rounded-lg border bg-surface px-3 py-2" value={params.get("financePeriod") === "term" ? "term" : "all"} onChange={(event) => {
      const next = new URLSearchParams(params.toString());
      if (event.target.value === "term") next.set("financePeriod", "term");
      else next.delete("financePeriod");
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    }}>
      <option value="all">All terms</option>
      <option value="term">Selected term: {period.term} · {period.academicSession}</option>
    </select>
    <span className="text-xs text-muted">Payments follow the term of their invoice.</span>
  </label>;
}
