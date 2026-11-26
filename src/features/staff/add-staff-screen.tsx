"use client";

import { useState } from "react";
import { BookOpenCheck, GraduationCap, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileImageField } from "@/components/shared/profile-image-field";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/number-input";
import { MultiSelect, Select } from "@/components/ui/select";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademics } from "@/features/academics/academics-context";
import type { StaffInput } from "@/features/academics/academics.types";
import Link from "@/features/navigation-progress/navigation-progress-link";

const commonRoles = ["Teacher", "Head Teacher", "Cleaner", "Gateman", "Accountant", "Bursar", "Secretary", "Librarian", "Nurse", "Driver"];

const blankStaff: StaffInput = {
  name: "", email: "", jobTitle: "Teacher", isTeachingStaff: true,
  employeeNumber: "", department: "", phone: "", salaryAmount: undefined,
  assignedClassIds: [], classTeacherClassIds: [], subjectIds: [],
};

export function AddStaffScreen() {
  const router = useRouter();
  const { state, createStaff } = useAcademics();
  const { toast } = useActionFeedback();
  const [form, setForm] = useState<StaffInput>(blankStaff);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const patch = <K extends keyof StaffInput>(key: K, value: StaffInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const classOptions = state.classes.filter((item) => item.status === "ACTIVE").map((item) => ({ value: item.id, label: item.displayName, description: item.level }));
  const selectedClassLevels = new Set(state.classes.filter((item) => (form.assignedClassIds ?? []).includes(item.id)).map((item) => item.level));
  const subjectOptions = state.subjects.filter((item) => item.status === "ACTIVE").filter((item) => selectedClassLevels.size === 0 || selectedClassLevels.has(item.level)).map((item) => ({ value: item.id, label: item.name, description: item.code ? `${item.level} · ${item.code}` : item.level }));
  const roleOptions = [...new Set([...commonRoles, ...state.staff.map((item) => item.jobTitle)])].map((value) => ({ value, label: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.jobTitle.trim()) {
      setError("Name, email and role are required.");
      return;
    }
    setSaving(true);
    try {
      await createStaff({
        ...form,
        assignedClassIds: form.isTeachingStaff ? form.assignedClassIds : [],
        classTeacherClassIds: form.isTeachingStaff ? form.classTeacherClassIds : [],
        subjectIds: form.isTeachingStaff ? form.subjectIds : [],
      });
      toast("Staff member added successfully.", "success");
      router.push("/admin/staff");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Staff member could not be added.");
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0">
      <PageHeader title="Add staff member" description="Create a teaching or non-teaching staff profile." backFallback="/admin/staff" />
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-semibold">Staff details</h2><p className="mt-1 text-sm text-muted">Start with identity and staff type. Teaching assignments only appear when they are needed.</p></div>
          <Link href="/admin/staff/assignments" className={buttonStyles("outline")}><UserRoundCog size={15} />Assign Classes</Link>
        </div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-3 sm:col-span-2 md:grid-cols-2">
            <button type="button" onClick={() => { patch("isTeachingStaff", true); patch("jobTitle", form.jobTitle === "Staff" ? "Teacher" : form.jobTitle); }} className={`rounded-[8px] border p-4 text-left transition ${form.isTeachingStaff ? "border-[var(--school-primary)] bg-primary-light text-[var(--school-primary)]" : "bg-surface hover:bg-surface-muted"}`}><GraduationCap size={20} /><p className="mt-3 font-semibold">Teaching staff</p><p className="mt-1 text-xs text-muted">Teacher, head teacher, class teacher or subject handler.</p></button>
            <button type="button" onClick={() => { patch("isTeachingStaff", false); patch("jobTitle", form.jobTitle === "Teacher" ? "Staff" : form.jobTitle); }} className={`rounded-[8px] border p-4 text-left transition ${!form.isTeachingStaff ? "border-[var(--school-primary)] bg-primary-light text-[var(--school-primary)]" : "bg-surface hover:bg-surface-muted"}`}><BookOpenCheck size={20} /><p className="mt-3 font-semibold">Non-teaching staff</p><p className="mt-1 text-xs text-muted">Admin, bursary, operations, health, security and support roles.</p></button>
          </div>
          <label className="text-sm font-medium">Full name<Input className="mt-2" value={form.name} onChange={(event) => patch("name", event.target.value)} /></label>
          <label className="text-sm font-medium">Email<Input className="mt-2" type="email" value={form.email} onChange={(event) => patch("email", event.target.value)} /></label>
          <label className="text-sm font-medium">Staff ID<Input className="mt-2" value={form.employeeNumber ?? ""} onChange={(event) => patch("employeeNumber", event.target.value)} /></label>
          <label className="text-sm font-medium">Monthly salary<MoneyInput className="mt-2" min="0" value={form.salaryAmount ?? 0} onValueChange={(value) => patch("salaryAmount", value || undefined)} placeholder="250,000" /></label>
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <label className="text-sm font-medium">Role<Select className="mt-2" searchable label="Role" value={form.jobTitle} onChange={(value) => patch("jobTitle", value)} options={roleOptions} /></label>
            <label className="text-sm font-medium">Custom role name<Input className="mt-2" value={form.jobTitle} onChange={(event) => patch("jobTitle", event.target.value)} placeholder="Cleaner, Gateman, Lab assistant..." /></label>
          </div>
          <label className="text-sm font-medium">Department<Input className="mt-2" value={form.department ?? ""} onChange={(event) => patch("department", event.target.value)} /></label>
          <label className="text-sm font-medium">Phone<Input className="mt-2" value={form.phone ?? ""} onChange={(event) => patch("phone", event.target.value)} /></label>
          <div className="sm:col-span-2"><ProfileImageField value={form.photoUrl} onChange={(value) => patch("photoUrl", value)} name={form.name || "Staff member"} /></div>
          {form.isTeachingStaff ? <>
            <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Assigned classes</p><MultiSelect searchable label="Assigned classes" placeholder="Select classes" emptyMessage="No active classes found." values={form.assignedClassIds ?? []} onChange={(values) => patch("assignedClassIds", values)} options={classOptions} /></div>
            <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Subjects taught</p><MultiSelect searchable label="Subjects taught" placeholder="Select subjects" emptyMessage="No subjects found for the selected classes." values={form.subjectIds ?? []} onChange={(values) => patch("subjectIds", values)} options={subjectOptions} /></div>
          </> : <div className="rounded-[8px] border bg-surface-muted p-4 text-sm text-muted sm:col-span-2">Non-teaching staff do not need class or subject access. You can still keep department, phone and salary details here.</div>}
          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2"><Link href="/admin/staff" className={buttonStyles("outline")}>Cancel</Link><Button disabled={saving}>{saving ? "Adding staff..." : "Add Staff"}</Button></div>
        </form>
      </Card>
    </div>
  );
}
