"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, ChevronRight, Plus, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TablePagination, usePaginatedRows } from "@/components/ui/table-pagination";
import { isSuperAdminPreview } from "@/lib/super-admin-preview";
import { createSchool, deleteSchool, getSchools, reactivateSchool, suspendSchool } from "./super-admin.api";
import { SchoolDetailPanel, type SchoolPanelTab } from "./school-detail-panel";
import { schoolKey, schoolStatus, statusLabel, type SchoolFormState, type SchoolRecord } from "./super-admin.types";

const emptySchool: SchoolFormState = { name: "", code: "", email: "", phone: "", address: "" };
type SchoolAction = { kind: "suspend" | "reactivate" | "delete"; school: SchoolRecord };

function statusTone(status?: string) {
  const value = schoolStatus(status);
  return value === "active" ? "success" : value === "suspended" ? "warning" : "neutral";
}

export function SchoolManagementScreen({ initialStatus = "" }: { initialStatus?: string }) {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [selectedId, setSelectedId] = useState("");
  const [selectedTab, setSelectedTab] = useState<SchoolPanelTab>("overview");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptySchool);
  const [createError, setCreateError] = useState("");
  const [action, setAction] = useState<SchoolAction | null>(null);
  const [pending, setPending] = useState(false);
  const preview = isSuperAdminPreview();

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSchools(await getSchools());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Schools could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadSchools); }, [loadSchools]);

  const filtered = schools.filter((school) => {
    const text = [school.name, school.code, school.email, school.phone, school.status].join(" ").toLowerCase();
    return (!status || schoolStatus(school.status) === status) && text.includes(query.trim().toLowerCase());
  });
  const selectedSchool = schools.find((school) => schoolKey(school) === selectedId) ?? null;
  const activeCount = schools.filter((school) => schoolStatus(school.status) === "active").length;
  const suspendedCount = schools.filter((school) => schoolStatus(school.status) === "suspended").length;
  const peopleCount = schools.reduce((total, school) => total + (school._count?.users ?? school.totalUsers ?? 0), 0);
  const pagination = usePaginatedRows(filtered, `${query}|${status}|${schools.length}`);

  function openSchool(school: SchoolRecord, tab: SchoolPanelTab = "overview") {
    setSelectedTab(tab);
    setSelectedId(schoolKey(school));
  }

  const closeSchool = useCallback(() => setSelectedId(""), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  async function submitSchool(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || pending) return;
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (name.length < 2 || code.length < 2) {
      setCreateError("School name and code must each have at least two characters.");
      return;
    }
    setPending(true);
    setCreateError("");
    setMessage("");
    try {
      const created = await createSchool({ ...form, name, code, email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim() });
      setCreateOpen(false);
      setForm(emptySchool);
      setMessage("School workspace created.");
      await loadSchools();
      const createdId = schoolKey(created.school);
      if (createdId) setSelectedId(createdId);
    } catch (caught) {
      setCreateError(caught instanceof Error ? caught.message : "School could not be created.");
    } finally {
      setPending(false);
    }
  }

  async function confirmAction() {
    if (!action || preview || pending) return;
    const id = schoolKey(action.school);
    if (!id) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (action.kind === "suspend") await suspendSchool(id);
      else if (action.kind === "reactivate") await reactivateSchool(id);
      else await deleteSchool(id);
      const completed = action.kind;
      setAction(null);
      if (completed === "delete") closeSchool();
      setMessage(completed === "delete" ? "School permanently deleted." : completed === "suspend" ? "School suspended." : "School reactivated.");
      await loadSchools();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The action could not be completed.");
      setAction(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader title="Schools" description="Open a school to review its details, control features and manage administrators."
        action={<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={loading || pending} onClick={() => void loadSchools()}><RefreshCw size={16} />Refresh</Button><Button type="button" onClick={() => { setCreateError(""); setCreateOpen(true); }}><Plus size={16} />Create school</Button></div>} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total schools", value: schools.length, icon: Building2, tone: "text-primary" },
          { label: "Active", value: activeCount, icon: ShieldCheck, tone: "text-success" },
          { label: "Suspended or inactive", value: suspendedCount, icon: Users, tone: "text-warning" },
          { label: "People across schools", value: peopleCount, icon: Users, tone: "text-muted" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="flex items-start justify-between gap-3 p-4 sm:p-5">
            <div><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? "…" : value}</p></div>
            <span className={`rounded-lg bg-surface-muted p-2 ${tone}`}><Icon size={19} /></span>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b p-4 sm:p-5">
          <div><h2 className="text-lg font-semibold">School directory</h2><p className="mt-1 text-sm text-muted">Select a school to manage its workspace.</p></div>
          <Badge tone="primary">{filtered.length} shown</Badge>
        </div>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1"><SearchInput value={query} onChange={setQuery} placeholder="Search by school, code or contact" /></div>
          <Select className="sm:w-52" label="Status" placeholder="All statuses" clearable value={status} onChange={setStatus}
            options={[{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended or inactive" }, { value: "other", label: "Other" }]} />
        </div>
        {error && <p role="alert" className="border-b bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
        {message && <p role="status" className="border-b bg-success/10 px-4 py-3 text-sm text-success">{message}</p>}
        {loading ? <p role="status" className="p-8 text-center text-sm text-muted">Loading schools…</p> : !filtered.length ? (
          <div className="p-10 text-center"><Building2 className="mx-auto text-muted" size={28} /><p className="mt-3 font-medium">{schools.length ? "No schools match your filters" : "No schools yet"}</p><p className="mt-1 text-sm text-muted">{schools.length ? "Try another search or status." : "Create the first school workspace to get started."}</p></div>
        ) : (
          <>
            <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-surface-muted/70 text-xs uppercase tracking-wide text-muted"><tr><th scope="col" className="px-4 py-3 font-medium">School</th><th scope="col" className="px-4 py-3 font-medium">Contact</th><th scope="col" className="px-4 py-3 font-medium">People</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Open</span></th></tr></thead>
              <tbody className="divide-y">
                {pagination.rows.map((school) => (
                  <tr key={schoolKey(school) || school.name} className="transition-colors hover:bg-surface-muted/40">
                    <td className="px-4 py-4"><button type="button" className="text-left font-semibold text-foreground hover:text-primary hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary" onClick={() => openSchool(school)}>{school.name || "Unnamed school"}</button><p className="mt-1 text-xs text-muted">{school.code || "No code"}</p></td>
                    <td className="px-4 py-4"><p className="break-all">{school.email || "No email"}</p><p className="mt-1 text-xs text-muted">{school.phone || "No phone"}</p></td>
                    <td className="px-4 py-4 tabular-nums">{school._count?.users ?? school.totalUsers ?? "—"}</td>
                    <td className="px-4 py-4"><Badge tone={statusTone(school.status)}>{statusLabel(school.status)}</Badge></td>
                    <td className="px-4 py-4 text-right"><Button type="button" variant="outline" className="min-h-9 px-3" onClick={() => openSchool(school)}>Manage <ChevronRight size={15} /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <TablePagination label="Schools" total={pagination.total} page={pagination.page} pageCount={pagination.pageCount}
              pageSize={pagination.pageSize} start={pagination.start} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
          </>
        )}
      </Card>

      <SchoolDetailPanel school={selectedSchool} initialTab={selectedTab} preview={preview} pending={pending}
        onClose={closeSchool} onChanged={() => void loadSchools()} onAction={(kind, school) => setAction({ kind, school })} />

      <SidePanel open={createOpen} title="Create a school" description="Set up a workspace. You can add its administrator after creation." onClose={closeCreate} maxWidth="lg">
        <form className="space-y-5" onSubmit={submitSchool}>
          <p className="rounded-lg bg-surface-muted p-3 text-sm text-muted">The school code must be unique. Name and code can be changed later.</p>
          {createError && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{createError}</p>}
          <fieldset disabled={preview || pending} className="space-y-4">
            <Field label="School name" required value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <Field label="School code" required value={form.code} onChange={(value) => setForm({ ...form, code: value })} />
            <Field label="School email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
            <Field label="Phone" type="tel" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
            <Field label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
            <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create school"}</Button>
          </fieldset>
        </form>
      </SidePanel>

      {action && <ConfirmationDialog open title={`${statusLabel(action.kind)} school?`}
        description={action.kind === "delete" ? `Permanently delete ${action.school.name ?? "this school"}? This cannot be undone.` : action.kind === "suspend" ? `Suspend ${action.school.name ?? "this school"}? Its users will be unable to sign in.` : `Reactivate ${action.school.name ?? "this school"} and restore access?`}
        confirmLabel={action.kind === "delete" ? "Delete permanently" : statusLabel(action.kind)} destructive={action.kind !== "reactivate"}
        isLoading={pending} onCancel={() => setAction(null)} onConfirm={() => void confirmAction()} />}
    </>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{label}</span><Input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
