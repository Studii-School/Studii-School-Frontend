"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck, GraduationCap, Plus, Upload, UserRoundCog } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PersonNameLink } from "@/features/people/person-name-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileImageField } from "@/components/shared/profile-image-field";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TablePagination, usePaginatedRows } from "@/components/ui/table-pagination";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/number-input";
import { MultiSelect, Select } from "@/components/ui/select";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademics } from "@/features/academics/academics-context";
import { useSchoolUnderReview } from "@/features/school-review/school-review-context";
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
  const rows: string[][] = [];
  let cells: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') { if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted; }
    else if (char === "," && !quoted) { cells.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index += 1; cells.push(cell.trim()); if (cells.some(Boolean)) rows.push(cells); cells = []; cell = ""; }
    else cell += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  cells.push(cell.trim()); if (cells.some(Boolean)) rows.push(cells);
  const headers = rows.shift()?.map((item) => item.trim().toLowerCase()) ?? [];
  return rows.map((cells) => {
    return (name: string) => cells[headers.indexOf(name)] ?? "";
  });
}

type ImportPreviewRow = { row: number; name: string; email: string; role: string; issues: string[]; input: StaffInput };

const normaliseKey = (value?: string) => value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
const normalisePhone = (value?: string) => value?.replace(/\D/g, "") ?? "";

