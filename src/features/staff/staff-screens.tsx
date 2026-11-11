"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpenCheck, BriefcaseBusiness, GraduationCap, Plus, Trash2, Upload, UserRoundCog } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PersonNameLink } from "@/features/people/person-name-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { CsvImportDialog } from "@/components/shared/csv-import-dialog";
import { ProfileImageField } from "@/components/shared/profile-image-field";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/number-input";
import { MultiSelect, Select } from "@/components/ui/select";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademics } from "@/features/academics/academics-context";
import type { StaffInput } from "@/features/academics/academics.types";
import { downloadCsvFile } from "@/lib/csv-download";
import { STAFF_IMPORT_TEMPLATE, STAFF_IMPORT_TEMPLATE_FILENAME } from "@/lib/import-templates";

const commonRoles = [
  "Teacher",
  "Head Teacher",
  "Cleaner",
  "Gateman",
  "Accountant",
  "Bursar",
  "Secretary",
  "Librarian",
  "Nurse",
  "Driver",
];

const blankStaff: StaffInput = {
  name: "",
  email: "",
  jobTitle: "Teacher",
  isTeachingStaff: true,
  employeeNumber: "",
  department: "",
  phone: "",
  salaryAmount: undefined,
  assignedClassIds: [],
  classTeacherClassIds: [],
  subjectIds: [],
};

function parseCsv(text: string) {
  const rows = text.split(/\r?\n/).filter((line) => line.trim());
  const headers = rows.shift()?.split(",").map((item) => item.trim().toLowerCase()) ?? [];
  return rows.map((line) => {
    const cells = line.split(",").map((item) => item.trim().replace(/^"|"$/g, ""));
    return (name: string) => cells[headers.indexOf(name)] ?? "";
  });
}

const normaliseKey = (value?: string) => value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
const normalisePhone = (value?: string) => value?.replace(/\D/g, "") ?? "";

