"use client";

import { useMemo, useState } from "react";
import { Banknote, CalendarDays, CheckCircle2, Clock3, Printer, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNaira } from "@/lib/currency";
import { readStoredUser } from "@/lib/auth";
import { useFinance } from "./finance-context";
import type { StaffFinanceEntry } from "./finance.types";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00`));
}

function entryMonth(entry: StaffFinanceEntry) {
  return entry.payrollPeriod ?? entry.dueDate?.slice(0, 7) ?? entry.paidAt?.slice(0, 7) ?? entry.createdAt?.slice(0, 7) ?? "";
}

function payStatus(entry?: StaffFinanceEntry) {
  if (!entry) return { label: "Not prepared", tone: "neutral" as const, detail: "The school has not prepared a salary record for this month." };
  if (entry.status === "PAID") return { label: "Paid", tone: "success" as const, detail: "The school has recorded this salary payment." };
  if (entry.status === "BEING_PAID") return { label: "Processing", tone: "warning" as const, detail: "Your salary payment is being processed." };
  return { label: "Awaiting payment", tone: "warning" as const, detail: "Your salary is prepared and awaiting payment by the school." };
}

export function TeacherFinanceScreen() {
  const { allState, source, isLoading: loading } = useFinance();
  const userId = readStoredUser()?.id;
  const entries = useMemo(() => source === "api" ? allState.staffFinanceEntries : allState.staffFinanceEntries.filter((entry) => entry.staffUserId === userId), [allState.staffFinanceEntries, source, userId]);
  const [month, setMonth] = useState(currentMonth);

  const months = useMemo(() => [...new Set([currentMonth(), ...entries.map(entryMonth).filter(Boolean)])].sort().reverse(), [entries]);
  const monthEntries = entries.filter((entry) => entryMonth(entry) === month);
  const salary = monthEntries.find((entry) => entry.type === "SALARY");
  const bonuses = monthEntries.filter((entry) => entry.type === "BONUS");
  const deductions = monthEntries.filter((entry) => entry.type === "DEDUCTION");
  const bonusTotal = bonuses.reduce((sum, entry) => sum + entry.amount, 0);
  const deductionTotal = deductions.reduce((sum, entry) => sum + entry.amount, 0);
  const netPay = Math.max(0, (salary?.amount ?? 0) - deductionTotal);
  const status = payStatus(salary);
  const paidMonths = months.filter((value) => entries.some((entry) => entryMonth(entry) === value && entry.type === "SALARY" && entry.status === "PAID")).length;

  return <div className="space-y-6">
    <PageHeader title="My salary" description="Check your monthly pay, payment status and payslip." />

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <Card className="overflow-hidden rounded-2xl border-0 bg-[var(--school-primary)] p-6 text-[var(--school-primary-foreground)] shadow-sm sm:p-7">
        <div className="flex items-center gap-2 text-sm opacity-90"><Banknote size={17} /> My pay for {monthLabel(month)}</div>
        <p className="mt-4 text-sm opacity-85">Expected take home</p>
        <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{loading ? "Loading..." : salary ? formatNaira(netPay) : "—"}</p>
        <p className="mt-4 max-w-md text-sm opacity-90">{loading ? "Loading your payroll records." : status.detail}</p>
      </Card>
      <Card className="flex flex-col justify-between rounded-2xl p-6">
        <div><div className="flex items-center gap-2 text-sm text-muted"><CalendarDays size={16} /> Payroll month</div>
          <select aria-label="Payroll month" className="mt-3 w-full rounded-lg border bg-surface px-3 py-2 font-semibold" value={month} onChange={(event) => setMonth(event.target.value)}>{months.map((value) => <option key={value} value={value}>{monthLabel(value)}</option>)}</select>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4"><span className="text-sm text-muted">Payment status</span><Badge tone={status.tone}>{status.label}</Badge></div>
      </Card>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="rounded-xl p-5"><p className="text-sm text-muted">Base salary</p><p className="mt-2 text-xl font-bold">{salary ? formatNaira(salary.amount) : "—"}</p></Card>
      <Card className="rounded-xl p-5"><p className="text-sm text-muted">Other payments</p><p className="mt-2 text-xl font-bold">{salary ? formatNaira(bonusTotal) : "—"}</p><p className="mt-1 text-xs text-muted">Recorded separately from salary</p></Card>
      <Card className="rounded-xl p-5"><p className="text-sm text-muted">Deductions</p><p className="mt-2 text-xl font-bold">{salary ? formatNaira(deductionTotal) : "—"}</p></Card>
    </div>

    <Card id="staff-payslip" className="rounded-2xl p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3"><ReceiptText className="mt-0.5 text-[var(--school-primary)]" size={21} /><div><h2 className="text-lg font-semibold">Payslip · {monthLabel(month)}</h2><p className="mt-1 text-sm text-muted">A clear breakdown of this month&apos;s salary.</p></div></div>
        <Button className="payslip-hide" variant="outline" disabled={!salary} onClick={() => window.print()}><Printer size={16} /> Print or save PDF</Button>
      </div>
      {salary ? <>
        <div className="mt-6 divide-y border-y text-sm">
          <div className="flex justify-between gap-3 py-3"><span>Base salary</span><strong>{formatNaira(salary.amount)}</strong></div>
          {deductions.map((entry) => <div key={entry.id} className="flex justify-between gap-3 py-3"><span>{entry.title}</span><strong>− {formatNaira(entry.amount)}</strong></div>)}
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-muted">Net salary</p><p className="mt-1 text-2xl font-bold">{formatNaira(netPay)}</p></div><Badge tone={status.tone}>{status.label}</Badge></div>
        {bonuses.length > 0 && <div className="mt-5 border-t pt-4"><p className="text-sm font-semibold">Other payments</p>{bonuses.map((entry) => <div key={entry.id} className="mt-2 flex justify-between gap-3 text-sm"><span>{entry.title}</span><strong>{formatNaira(entry.amount)}</strong></div>)}</div>}
        {salary.status === "PAID" && <div className="mt-5 grid gap-2 rounded-xl bg-surface-muted p-4 text-sm sm:grid-cols-2"><p><span className="text-muted">Paid on:</span> {salary.paidAt || "Date not recorded"}</p><p><span className="text-muted">Method:</span> {salary.paymentMethod || "Not recorded"}</p><p className="sm:col-span-2"><span className="text-muted">Reference:</span> {salary.paymentReference || "Not recorded"}</p></div>}
      </> : <div className="mt-6 rounded-xl bg-surface-muted p-6 text-sm text-muted">No payslip has been prepared for {monthLabel(month)}. It will appear here when the school prepares payroll.</div>}
    </Card>

    <Card className="rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-success" /><h2 className="font-semibold">Payment history</h2></div>
      <p className="mt-1 text-sm text-muted">{paidMonths ? `${paidMonths} month${paidMonths === 1 ? "" : "s"} marked paid` : "Your recorded salary payments will appear here."}</p>
      <div className="mt-4 divide-y">{months.filter((value) => entries.some((entry) => entryMonth(entry) === value && entry.type === "SALARY")).map((value) => {
        const item = entries.find((entry) => entryMonth(entry) === value && entry.type === "SALARY")!;
        const state = payStatus(item);
        return <button key={value} type="button" onClick={() => setMonth(value)} className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm hover:text-[var(--school-primary)]"><span className="flex items-center gap-2"><Clock3 size={16} />{monthLabel(value)}</span><span className="flex items-center gap-3"><strong>{formatNaira(item.amount)}</strong><Badge tone={state.tone}>{state.label}</Badge></span></button>;
      })}</div>
    </Card>
  </div>;
}