export function StaffHrScreen() {
  const { state, createStaff } = useAcademics();
  const underReview = useSchoolUnderReview();
  const { toast } = useActionFeedback();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<StaffInput>(blankStaff);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<"ALL" | "TEACHING" | "NON_TEACHING" | "SUSPENDED">("ALL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importSaving, setImportSaving] = useState(false);

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
  const pagination = usePaginatedRows(rows, `${selectedGroup}|${query}|${role}|${status}`);

  const patch = <K extends keyof StaffInput>(key: K, value: StaffInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const previewImport = async (file?: File) => {
    if (!file) return;
    try {
      const existingEmails = new Set(state.staff.map((item) => normaliseKey(item.email)).filter(Boolean));
      const existingStaffIds = new Set(state.staff.map((item) => normaliseKey(item.employeeNumber)).filter(Boolean));
      const existingNamePhones = new Set(state.staff.filter((item) => item.fullName && item.phone).map((item) => `${normaliseKey(item.fullName)}|${normalisePhone(item.phone)}`));
      const preview = parseCsv(await file.text()).map((get, index): ImportPreviewRow => {
        const name = get("name") || get("fullname");
        const email = get("email");
        const jobTitle = get("jobtitle") || get("role") || "Staff";
        const staffId = get("staffid") || get("employeenumber");
        const phone = get("phone");
        const rawSalary = get("salaryamount");
        const salaryAmount = Number(rawSalary || 0);
        const issues: string[] = [];
        if (!name) issues.push("Name required");
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push("Valid email required");
        if (rawSalary && (!Number.isFinite(salaryAmount) || salaryAmount < 0)) issues.push("Invalid salary");
        const emailKey = normaliseKey(email), staffIdKey = normaliseKey(staffId), namePhoneKey = `${normaliseKey(name)}|${normalisePhone(phone)}`;
        if (emailKey && existingEmails.has(emailKey)) issues.push("Duplicate email");
        if (staffIdKey && existingStaffIds.has(staffIdKey)) issues.push("Duplicate staff ID");
        if (phone && existingNamePhones.has(namePhoneKey)) issues.push("Duplicate name and phone");
        if (emailKey) existingEmails.add(emailKey);
        if (staffIdKey) existingStaffIds.add(staffIdKey);
        if (phone) existingNamePhones.add(namePhoneKey);
        const classNames = get("classes").split(/[|;]/).map((item) => item.trim()).filter(Boolean);
        const subjectNames = get("subjects").split(/[|;]/).map((item) => item.trim()).filter(Boolean);
        const assignedClassIds = state.classes.filter((item) => classNames.some((value) => item.displayName.toLowerCase() === value.toLowerCase())).map((item) => item.id);
        const subjectIds = state.subjects.filter((item) => subjectNames.some((value) => item.name.toLowerCase() === value.toLowerCase() || item.code?.toLowerCase() === value.toLowerCase())).map((item) => item.id);
        if (classNames.length !== assignedClassIds.length) issues.push("Unknown class");
        if (subjectNames.length !== subjectIds.length) issues.push("Unknown subject");
        const isTeachingStaff = ["yes", "true", "teacher", "teaching"].includes((get("isteachingstaff") || get("teaching") || "").toLowerCase()) || assignedClassIds.length > 0;
        return { row: index + 2, name, email, role: jobTitle, issues, input: {
          name, email, jobTitle, employeeNumber: staffId || undefined, department: get("department") || undefined,
          phone: phone || undefined, salaryAmount: salaryAmount || undefined, isTeachingStaff,
          assignedClassIds: isTeachingStaff ? assignedClassIds : [], classTeacherClassIds: [],
          subjectIds: isTeachingStaff ? subjectIds : [], photoUrl: get("photourl") || get("imageurl") || undefined,
        } };
      });
      setImportFileName(file.name);
      setImportPreview(preview);
    } catch (caught) { toast(caught instanceof Error ? caught.message : "CSV could not be read.", "error"); }
  };
  const importStaff = async () => {
    const valid = importPreview.filter((row) => row.issues.length === 0);
    if (!valid.length) return;
    setImportSaving(true);
    let imported = 0;
    const completedRows = new Set<number>();
    try {
      for (const row of valid) { await createStaff(row.input); imported += 1; completedRows.add(row.row); }
      toast(`${imported} staff member${imported === 1 ? "" : "s"} imported.`, "success");
      setImportDialogOpen(false); setImportPreview([]); setImportFileName("");
    } catch (caught) { setImportPreview((current) => current.filter((row) => !completedRows.has(row.row))); toast(`${imported} imported. ${caught instanceof Error ? caught.message : "Remaining rows could not be saved."}`, "error"); }
    finally { setImportSaving(false); }
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
        showBack={false}
        action={<div className="flex flex-wrap gap-2"><Button variant="outline" disabled={underReview} title={underReview ? "Available after your school profile is approved" : undefined} onClick={() => setImportDialogOpen(true)}><Upload size={16} />Import staff</Button>{underReview ? <span aria-disabled="true" title="Available after your school profile is approved" className={buttonStyles("outline") + " cursor-not-allowed opacity-60"}><Plus size={16} />Add staff</span> : <Link href="/admin/staff/add" className={buttonStyles()}><Plus size={16} />Add staff</Link>}</div>}
      />
      <Modal open={importDialogOpen} title="Import staff" description="Download the template, then preview and validate rows before saving." onClose={() => setImportDialogOpen(false)} maxWidth="xl">
        <div className="space-y-4">
          <Button type="button" variant="outline" onClick={() => downloadCsvFile(STAFF_IMPORT_TEMPLATE_FILENAME, STAFF_IMPORT_TEMPLATE)}>Download CSV template</Button>
          <label className="block text-sm font-medium">Choose a CSV file<Input className="mt-2" type="file" accept=".csv,text/csv" onChange={(event) => { void previewImport(event.target.files?.[0]); }} /></label>
          {importFileName && <p className="text-sm text-muted">{importFileName} · {importPreview.filter((row) => !row.issues.length).length} ready · {importPreview.filter((row) => row.issues.length).length} need attention</p>}
          {importPreview.length > 0 && <div className="max-h-72 overflow-auto rounded-lg border"><table className="w-full min-w-[540px] text-left text-sm"><thead className="sticky top-0 bg-surface-muted"><tr><th className="p-2">Row</th><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Validation</th></tr></thead><tbody>{importPreview.map((row) => <tr key={row.row} className="border-t"><td className="p-2">{row.row}</td><td className="p-2">{row.name || "—"}</td><td className="p-2">{row.email || "—"}</td><td className="p-2">{row.role}</td><td className={`p-2 ${row.issues.length ? "text-danger" : "text-success"}`}>{row.issues.length ? row.issues.join(", ") : "Ready"}</td></tr>)}</tbody></table></div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button><Button type="button" disabled={importSaving || !importPreview.some((row) => !row.issues.length)} onClick={() => void importStaff()}>{importSaving ? "Importing…" : `Import ${importPreview.filter((row) => !row.issues.length).length} valid row(s)`}</Button></div>
        </div>
      </Modal>

      <>
      <div className="mb-4 flex flex-wrap items-center gap-2">{groupCards.map((item) => <button key={item.value} type="button" onClick={() => setSelectedGroup(item.value)} aria-pressed={selectedGroup === item.value} className={`rounded-full border px-3 py-2 text-sm font-medium ${selectedGroup === item.value ? "border-[var(--school-primary)] bg-primary-light text-[var(--school-primary)]" : "bg-surface hover:bg-surface-muted"}`}>{item.label} <span className="ml-1 text-xs opacity-70">{item.count}</span></button>)}<Link href="/admin/staff/assignments" className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-[var(--school-primary)] hover:underline"><UserRoundCog size={16} />Teacher assignments</Link></div>

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

      <section className="bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Staff", "Role", "Contact", "Classes", "Status"].map((item) => <th className="px-4 py-3" key={item}>{item}</th>)}</tr></thead>
            <tbody className="divide-y">
              {pagination.rows.map((item) => (
                <ClickableTableRow key={item.id} href={`/admin/staff/${item.userId}`} label={item.fullName}>
                  <td data-column-label="Staff" className="px-4 py-3"><div className="flex items-center gap-3"><Avatar initials={`${item.firstName[0] ?? ""}${item.lastName[0] ?? ""}`} src={item.photoUrl} alt={`${item.fullName} profile`} /><div className="min-w-0"><p className="font-semibold"><PersonNameLink kind="staff" id={item.userId}>{item.fullName}</PersonNameLink></p><p className="text-xs text-muted">{item.employeeNumber ?? item.id}</p></div></div></td>
                  <td data-column-label="Role" className="px-4 py-3"><p>{item.jobTitle}</p><p className="text-xs text-muted">{item.isTeachingStaff ? "Teaching staff" : item.department ?? "Non-teaching staff"}</p></td>
                  <td data-column-label="Contact" className="px-4 py-3"><p>{item.email}</p><p className="text-xs text-muted">{item.phone ?? "No phone"}</p></td>
                  <td data-column-label="Classes" className="px-4 py-3">{item.isTeachingStaff ? `${item.assignedClassIds.length} classes` : "—"}</td>
                  <td data-column-label="Status" className="px-4 py-3"><Badge tone={item.status === "ACTIVE" ? "success" : "warning"}>{item.status}</Badge></td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination label="Staff" total={pagination.total} page={pagination.page} pageCount={pagination.pageCount} pageSize={pagination.pageSize} start={pagination.start} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
        {!rows.length && <EmptyState title="No staff found" description="Add staff members or clear the filters." />}
      </section></>
    </div>
  );
}