export function StaffHrScreen() {
  const { state, createStaff, setStaffStatus, removeStaff } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<StaffInput>(blankStaff);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<"ALL" | "TEACHING" | "NON_TEACHING" | "SUSPENDED" | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const classOptions = state.classes
    .filter((item) => item.status === "ACTIVE")
    .map((item) => ({ value: item.id, label: item.displayName, description: item.level }));
  const selectedClassLevels = new Set(
    state.classes
      .filter((item) => (form.assignedClassIds ?? []).includes(item.id))
      .map((item) => item.level),
  );
  const subjectOptions = state.subjects
    .filter((item) => item.status === "ACTIVE")
    .filter((item) => selectedClassLevels.size === 0 || selectedClassLevels.has(item.level))
    .map((item) => ({ value: item.id, label: item.name, description: item.code ? `${item.level} · ${item.code}` : item.level }));
  const roleOptions = [...new Set([...commonRoles, ...state.staff.map((item) => item.jobTitle)])].map((value) => ({ value, label: value }));

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.staff.filter((item) => {
      const haystack = [item.fullName, item.email, item.phone, item.jobTitle, item.department, item.employeeNumber].filter(Boolean).join(" ").toLowerCase();
      const groupMatch =
        !selectedGroup ||
        selectedGroup === "ALL" ||
        (selectedGroup === "TEACHING" && item.isTeachingStaff) ||
        (selectedGroup === "NON_TEACHING" && !item.isTeachingStaff) ||
        (selectedGroup === "SUSPENDED" && item.status === "SUSPENDED");
      return groupMatch && (!normalized || haystack.includes(normalized)) && (!role || item.jobTitle === role) && (!status || item.status === status);
    });
  }, [query, role, selectedGroup, state.staff, status]);

  const patch = <K extends keyof StaffInput>(key: K, value: StaffInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const importStaff = async (file?: File) => {
    if (!file) return;
    try {
      let imported = 0;
      let skipped = 0;
      const existingEmails = new Set(state.staff.map((item) => normaliseKey(item.email)).filter(Boolean));
      const existingStaffIds = new Set(state.staff.map((item) => normaliseKey(item.employeeNumber)).filter(Boolean));
      const existingNamePhones = new Set(
        state.staff
          .filter((item) => item.fullName && item.phone)
          .map((item) => `${normaliseKey(item.fullName)}|${normalisePhone(item.phone)}`),
      );
      for (const get of parseCsv(await file.text())) {
        const name = get("name") || get("fullname");
        const email = get("email");
        const jobTitle = get("jobtitle") || get("role") || "Staff";
        if (!name || !email) continue;
        const staffId = get("staffid") || get("employeenumber");
        const phone = get("phone");
        const salaryAmount = Number(get("salaryamount") || 0);
        const emailKey = normaliseKey(email);
        const staffIdKey = normaliseKey(staffId);
        const namePhoneKey = `${normaliseKey(name)}|${normalisePhone(phone)}`;
        if (
          existingEmails.has(emailKey) ||
          (staffIdKey && existingStaffIds.has(staffIdKey)) ||
          (phone && existingNamePhones.has(namePhoneKey))
        ) {
          skipped += 1;
          continue;
        }
        const classNames = get("classes").split(/[|;]/).map((item) => item.trim()).filter(Boolean);
        const subjectNames = get("subjects").split(/[|;]/).map((item) => item.trim()).filter(Boolean);
        const assignedClassIds = state.classes.filter((item) => classNames.some((name) => item.displayName.toLowerCase() === name.toLowerCase())).map((item) => item.id);
        const subjectIds = state.subjects.filter((item) => subjectNames.some((name) => item.name.toLowerCase() === name.toLowerCase() || item.code?.toLowerCase() === name.toLowerCase())).map((item) => item.id);
        const isTeachingStaff = ["yes", "true", "teacher", "teaching"].includes((get("isteachingstaff") || get("teaching") || "").toLowerCase()) || assignedClassIds.length > 0;
        await createStaff({
          name,
          email,
          jobTitle,
          employeeNumber: staffId || undefined,
          department: get("department") || undefined,
          phone: phone || undefined,
          salaryAmount: salaryAmount || undefined,
          isTeachingStaff,
          assignedClassIds: isTeachingStaff ? assignedClassIds : [],
          classTeacherClassIds: [],
          subjectIds: isTeachingStaff ? subjectIds : [],
          photoUrl: get("photourl") || get("imageurl") || undefined,
        });
        existingEmails.add(emailKey);
        if (staffIdKey) existingStaffIds.add(staffIdKey);
        if (phone) existingNamePhones.add(namePhoneKey);
        imported += 1;
      }
      const skippedText = skipped ? ` ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped.` : "";
      toast(`${imported} staff member${imported === 1 ? "" : "s"} imported.${skippedText}`, imported ? "success" : "warning");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Staff import failed.", "error");
    }
  };
  const deleteStaff = (item: (typeof state.staff)[number]) => {
    confirm({
      title: `Delete ${item.isTeachingStaff ? "teacher" : "staff member"}?`,
      description: `${item.fullName} will be removed from active staff and moved to Trash for 3 months.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        await removeStaff(item.userId);
        toast("Staff member moved to Trash.", "success");
      },
    });
  };

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
      setForm(blankStaff);
      setFormOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Staff member could not be added.");
    } finally {
      setSaving(false);
    }
  };

  const teachingCount = state.staff.filter((item) => item.isTeachingStaff).length;
  const nonTeachingCount = state.staff.length - teachingCount;
  const groupCards = [
    { label: "All staff", value: "ALL" as const, count: state.staff.length, description: "Complete school workforce" },
    { label: "Teaching staff", value: "TEACHING" as const, count: teachingCount, description: "Teachers, class teachers and subject handlers" },
    { label: "Non-teaching staff", value: "NON_TEACHING" as const, count: nonTeachingCount, description: "Admin, finance, operations and support teams" },
    { label: "Suspended", value: "SUSPENDED" as const, count: state.staff.filter((item) => item.status === "SUSPENDED").length, description: "Accounts with paused access" },
  ];

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="Staff & HR"
        description="Manage teaching and non-teaching staff in one clear school directory."
        action={<div className="flex flex-wrap gap-2"><input ref={importInputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => { setImportDialogOpen(false); void importStaff(event.target.files?.[0]).finally(() => { event.target.value = ""; }); }}/><Button variant="outline" onClick={() => setImportDialogOpen(true)}><Upload size={16} />Import Staff</Button><Link href="/admin/staff/add" className={buttonStyles()}><Plus size={16} />Add Staff</Link></div>}
      />
      <CsvImportDialog
        open={importDialogOpen}
        title="Import staff and teachers"
        description="Download the staff CSV template, or select a completed CSV containing teaching or non-teaching staff."
        onClose={() => setImportDialogOpen(false)}
        onDownloadTemplate={() => downloadCsvFile(STAFF_IMPORT_TEMPLATE_FILENAME, STAFF_IMPORT_TEMPLATE)}
        onUpload={() => importInputRef.current?.click()}
      />

      {!selectedGroup ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{groupCards.map((item)=><button key={item.value} type="button" onClick={()=>setSelectedGroup(item.value)} className="min-h-36 rounded-[8px] border bg-surface p-4 text-left transition hover:border-[var(--school-primary)] hover:shadow-sm"><BriefcaseBusiness size={20} className="text-[var(--school-primary)]" /><p className="mt-3 font-semibold">{item.label}</p><p className="mt-1 text-xs text-muted">{item.description}</p><p className="mt-4 text-2xl font-bold">{item.count}</p></button>)}</div> : <>
      <Button className="mb-4" type="button" variant="outline" onClick={() => setSelectedGroup("")}><ArrowLeft size={16}/>Back to staff cards</Button>

      {formOpen && (
        <Card className="mb-5 p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Add staff member</h2>
              <p className="mt-1 text-sm text-muted">Start with identity and staff type. Teaching assignments only appear when they are needed.</p>
            </div>
            <Link href="/admin/staff/assignments" className={buttonStyles("outline")}><UserRoundCog size={15} />Assign Classes</Link>
          </div>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-3 sm:col-span-2 md:grid-cols-2">
              <button type="button" onClick={() => { patch("isTeachingStaff", true); patch("jobTitle", form.jobTitle === "Staff" ? "Teacher" : form.jobTitle); }} className={`rounded-[8px] border p-4 text-left transition ${form.isTeachingStaff ? "border-[var(--school-primary)] bg-primary-light text-[var(--school-primary)]" : "bg-surface hover:bg-surface-muted"}`}>
                <GraduationCap size={20} />
                <p className="mt-3 font-semibold">Teaching staff</p>
                <p className="mt-1 text-xs text-muted">Teacher, head teacher, class teacher or subject handler.</p>
              </button>
              <button type="button" onClick={() => { patch("isTeachingStaff", false); patch("jobTitle", form.jobTitle === "Teacher" ? "Staff" : form.jobTitle); }} className={`rounded-[8px] border p-4 text-left transition ${!form.isTeachingStaff ? "border-[var(--school-primary)] bg-primary-light text-[var(--school-primary)]" : "bg-surface hover:bg-surface-muted"}`}>
                <BookOpenCheck size={20} />
                <p className="mt-3 font-semibold">Non-teaching staff</p>
                <p className="mt-1 text-xs text-muted">Admin, bursary, operations, health, security and support roles.</p>
              </button>
            </div>
            <label className="text-sm font-medium">Full name<Input className="mt-2" value={form.name} onChange={(event) => patch("name", event.target.value)} /></label>
            <label className="text-sm font-medium">Email<Input className="mt-2" type="email" value={form.email} onChange={(event) => patch("email", event.target.value)} /></label>
            <label className="text-sm font-medium">Staff ID<Input className="mt-2" value={form.employeeNumber ?? ""} onChange={(event) => patch("employeeNumber", event.target.value)} /></label>
            <label className="text-sm font-medium">Monthly salary<MoneyInput className="mt-2" min="0" value={form.salaryAmount ?? 0} onValueChange={(value) => patch("salaryAmount", value || undefined)} placeholder="250,000" /></label>
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="text-sm font-medium">Role<Select className="mt-2" searchable label="Role" value={form.jobTitle} onChange={(value) => patch("jobTitle", value)} options={roleOptions} /></label>
              <label className="text-sm font-medium">Custom role name<Input className="mt-2" value={form.jobTitle} onChange={(event) => patch("jobTitle", event.target.value)} placeholder="Cleaner, Gateman, Lab assistant..." /></label>
            </div>
            <label className="text-sm font-medium">Department<Input className="mt-2" value={form.department ?? ""} onChange={(event) => patch("department", event.target.value)} /></label>
            <label className="text-sm font-medium">Phone<Input className="mt-2" value={form.phone ?? ""} onChange={(event) => patch("phone", event.target.value)} /></label>
            <div className="sm:col-span-2"><ProfileImageField value={form.photoUrl} onChange={(value) => patch("photoUrl", value)} name={form.name || "Staff member"} /></div>
            {form.isTeachingStaff && (
              <>
                <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Assigned classes</p><MultiSelect searchable label="Assigned classes" placeholder="Select classes" emptyMessage="No active classes found." values={form.assignedClassIds ?? []} onChange={(values) => patch("assignedClassIds", values)} options={classOptions} /></div>
                <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Subjects taught</p><MultiSelect searchable label="Subjects taught" placeholder="Select subjects" emptyMessage="No subjects found for the selected classes." values={form.subjectIds ?? []} onChange={(values) => patch("subjectIds", values)} options={subjectOptions} /></div>
              </>
            )}
            {!form.isTeachingStaff && (
              <div className="rounded-[8px] border bg-surface-muted p-4 text-sm text-muted sm:col-span-2">
                Non-teaching staff do not need class or subject access. You can still keep department, phone and salary details here.
              </div>
            )}
            {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button disabled={saving}>{saving ? "Adding staff..." : "Add Staff"}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search staff, role or phone" />
        <Select clearable searchable label="Role" value={role} onChange={setRole} placeholder="All roles" options={roleOptions} />
        <Select clearable label="Status" value={status} onChange={setStatus} placeholder="All statuses" options={["ACTIVE", "SUSPENDED", "INACTIVE"].map((value) => ({ value, label: value }))} />
      </div>

      <section className="overflow-hidden rounded-xl border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Staff", "Role", "Contact", "Classes", "Status", "Actions"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr></thead>
            <tbody className="divide-y">
              {rows.map((item) => (
                <ClickableTableRow key={item.id} href={`/admin/staff/${item.userId}`} label={item.fullName}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar initials={`${item.firstName[0] ?? ""}${item.lastName[0] ?? ""}`} src={item.photoUrl} alt={`${item.fullName} profile`} /><div><p className="font-semibold"><PersonNameLink kind="staff" id={item.userId}>{item.fullName}</PersonNameLink></p><p className="text-xs text-muted">{item.employeeNumber ?? item.id}</p></div></div></td>
                  <td className="px-4 py-3"><p>{item.jobTitle}</p><p className="text-xs text-muted">{item.isTeachingStaff ? "Teaching staff" : item.department ?? "Non-teaching staff"}</p></td>
                  <td className="px-4 py-3"><p>{item.email}</p><p className="text-xs text-muted">{item.phone ?? "No phone"}</p></td>
                  <td className="px-4 py-3">{item.isTeachingStaff ? `${item.assignedClassIds.length} class(es), ${item.subjectIds.length} subject(s)` : "Not applicable"}</td>
                  <td className="px-4 py-3"><Badge tone={item.status === "ACTIVE" ? "success" : "warning"}>{item.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link className="font-semibold text-[var(--school-primary)]" href={`/admin/staff/${item.userId}`}>View details</Link>
                      {item.isTeachingStaff ? <Link className="font-semibold text-[var(--school-primary)]" href={`/admin/staff/assignments?teacher=${item.userId}`}>Assign classes</Link> : <span className="text-muted">No class access</span>}
                      <button className="font-semibold text-muted" onClick={() => void setStaffStatus(item.userId, item.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED").then(() => toast(item.status === "SUSPENDED" ? "Staff member reactivated." : "Staff member suspended.", "success")).catch((caught) => toast(caught instanceof Error ? caught.message : "Staff status could not be changed.", "error"))}>{item.status === "SUSPENDED" ? "Reactivate" : "Suspend"}</button>
                      <button className="inline-flex items-center gap-1 font-semibold text-danger" onClick={() => deleteStaff(item)}><Trash2 size={14} />Delete</button>
                    </div>
                  </td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <EmptyState title="No staff found" description="Add staff members or clear the filters." />}
      </section></>}
    </div>
  );
}
