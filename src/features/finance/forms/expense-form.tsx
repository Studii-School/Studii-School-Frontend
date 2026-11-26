"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useFinance } from "../finance-context";

const categories = ["Utilities", "Maintenance", "Salaries", "Transport", "Supplies", "Events", "Other"];

export function ExpenseForm({ onClose }: { onClose: () => void }) {
  const { recordExpense } = useFinance();
  const { toast } = useActionFeedback();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!title.trim() || amount <= 0 || !expenseDate) {
      setError("Title, amount and date are required.");
      return;
    }
    setSaving(true);
    try {
      await recordExpense({ title, category, amount, expenseDate, note, recordedBy: "School admin" });
      toast("Expense recorded.", "success");
      onClose();
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Expense could not be recorded.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium sm:col-span-2">Title<Input className="mt-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Generator diesel" /></label>
      <div className="text-sm font-medium">Category<Select className="mt-2" label="Expense category" value={category} onChange={setCategory} options={categories.map((value) => ({ value, label: value }))}/></div>
      <label className="text-sm font-medium">Amount<MoneyInput className="mt-2" min="1" value={amount} onValueChange={setAmount} /></label>
      <label className="text-sm font-medium">Date<Input className="mt-2" type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} /></label>
      <label className="text-sm font-medium sm:col-span-2">Note<textarea className="mt-2 min-h-24 w-full rounded-[10px] border bg-surface p-3" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {error && <p role="alert" className="rounded-[8px] bg-red-50 p-3 text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={saving}>{saving ? "Saving..." : "Save expense"}</Button></div>
    </form>
  );
}
