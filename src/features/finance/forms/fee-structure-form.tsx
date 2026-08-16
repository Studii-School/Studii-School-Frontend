"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getClassOptions } from "@/features/academics/academics.class-utils";
import { useAcademics } from "@/features/academics/academics-context";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { formatNaira } from "@/lib/currency";
import { useFinance } from "../finance-context";
import type { FeeCategory, FeeStructureStatus } from "../finance.types";

const categories: FeeCategory[] = [
  "Tuition", "Development levy", "Examination fee", "Uniform", "Books",
  "Transport", "Boarding", "Feeding", "PTA levy", "Technology fee",
  "Excursion", "Graduation", "Other",
];
const terms = [
  "First Term", "Second Term", "Third Term", "Full Session", "One-Time Fee",
];

export function FeeStructureForm({ onDone }: { onDone: () => void }) {
  const { createFeeStructure } = useFinance();
  const { state } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const activeClasses = getClassOptions(state);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FeeCategory>("Tuition");
  const [session, setSession] = useState("2026/2027");
  const [term, setTerm] = useState("First Term");
  const [allStudents, setAllStudents] = useState(false);
  const [classIds, setClassIds] = useState<string[]>(
    activeClasses[0] ? [activeClasses[0].value] : [],
  );
  const [amount, setAmount] = useState(250000);
  const [mandatory, setMandatory] = useState(true);
  const [dueDate, setDueDate] = useState("");
  const [instalments, setInstalments] = useState(false);
  const [count, setCount] = useState(2);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<FeeStructureStatus>("Draft");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const eligible = useMemo(
    () =>
      allStudents
        ? state.students
        : state.students.filter((student) => classIds.includes(student.classId)),
    [allStudents, classIds, state.students],
  );
  const toggle = (id: string) =>
    setClassIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const classGroup = classIds
    .map((id) => state.classes.find((item) => item.id === id)?.displayName)
    .filter(Boolean)
    .join(", ");

  const create = async () => {
    setSaving(true);
    try {
      await createFeeStructure({
        schoolId: "school-001",
        name: name.trim(),
        academicSession: session,
        term,
        classGroup: allStudents ? "All classes" : classGroup,
        classIds,
        applicableToAllStudents: allStudents,
        category,
        amount,
        isMandatory: mandatory,
        dueDate,
        allowInstalments: instalments,
        numberOfInstalments: instalments ? count : 1,
        latePenalty: 0,
        description,
        status,
        effectiveDate,
        createdByUserId: "admin-user-001",
      });
      toast("Fee structure created successfully.", "success");
      onDone();
    } catch (caught) {
      toast(
        caught instanceof Error
          ? caught.message
          : "Fee structure could not be saved.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim() || !session || !term || amount <= 0 || !dueDate || !effectiveDate) {
      setError("Name, session, term, amount, due date and effective date are required.");
      return;
    }
    if (!allStudents && !classIds.length) {
      setError("Select at least one applicable class.");
      return;
    }
    if (instalments && count < 2) {
      setError("Instalments require at least two payments.");
      return;
    }
    if (status === "Active") {
      confirm({
        title: "Activate fee structure?",
        description: `This will create the fee and may generate invoices for ${eligible.length} student(s).`,
        confirmLabel: "Activate Fee",
        onConfirm: create,
      });
    } else {
      void create();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">
          Fee name
          <Input className="mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="JSS1 First Term Tuition" />
        </label>
        <label className="text-sm font-medium">
          Category
          <Select className="mt-2" label="Fee category" value={category} onChange={(value) => setCategory(value as FeeCategory)} options={categories.map((value) => ({ value, label: value }))} />
        </label>
        <label className="text-sm font-medium">
          Academic session
          <Input className="mt-2" value={session} onChange={(event) => setSession(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Term
          <Select className="mt-2" label="Academic term" value={term} onChange={setTerm} options={terms.map((value) => ({ value, label: value }))} />
        </label>
        <label className="text-sm font-medium">
          Amount per student
          <Input className="mt-2" type="number" min="1" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </label>
        <label className="text-sm font-medium">
          Due date
          <Input className="mt-2" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Effective date
          <Input className="mt-2" type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
        </label>
      </div>
      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Applicable students</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allStudents} onChange={(event) => setAllStudents(event.target.checked)} />
            All students
          </label>
        </div>
        {!allStudents && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeClasses.map((item) => (
              <label key={item.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={classIds.includes(item.value)} onChange={() => toggle(item.value)} />
                {item.label}
              </label>
            ))}
          </div>
        )}
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mandatory} onChange={(event) => setMandatory(event.target.checked)} />Mandatory fee</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={instalments} onChange={(event) => setInstalments(event.target.checked)} />Allow instalments</label>
        {instalments && <label className="text-sm font-medium">Number of instalments<Input className="mt-2" type="number" min="2" max="12" value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>}
        <label className="text-sm font-medium">Status<Select className="mt-2" label="Fee status" value={status} onChange={(value) => setStatus(value as FeeStructureStatus)} options={["Draft", "Active", "Archived"].map((value) => ({ value, label: value }))} /></label>
        <label className="text-sm font-medium sm:col-span-2">Description<textarea className="mt-2 min-h-24 w-full rounded-[10px] border bg-surface p-3" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      </section>
      <div className="rounded-xl border bg-surface-muted p-4">
        <h3 className="font-semibold">Live fee summary</h3>
        <p className="mt-2 text-sm">{name || "Untitled fee"} · {formatNaira(amount)} · {eligible.length} students · Expected {formatNaira(eligible.length * amount)}</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : status === "Active" ? "Activate and generate invoices" : "Save fee structure"}</Button>
      </div>
    </form>
  );
}
