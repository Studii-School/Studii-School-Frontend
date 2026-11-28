"use client";
/* eslint-disable react-hooks/set-state-in-effect -- payroll is hydrated by an asynchronous API request. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { ButtonTabs } from "@/components/ui/tabs";
import { SectionCard } from "@/components/dashboard/section-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademics } from "@/features/academics/academics-context";
import { PersonNameLink } from "@/features/people/person-name-link";
import { formatNaira } from "@/lib/currency";
import { formatDate } from "@/lib/date-utils";
import { readStoredToken } from "@/lib/api";
import { financeApi } from "./finance.api";
import { financeRepository } from "./finance.repository";
import type { CreateStaffFinanceEntryInput, StaffFinanceEntry, StaffFinanceEntryType, StaffFinanceRow } from "./finance.types";

type Tab = "Payroll" | "Other staff payments";
const staffEntryTypes: Array<{ value: StaffFinanceEntryType; label: string }> = [
  { value: "BONUS", label: "Bonus" }, { value: "FINE", label: "Fine" },
  { value: "REQUIRED_PAYMENT", label: "Required payment" }, { value: "OTHER_PAYMENT", label: "Other payment" },
];

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function lastDay(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return "not set";
  return `${period}-${String(new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0).getDate()).padStart(2, "0")}`;
}

function statusLabel(status: StaffFinanceEntry["status"]) {
  return status === "PAID" ? "Paid" : status === "BEING_PAID" ? "In progress" : status === "PENDING" ? "Pending" : "Not paid";
}

function statusTone(status: StaffFinanceEntry["status"]): "success" | "warning" | "danger" | "neutral" {
  return status === "PAID" ? "success" : status === "BEING_PAID" || status === "PENDING" ? "warning" : "danger";
}

function entriesForPeriod(entries: StaffFinanceEntry[], period: string) {
  return entries.filter((entry) => (entry.payrollPeriod ?? entry.dueDate?.slice(0, 7)) === period);
}

function normaliseRows(value: unknown, salaryByUser: Map<string, number>): StaffFinanceRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as StaffFinanceRow & { teacherId?: string; teacherName?: string };
    const staffUserId = row.staffUserId ?? row.teacherId;
    if (!staffUserId) return [];
    return [{ ...row, staffUserId, staffName: row.staffName ?? row.teacherName ?? "Staff member",
      entries: Array.isArray(row.entries) ? row.entries : [],
      salaryAmount: salaryByUser.get(staffUserId) ?? Number(row.salaryAmount ?? 0),
    }];
  });
}

export function TeacherFinanceAdminScreen() {
  const { toast } = useActionFeedback();
  const { state: academics } = useAcademics();
  const salaryByUser = useMemo(() => new Map(academics.staff.filter((staff) => (staff.salaryAmount ?? 0) > 0).map((staff) => [staff.userId, staff.salaryAmount!])), [academics.staff]);
  const [rows, setRows] = useState<StaffFinanceRow[]>([]);
  const [coveredStaffIds, setCoveredStaffIds] = useState<string[]>([]);
  const [period, setPeriod] = useState(currentPeriod);
  const [tab, setTab] = useState<Tab>("Payroll");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [source, setSource] = useState<"api" | "local">("local");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState<"deduction" | "other" | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [entryType, setEntryType] = useState<StaffFinanceEntryType>("DEDUCTION");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paying, setPaying] = useState<StaffFinanceEntry | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Bank transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [salaryOverrides, setSalaryOverrides] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const online = Boolean(readStoredToken());
      const data = online ? await financeApi.getAdminTeacherFinance() : await financeRepository.getAdminStaffFinance();
      const financeRows = normaliseRows(data?.staff?.length ? data.staff : data?.teachers, salaryByUser);
      const byId = new Map(financeRows.map((row) => [row.staffUserId, row]));
      setCoveredStaffIds(financeRows.map((row) => row.staffUserId));
      const directoryRows: StaffFinanceRow[] = academics.staff.map((staff) => ({
        ...byId.get(staff.userId), staffUserId: staff.userId, staffName: staff.fullName,
        employeeNumber: staff.employeeNumber, jobTitle: staff.jobTitle,
        isTeachingStaff: staff.isTeachingStaff, salaryAmount: staff.salaryAmount ?? byId.get(staff.userId)?.salaryAmount ?? 0,
        entries: byId.get(staff.userId)?.entries ?? [],
      }));
      setRows(directoryRows.concat(financeRows.filter((row) => !academics.staff.some((staff) => staff.userId === row.staffUserId))));
      setSource(online ? "api" : "local");
      setLoadError("");
    } catch {
      setLoadError("Staff payments could not be refreshed. Retry before making changes.");
    } finally {
      setLoading(false);
    }
  }, [academics.staff, salaryByUser]);

  useEffect(() => {
    void load();
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    const interval = window.setInterval(visible, 30000);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, [load]);

  const payrollRows = useMemo(() => rows.map((staff) => {
    const currentSalary = salaryOverrides[staff.staffUserId] === undefined
      ? salaryByUser.get(staff.staffUserId) ?? staff.salaryAmount
      : Number(salaryOverrides[staff.staffUserId]) || 0;
    const payrollStaff = { ...staff, salaryAmount: currentSalary };
    const entries = entriesForPeriod(staff.entries, period);
    const salaries = entries.filter((entry) => entry.type === "SALARY");
    const salary = salaries.length ? salaries.reduce((sum, entry) => sum + entry.amount, 0) : currentSalary;
    const deductions = entries.filter((entry) => entry.type === "DEDUCTION").reduce((sum, entry) => sum + entry.amount, 0);
    return { staff: payrollStaff, entries, salary, deductions, net: Math.max(0, salary - deductions), salaryEntry: salaries[0] };
  }), [period, rows, salaryByUser, salaryOverrides]);
  const visiblePayrollRows = payrollRows.filter((row) => !query.trim() || `${row.staff.staffName} ${row.staff.jobTitle ?? ""} ${row.staff.employeeNumber ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  const payrollTotals = useMemo(() => payrollRows.reduce((total, row) => ({
    deductions: total.deductions + row.deductions,
    net: total.net + row.net,
    unpaid: total.unpaid + (row.salaryEntry && row.salaryEntry.status !== "PAID" ? 1 : 0),
  }), { deductions: 0, net: 0, unpaid: 0 }), [payrollRows]);
  const prepared = payrollRows.some((row) => Boolean(row.salaryEntry));
  const paidCount = payrollRows.filter((row) => row.salaryEntry?.status === "PAID").length;
  const eligibleCount = academics.staff.filter((staff) => staff.status === "ACTIVE" && (staff.salaryAmount ?? 0) > 0).length;
  const missingSalary = academics.staff.filter((staff) => staff.status === "ACTIVE" && !(staff.salaryAmount && staff.salaryAmount > 0));
  const uncovered = source === "api" ? academics.staff.filter((staff) => staff.status === "ACTIVE" && !coveredStaffIds.includes(staff.userId)) : [];

  const otherEntries = rows.flatMap((staff) => staff.entries.filter((entry) => entry.type !== "SALARY" && entry.type !== "DEDUCTION").map((entry) => ({ ...entry, staffName: staff.staffName })))
    .filter((entry) => !query.trim() || `${entry.staffName} ${entry.title}`.toLowerCase().includes(query.trim().toLowerCase()));

  const preparePayroll = async () => {
    if (loading || loadError) { toast(loadError || "Wait for staff payments to load.", "error"); return; }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) { toast("Choose a payroll month first.", "error"); return; }
    setSaving(true);
    try {
      const eligible = payrollRows.filter((row) => { const directoryStaff = academics.staff.find((staff) => staff.userId === row.staff.staffUserId); return directoryStaff?.status === "ACTIVE" && (directoryStaff.salaryAmount ?? 0) > 0 && row.staff.salaryAmount > 0 && !row.salaryEntry; });
      const apiResult = source === "api" ? await financeApi.preparePayrollRun(period) : undefined;
      if (source === "local") for (const row of eligible) {
        const input: CreateStaffFinanceEntryInput = {
          type: "SALARY", title: `Salary · ${period}`, amount: row.staff.salaryAmount,
          status: "YET_TO_BE_PAID", dueDate: lastDay(period), payrollPeriod: period,
        };
        await financeRepository.createStaffFinanceEntry(row.staff.staffUserId, input);
      }
      const result = { created: apiResult?.created ?? eligible.length, alreadyPrepared: apiResult?.alreadyPrepared ?? (eligible.length === 0 && payrollRows.some((row) => Boolean(row.salaryEntry))) };
      await load();
      toast(result.created ? `Payroll prepared for ${result.created} staff member(s). Review the list before recording payments.` : result.alreadyPrepared ? `Payroll for ${period} was already prepared.` : "No active staff with a configured base salary were prepared.", result.created ? "success" : "warning");
    } catch (error) {
      await load();
      toast(error instanceof Error ? error.message : "Payroll could not be prepared.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openEntryForm = (kind: "deduction" | "other", staffId = "") => {
    setShowForm(kind);
    setSelectedStaffId(staffId || rows[0]?.staffUserId || "");
    setEntryType(kind === "deduction" ? "DEDUCTION" : "BONUS");
    setTitle(kind === "deduction" ? "" : "");
    setAmount("");
    setNote("");
  };

  const saveEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || loadError) { toast(loadError || "Wait for staff payments to load.", "error"); return; }
    const parsedAmount = Number(amount);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) { toast("Choose a payroll month first.", "error"); return; }
    if (!selectedStaffId || !title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast("Choose a staff member and enter a description and amount.", "error");
      return;
    }
    if (entryType === "DEDUCTION") {
      const staff = rows.find((item) => item.staffUserId === selectedStaffId);
      const monthEntries = entriesForPeriod(staff?.entries ?? [], period);
      if (monthEntries.some((entry) => entry.type === "SALARY" && entry.status === "PAID")) {
        toast("This month’s salary has already been paid. Add the deduction to a future payroll instead.", "error");
        return;
      }
      const salaryEntry = monthEntries.find((entry) => entry.type === "SALARY");
      const grossSalary = salaryEntry?.amount ?? staff?.salaryAmount ?? 0;
      const alreadyDeducted = monthEntries.filter((entry) => entry.type === "DEDUCTION").reduce((sum, entry) => sum + entry.amount, 0);
      const remainingSalary = Math.max(0, grossSalary - alreadyDeducted);
      if (parsedAmount > remainingSalary) {
        toast(`This deduction is more than the remaining salary (${formatNaira(remainingSalary)}).`, "error");
        return;
      }
    }
    const input: CreateStaffFinanceEntryInput = {
      type: entryType, title: title.trim(), amount: parsedAmount,
      status: entryType === "DEDUCTION" ? "PENDING" : "YET_TO_BE_PAID",
      dueDate: lastDay(period), payrollPeriod: period, note: note.trim() || undefined,
    };
    setSaving(true);
    try {
      if (source === "api") await financeApi.createTeacherFinanceEntry(selectedStaffId, input);
      else await financeRepository.createStaffFinanceEntry(selectedStaffId, input);
      await load();
      setShowForm(null);
      toast(entryType === "DEDUCTION" ? "Deduction added to this payroll." : "Staff payment added.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Entry could not be saved.", "error");
    } finally { setSaving(false); }
  };

  const markPaid = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || loadError) { toast(loadError || "Wait for staff payments to load.", "error"); return; }
    if (!paying) return;
    if (!paymentReference.trim()) { toast("Add a transfer or payment reference to continue.", "error"); return; }
    setSaving(true);
    try {
      if (source === "api") await financeApi.updateAdminStaffEntry(paying.id, { status: "PAID", paymentMethod, paymentReference: paymentReference.trim() });
      else await financeRepository.updateStaffFinanceEntryStatus(paying.id, "PAID", { method: paymentMethod, reference: paymentReference.trim() });
      setPaying(null);
      setPaymentReference("");
      await load();
      toast("Payment recorded. The staff member can now see it.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Payment could not be recorded.", "error");
    } finally { setSaving(false); }
  };

  return <>
    <PageHeader title="Staff payments" description="Prepare monthly salaries, apply deductions, and track other staff payments." />
    {loadError && <div role="alert" className="mb-4 rounded-lg border p-4 text-sm">{loadError} <button className="underline" onClick={() => void load()}>Retry</button></div>}
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
      <label className="block text-sm font-medium">Payroll month<Input className="mt-1.5 max-w-56" aria-label="Payroll month" type="month" value={period} onChange={(event) => { setPeriod(event.target.value); setSalaryOverrides({}); }} /></label>
      <div className="flex flex-wrap gap-2">
        {tab === "Payroll" ? <>
          <Button variant="outline" onClick={() => openEntryForm("deduction")}><span aria-hidden="true">−</span> Add deduction</Button>
          <Button onClick={() => void preparePayroll()} disabled={saving || loading || !rows.length}>{saving ? "Preparing..." : "Prepare payroll"}</Button>
        </> : <Button onClick={() => openEntryForm("other")} disabled={!rows.length}>Add staff payment</Button>}
      </div>
    </div>
    <ButtonTabs label="Staff payments sections" items={["Payroll", "Other staff payments"] as const} value={tab} onChange={setTab} />

    {tab === "Payroll" ? <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm text-muted">{prepared ? "Prepared take-home estimate" : "Estimated take-home"}</p><p className="mt-2 text-2xl font-bold">{formatNaira(payrollTotals.net)}</p><p className="mt-1 text-xs text-muted">{prepared ? "After listed deductions" : "From base salaries before preparation"}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted">Deductions</p><p className="mt-2 text-2xl font-bold">{formatNaira(payrollTotals.deductions)}</p><p className="mt-1 text-xs text-muted">Recorded for {period}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted">Payroll status</p><p className="mt-2 text-xl font-bold">{prepared ? `${payrollTotals.unpaid} still to pay` : "Payroll not prepared"}</p><p className="mt-1 text-xs text-muted">{paidCount} payments recorded · {eligibleCount} staff with base salaries</p></Card>
      </div>
      {(missingSalary.length > 0 || uncovered.length > 0) && <div className="rounded-xl border bg-surface p-4 text-sm"><p className="font-semibold">Payroll coverage</p>{missingSalary.length > 0 && <p className="mt-1 text-muted">{missingSalary.length} active staff member(s) need a base monthly salary in Staff &amp; HR: {missingSalary.map((staff) => staff.fullName).join(", ")}.</p>}{uncovered.length > 0 && <p className="mt-1 text-muted">{uncovered.length} active staff member(s) are missing from the finance API response: {uncovered.map((staff) => staff.fullName).join(", ")}. They appear here for review; payment recording requires a finance entry returned by the API.</p>}</div>}
      <SectionCard title="Payroll list" description="Teaching and non-teaching staff from the directory. Prepared entries and payments appear when returned by Finance.">
        <div className="border-b p-4"><SearchInput value={query} onChange={setQuery} placeholder="Find a staff member" /></div>
        {loading ? <p className="p-6 text-sm text-muted">Loading staff payments…</p> : visiblePayrollRows.length ? <div className="divide-y px-4 sm:px-5">
          {visiblePayrollRows.map(({ staff, salary, deductions, net, salaryEntry, entries }) => <div key={staff.staffUserId} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0"><p className="truncate font-semibold"><PersonNameLink kind="staff" id={staff.staffUserId}>{staff.staffName}</PersonNameLink></p><p className="text-xs text-muted">{staff.jobTitle || (staff.isTeachingStaff ? "Teaching staff" : "Staff")}{staff.employeeNumber ? ` · ${staff.employeeNumber}` : ""}{` · Due ${formatDate(salaryEntry?.dueDate ?? lastDay(period))}`}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"><span>Salary <b>{formatNaira(salary)}</b></span><span className="text-muted">Deductions <b>{formatNaira(deductions)}</b></span><span className="text-success">Take home <b>{formatNaira(net)}</b></span></div>
              {!salaryEntry && source === "local" && salaryByUser.has(staff.staffUserId) && <label className="mt-3 block max-w-52 text-xs font-medium">Amount for this run (₦)<Input className="mt-1" aria-label={`Amount for this run for ${staff.staffName}`} type="number" min="0" step="0.01" inputMode="decimal" value={salaryOverrides[staff.staffUserId] ?? (staff.salaryAmount ? String(staff.salaryAmount) : "")} onChange={(event) => setSalaryOverrides((current) => ({ ...current, [staff.staffUserId]: event.target.value }))} placeholder="Enter amount" /><span className="mt-1 block font-normal text-muted">One month only. Change base salary in Staff &amp; HR.</span></label>}
              {entries.filter((entry) => entry.type === "DEDUCTION").map((entry) => <p key={entry.id} className="mt-1 text-xs text-muted">− {entry.title}: {formatNaira(entry.amount)}</p>)}
            </div>
            <div className="flex items-center gap-2">{salaryEntry ? <><Badge tone={statusTone(salaryEntry.status)}>{statusLabel(salaryEntry.status)}</Badge>{salaryEntry.status !== "PAID" && <Button className="min-h-9 px-3" onClick={() => setPaying(salaryEntry)}>Record payment</Button>}</> : <Badge tone="neutral">{academics.staff.find((item) => item.userId === staff.staffUserId)?.status !== "ACTIVE" ? "Excluded: inactive" : !staff.salaryAmount ? "Needs base salary" : source === "api" && !coveredStaffIds.includes(staff.staffUserId) ? "Missing finance entry" : "Not prepared"}</Badge>}</div>
          </div>)}
        </div> : <div className="p-7 text-center"><p className="font-medium">No staff match that search</p><p className="mt-1 text-sm text-muted">Try another name or clear the search.</p></div>}
      </SectionCard>
      {!payrollRows.some((row) => row.salaryEntry) && !loading && <p className="text-center text-sm text-muted">Choose “Prepare payroll” to create this month’s salary items. You can review the amounts first.</p>}
    </div> : <SectionCard title="Other staff payments" description="Bonuses, fines, required payments, and one-off items.">
      <div className="border-b p-4"><SearchInput value={query} onChange={setQuery} placeholder="Find a staff member or payment" /></div>
      {otherEntries.length ? <div className="divide-y px-4 sm:px-5">{otherEntries.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{entry.title}</p><p className="text-xs text-muted">{entry.staffName} · {entry.payrollPeriod ?? entry.dueDate?.slice(0, 7) ?? "No month set"}</p></div><div className="flex items-center gap-2"><b>{formatNaira(entry.amount)}</b><Badge tone={statusTone(entry.status)}>{statusLabel(entry.status)}</Badge>{entry.status !== "PAID" && <Button className="min-h-9 px-3" variant="outline" onClick={() => setPaying(entry)}>Record payment</Button>}</div></div>)}</div> : <div className="p-7 text-center"><p className="font-medium">No other payments for this search</p><p className="mt-1 text-sm text-muted">Add a bonus, fine or one-off staff payment when needed.</p></div>}
    </SectionCard>}

    <Modal open={showForm !== null} onClose={() => setShowForm(null)} title={showForm === "deduction" ? "Add payroll deduction" : "Add staff payment"} description={showForm === "deduction" ? `This will appear in ${period} payroll and reduce take-home pay.` : "Add a bonus, fine, or other one-off staff item."}>
      <form className="grid gap-4" onSubmit={saveEntry}>
        <label className="text-sm font-medium">Staff member<Select className="mt-1.5" label="Staff member" value={selectedStaffId} onChange={setSelectedStaffId} options={rows.map((staff) => ({ value: staff.staffUserId, label: staff.staffName }))} /></label>
        {showForm === "other" && <label className="text-sm font-medium">Payment type<Select className="mt-1.5" label="Payment type" value={entryType} onChange={(value) => setEntryType(value as StaffFinanceEntryType)} options={staffEntryTypes} /></label>}
        <label className="text-sm font-medium">Description<Input className="mt-1.5" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder={showForm === "deduction" ? "e.g. Pension contribution" : "e.g. Term bonus"} /></label>
        <label className="text-sm font-medium">Amount (₦)<Input className="mt-1.5" required min="1" step="0.01" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></label>
        <label className="text-sm font-medium">Note <span className="font-normal text-muted">(optional)</span><Input className="mt-1.5" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Short note for the record" /></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(null)}>Cancel</Button><Button disabled={saving}>{saving ? "Saving…" : showForm === "deduction" ? "Add deduction" : "Save payment"}</Button></div>
      </form>
    </Modal>

    <Modal open={Boolean(paying)} onClose={() => setPaying(null)} title="Record staff payment" description={paying ? `${paying.title} · ${formatNaira(paying.amount)}` : undefined}>
      <form className="grid gap-4" onSubmit={markPaid}>
        <label className="text-sm font-medium">Payment method<Input className="mt-1.5" required value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} /></label>
        <label className="text-sm font-medium">Transfer or payment reference<Input className="mt-1.5" required value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Enter the bank or payment reference" /></label>
        <p className="text-xs leading-5 text-muted">This records that the payment was made; it does not initiate a bank transfer.</p>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPaying(null)}>Cancel</Button><Button disabled={saving}>{saving ? "Recording…" : "Mark as paid"}</Button></div>
      </form>
    </Modal>
  </>;
}
