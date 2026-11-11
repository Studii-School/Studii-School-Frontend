"use client";
/* eslint-disable react-hooks/set-state-in-effect -- form selections follow asynchronously loaded classes and stored categories. */

import { useEffect, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { getClassOptions } from "@/features/academics/academics.class-utils";
import { useAcademics } from "@/features/academics/academics-context";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { formatNaira } from "@/lib/currency";
import { readStoredJson, writeStoredJson } from "@/lib/storage";
import { useFinance } from "../finance-context";
import { useFinancePeriodScope } from "../use-finance-period-scope";
import type { FeeCategory, FeeStructure, FeeStructureStatus } from "../finance.types";

const categories: FeeCategory[] = [
  "Tuition", "Development levy", "Examination fee", "Uniform", "Books",
  "Transport", "Boarding", "Feeding", "PTA levy", "Technology fee",
  "Excursion", "Graduation", "Other",
];
const CUSTOM_FEE_CATEGORIES_KEY = "schoolos.finance-fee-categories.v1";

type ApplicationScope = "CLASS" | "PRIMARY" | "SECONDARY" | "ALL" | "CUSTOM";

function normalizeCategory(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function FeeStructureForm({ selectedClassId, template, onDone }: { selectedClassId?: string; template?: FeeStructure; onDone: () => void }) {
  const { createFeeStructure, state: financeState } = useFinance();
  const periodScope = useFinancePeriodScope();
  const session = periodScope.academicSession ?? "";
  const term = periodScope.term ?? "";
  const { state } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const activeClasses = getClassOptions(state);
  const selectedClass = state.classes.find((item) => item.id === selectedClassId);
  const activeSchoolClasses = useMemo(() => state.classes.filter((item) => item.status === "ACTIVE"), [state.classes]);
  const primaryClassIds = useMemo(() => activeSchoolClasses.filter((item) => item.level === "PRIMARY").map((item) => item.id), [activeSchoolClasses]);
  const secondaryClassIds = useMemo(() => activeSchoolClasses.filter((item) => item.level === "SECONDARY").map((item) => item.id), [activeSchoolClasses]);
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState<FeeCategory>(template?.category ?? "Tuition");
  const [customCategories, setCustomCategories] = useState<FeeCategory[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [applicationScope, setApplicationScope] = useState<ApplicationScope>(selectedClassId ? "CLASS" : template?.applicableToAllStudents ? "ALL" : "CUSTOM");
  const [classIds, setClassIds] = useState<string[]>(
    selectedClassId ? [selectedClassId] : template?.classIds?.length ? template.classIds : activeClasses[0] ? [activeClasses[0].value] : [],
  );
  const [amount, setAmount] = useState(template?.amount ?? 250000);
  const [mandatory, setMandatory] = useState(template?.isMandatory ?? true);
  const [dueDate, setDueDate] = useState("");
  const [instalments, setInstalments] = useState(template?.allowInstalments ?? false);
  const [count, setCount] = useState(template?.numberOfInstalments ?? 2);
  const [description, setDescription] = useState(template?.description ?? "");
  const [status, setStatus] = useState<FeeStructureStatus>("Active");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const categoryOptions = useMemo(() => {
    const values = [...categories, ...financeState.feeStructures.map((fee) => fee.category), ...customCategories];
    return [...new Map(values.map((value) => [value.toLowerCase(), value])).values()];
  }, [customCategories, financeState.feeStructures]);
  const allStudents = applicationScope === "ALL";
  const eligible = useMemo(
    () => allStudents ? state.students : state.students.filter((student) => classIds.includes(student.classId)),
    [allStudents, classIds, state.students],
  );
  useEffect(() => {
    setCustomCategories(readStoredJson<FeeCategory[]>(CUSTOM_FEE_CATEGORIES_KEY, []));
  }, []);
  useEffect(() => {
    if (applicationScope === "CLASS" && selectedClassId) setClassIds([selectedClassId]);
    if (applicationScope === "PRIMARY") setClassIds(primaryClassIds);
    if (applicationScope === "SECONDARY") setClassIds(secondaryClassIds);
    if (applicationScope === "ALL") setClassIds(activeSchoolClasses.map((item) => item.id));
  }, [activeSchoolClasses, applicationScope, primaryClassIds, secondaryClassIds, selectedClassId]);
  useEffect(() => {
    if (applicationScope === "CUSTOM" && !classIds.length && activeClasses[0]) setClassIds([activeClasses[0].value]);
  }, [activeClasses, applicationScope, classIds.length]);
  useEffect(() => {
    if (!selectedClassId || name.trim()) return;
    setName(`${selectedClass?.displayName ?? "Class"} ${term} ${category}`);
  }, [category, name, selectedClass?.displayName, selectedClassId, term]);
  const toggle = (id: string) =>
    setClassIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const classGroup = applicationScope === "ALL"
    ? "All classes"
    : applicationScope === "PRIMARY"
      ? "All primary classes"
      : applicationScope === "SECONDARY"
        ? "All secondary classes"
        : classIds
          .map((id) => state.classes.find((item) => item.id === id)?.displayName)
          .filter(Boolean)
          .join(", ");
  const scopeOptions: Array<{ value: ApplicationScope; label: string; helper: string; disabled?: boolean }> = [
    ...(selectedClass ? [{ value: "CLASS" as const, label: selectedClass.displayName, helper: "Only this class" }] : []),
    { value: "PRIMARY", label: "All primary", helper: `${primaryClassIds.length} class(es)`, disabled: primaryClassIds.length === 0 },
    { value: "SECONDARY", label: "All secondary", helper: `${secondaryClassIds.length} class(es)`, disabled: secondaryClassIds.length === 0 },
    { value: "ALL", label: "All classes", helper: `${activeSchoolClasses.length} class(es)`, disabled: activeSchoolClasses.length === 0 },
    ...(!selectedClass ? [{ value: "CUSTOM" as const, label: "Custom classes", helper: "Choose manually" }] : []),
  ];
  const addCustomCategory = () => {
    const next = normalizeCategory(newCategory);
    if (!next) {
      setError("Enter a category name first.");
      return;
    }
    const duplicate = categoryOptions.some((item) => item.toLowerCase() === next.toLowerCase());
    if (!duplicate) {
      const updated = [...customCategories, next];
      setCustomCategories(updated);
      writeStoredJson(CUSTOM_FEE_CATEGORIES_KEY, updated);
      toast(`${next} added to fee categories.`, "success");
    }
    setCategory(next);
    setNewCategory("");
    setError("");
  };

  const create = async () => {
    setSaving(true);
    try {
      const created = await createFeeStructure({
        schoolId: "school-001",
        name: name.trim(),
        academicSession: session,
        term,
        classGroup,
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
      toast(status === "Active" ? created.studentsAssigned > 0 ? `Fee activated for ${created.studentsAssigned} student(s). Their invoices are now available.` : "Fee activated, but no eligible students were found. Check the selected classes and enrollments." : "Draft fee saved. Activate it when students should be billed.", created.studentsAssigned > 0 || status === "Draft" ? "success" : "warning");
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
      setError("Choose where this fee applies.");
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
        {template && <p className="rounded-lg bg-surface-muted p-3 text-sm text-muted sm:col-span-2">Copying {template.name} into {term} {session}. Set a new due date before activating it.</p>}
        <label className="text-sm font-medium sm:col-span-2">
          Fee name
          <Input className="mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="JSS1 First Term Tuition" />
        </label>
        <label className="text-sm font-medium">
          Category
          <Select className="mt-2" label="Fee category" value={category} onChange={(value) => setCategory(value as FeeCategory)} options={categoryOptions.map((value) => ({ value, label: value }))} searchable />
        </label>
        <label className="text-sm font-medium">
          New category
          <span className="mt-2 flex gap-2">
            <Input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Lunch levy" />
            <Button type="button" variant="outline" className="shrink-0 px-3" onClick={addCustomCategory}>
              <Plus size={16} />
              Add
            </Button>
          </span>
        </label>
        <label className="text-sm font-medium">
          Academic session
          <Input className="mt-2" value={session} readOnly />
        </label>
        <label className="text-sm font-medium">
          Term
          <Input className="mt-2" value={term} readOnly />
        </label>
        <label className="text-sm font-medium">
          Amount per student
          <MoneyInput className="mt-2" min="1" value={amount} onValueChange={setAmount} />
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
        <div className="flex items-center justify-between gap-4">
          <span>
            <h3 className="text-sm font-semibold">Apply fee to</h3>
            <p className="mt-1 text-xs text-muted">{selectedClass ? "This class is selected by default. Use a wider scope only when the same fee applies beyond this class." : "Choose the student group once, then continue with the fee details."}</p>
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {scopeOptions.map((option) => {
            const active = applicationScope === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => setApplicationScope(option.value)}
                className={`flex min-h-20 items-start justify-between gap-3 rounded-[8px] border bg-surface p-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border-[var(--school-primary)] ring-2 ring-primary/15" : "hover:border-[var(--school-primary)]"}`}
                aria-pressed={active}
              >
                <span>
                  <b className="block">{option.label}</b>
                  <span className="mt-1 block text-xs text-muted">{option.helper}</span>
                </span>
                {active && <Check size={17} className="text-[var(--school-primary)]" />}
              </button>
            );
          })}
        </div>
        {applicationScope === "CUSTOM" && (
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
        <label className="text-sm font-medium">Status<Select className="mt-2" label="Fee status" value={status} onChange={(value) => setStatus(value as FeeStructureStatus)} options={[{ value: "Active", label: "Active - bill students now" }, { value: "Draft", label: "Draft - save without billing" }]} /></label>
        <label className="text-sm font-medium sm:col-span-2">Description<textarea className="mt-2 min-h-24 w-full rounded-[10px] border bg-surface p-3" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      </section>
      <div className="rounded-xl border bg-surface-muted p-4">
        <h3 className="font-semibold">Live fee summary</h3>
        <p className="mt-2 text-sm">{name || "Untitled fee"} - {classGroup || "No class selected"} - {formatNaira(amount)} - {eligible.length} students - Expected {formatNaira(eligible.length * amount)}</p>
        <p className="mt-2 text-xs text-muted">{status === "Active" ? "Activating creates an invoice for each eligible student. Students and parents can see it in School fees." : "Drafts appear in the admin fee list. Students and parents see the fee after you activate it."}</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : status === "Active" ? "Activate and generate invoices" : "Save fee structure"}</Button>
      </div>
    </form>
  );
}
