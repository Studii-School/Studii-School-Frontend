"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademics } from "@/features/academics/academics-context";
import { formatNaira } from "@/lib/currency";
import { financeApi } from "./finance.api";

type TeacherFinanceEntry = { id: string; type: "SALARY" | "FINE" | "REQUIRED_PAYMENT"; title: string; amount: number; status: "BEING_PAID" | "PAID" | "PENDING" | "YET_TO_BE_PAID"; dueDate?: string | null; note?: string | null };
type TeacherFinanceRow = { teacherId: string; teacherName: string; email?: string; employeeNumber?: string | null; jobTitle?: string; salaryAmount: number; entries: TeacherFinanceEntry[] };

function statusLabel(value: TeacherFinanceEntry["status"]) {
  if (value === "BEING_PAID") return "Being paid";
  if (value === "PAID") return "Paid";
  if (value === "PENDING") return "Pending";
  return "Yet to be paid";
}

function statusTone(value: TeacherFinanceEntry["status"]) {
  if (value === "PAID" || value === "BEING_PAID") return "success";
  if (value === "PENDING") return "warning";
  return "danger";
}

export function TeacherFinanceAdminScreen() {
  const { state } = useAcademics();
  const { toast } = useActionFeedback();
  const [rows, setRows] = useState<TeacherFinanceRow[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [type, setType] = useState<TeacherFinanceEntry["type"]>("SALARY");
  const [title, setTitle] = useState("Salary");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<TeacherFinanceEntry["status"]>("YET_TO_BE_PAID");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fallbackRows = useMemo<TeacherFinanceRow[]>(() => state.staff.filter((item) => item.isTeachingStaff).map((teacher) => ({
    teacherId: teacher.userId,
    teacherName: teacher.fullName,
    email: teacher.email,
    employeeNumber: teacher.employeeNumber,
    jobTitle: teacher.jobTitle,
    salaryAmount: teacher.salaryAmount ?? 0,
    entries: [],
  })), [state.staff]);
  const teacherRows = rows.length ? rows : fallbackRows;
  const selectedTeacher = teacherRows.find((teacher) => teacher.teacherId === selectedTeacherId) ?? teacherRows[0];

  const load = () => financeApi.getAdminTeacherFinance().then((data) => setRows(data.teachers ?? [])).catch(() => setRows([]));
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (!selectedTeacherId && teacherRows[0]) setSelectedTeacherId(teacherRows[0].teacherId); }, [selectedTeacherId, teacherRows]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTeacher) return;
    setSaving(true);
    try {
      await financeApi.createTeacherFinanceEntry(selectedTeacher.teacherId, { type, title: title.trim() || (type === "SALARY" ? "Salary" : type === "FINE" ? "Fine" : "Required payment"), amount: Number(amount || 0), status, note: note.trim() || undefined });
      toast(type === "SALARY" ? "Teacher salary saved." : "Teacher finance entry added.", "success");
      setAmount("");
      setNote("");
      setTitle(type === "SALARY" ? "Salary" : type === "FINE" ? "Fine" : "Required payment");
      await load();
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Teacher finance could not be saved.", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateType = (value: string) => {
    const next = value as TeacherFinanceEntry["type"];
    setType(next);
    setTitle(next === "SALARY" ? "Salary" : next === "FINE" ? "Fine" : "Required payment");
  };

  return <>
    <PageHeader title="Teachers Finance" description="Set teacher salaries and add admin-created fines or required payments." />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <SectionCard title="Teachers" description={`${teacherRows.length} teacher(s)`}>
        <div className="divide-y px-5">{teacherRows.map((teacher) => <button key={teacher.teacherId} type="button" onClick={() => setSelectedTeacherId(teacher.teacherId)} className={`flex w-full items-center justify-between gap-3 py-3 text-left text-sm ${selectedTeacher?.teacherId === teacher.teacherId ? "text-[var(--school-primary)]" : ""}`}><span><b>{teacher.teacherName}</b><p className="text-xs text-muted">{teacher.employeeNumber ?? teacher.email ?? "Teacher"}</p></span><span className="font-semibold">{formatNaira(teacher.salaryAmount ?? 0)}</span></button>)}{!teacherRows.length && <EmptyState title="No teachers found" description="Add teaching staff before setting teacher finance." />}</div>
      </SectionCard>
      <div className="space-y-6">
        <SectionCard title="Add teacher finance" description={selectedTeacher ? selectedTeacher.teacherName : "Select a teacher"}>
          <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
            <Select label="Type" value={type} onChange={updateType} options={[{ value: "SALARY", label: "Salary" }, { value: "FINE", label: "Fine" }, { value: "REQUIRED_PAYMENT", label: "Required payment" }]} />
            <Select label="Status" value={status} onChange={(value) => setStatus(value as TeacherFinanceEntry["status"])} options={[{ value: "YET_TO_BE_PAID", label: "Yet to be paid" }, { value: "PENDING", label: "Pending" }, { value: "BEING_PAID", label: "Being paid" }, { value: "PAID", label: "Paid" }]} />
            <label className="text-sm font-medium">Title<Input className="mt-2" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="text-sm font-medium">Amount<Input className="mt-2" type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="250000" /></label>
            <label className="text-sm font-medium sm:col-span-2">Note<Input className="mt-2" value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <div className="flex justify-end sm:col-span-2"><Button disabled={!selectedTeacher || saving}><Plus size={16} />{saving ? "Saving..." : "Save entry"}</Button></div>
          </form>
        </SectionCard>
        <SectionCard title="Finance entries" description={selectedTeacher ? selectedTeacher.teacherName : undefined}>
          <div className="divide-y px-5">{selectedTeacher?.entries.length ? selectedTeacher.entries.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span className="flex items-start gap-2">{entry.type === "SALARY" ? <WalletCards size={17} className="mt-0.5 text-success" /> : <AlertTriangle size={17} className="mt-0.5 text-warning" />}<span><b>{entry.title}</b><p className="text-xs text-muted">{entry.type === "REQUIRED_PAYMENT" ? "Required payment" : entry.type}</p></span></span><span className="flex items-center gap-3"><b>{formatNaira(entry.amount)}</b><Badge tone={statusTone(entry.status)}>{statusLabel(entry.status)}</Badge></span></div>) : <EmptyState title="No admin entries yet" description="Salary appears after it is set; fines appear only when an admin adds them." />}</div>
        </SectionCard>
      </div>
    </div>
  </>;
}
