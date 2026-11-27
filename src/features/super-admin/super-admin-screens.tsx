"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, ShieldPlus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PasswordField } from "@/components/ui/password-field";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { TablePagination, usePaginatedRows } from "@/components/ui/table-pagination";
import { SearchInput } from "@/components/shared/search-input";
import { getSchoolFeatureSettings, schoolFeatures, type SchoolFeatureSettings, updateSchoolFeatureSettings } from "@/lib/school-features";
import { createSchool, createSchoolAdmin, deleteSchool, getSchools, reactivateSchool, suspendSchool } from "./super-admin.api";
import { schoolKey, schoolStatus, statusLabel, type SchoolAdminFormState, type SchoolFormState, type SchoolRecord } from "./super-admin.types";

const emptySchool: SchoolFormState = { name: "", code: "", email: "", phone: "", address: "" };
const emptyAdmin: SchoolAdminFormState = { schoolId: "", name: "", email: "", password: "" };

function statusTone(status?: string) {
  const value = schoolStatus(status);
  if (value === "active") return "success";
  if (value === "suspended") return "warning";
  return "neutral";
}

function matchesSchool(query: string, school: SchoolRecord) {
  const target = [school.name, school.code, school.email, school.phone, school.status].join(" ").toLowerCase();
  return target.includes(query.trim().toLowerCase());
}

type SchoolAction = { kind: "suspend" | "reactivate" | "delete"; school: SchoolRecord };

export function SuperAdminSchoolsScreen({ initialStatus = "" }: { initialStatus?: string }) {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [schoolForm, setSchoolForm] = useState(emptySchool);
  const [adminForm, setAdminForm] = useState(emptyAdmin);
  const [selection, setSelection] = useState<SchoolAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const adminPanel = useRef<HTMLHeadingElement>(null);
  const cancelAction = useCallback(() => setSelection(null), []);

  const filtered = schools.filter((school) => (!status || schoolStatus(school.status) === status) && matchesSchool(query, school));
  const schoolOptions = schools.filter((school) => schoolKey(school)).map((school) => ({
    value: schoolKey(school), label: school.name ?? school.code ?? schoolKey(school),
  }));
  const selectedSchoolId = schoolOptions.some(({ value }) => value === adminForm.schoolId) ? adminForm.schoolId : "";
  const selectedName = selection?.school.name ?? selection?.school.code ?? "this school";

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSchools(await getSchools());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load schools.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadSchools); }, [loadSchools]);

  async function runAction(action: () => Promise<unknown>, success: string, onSuccess: () => void) {
    if (pending) return;
    setPending(true);
    setMessage("");
    setError("");
    try {
      await action();
      onSuccess();
      setMessage(success);
      await loadSchools();
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "The action could not be completed.";
      setError(text);
      setSelection(null);
    } finally {
      setPending(false);
    }
  }

  function submitSchool(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = schoolForm.name.trim();
    if (!name) { setError("Enter a school name."); return; }
    void runAction(() => createSchool({ ...schoolForm, name }), "School created.", () => setSchoolForm(emptySchool));
  }

  function submitAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSchoolId) return;
    const name = adminForm.name.trim();
    if (name.length < 2) { setError("Enter the administrator’s name."); return; }
    void runAction(() => createSchoolAdmin({
      ...adminForm, schoolId: selectedSchoolId, name, email: adminForm.email.trim().toLowerCase(),
    }), "School admin created.", () => setAdminForm({ ...emptyAdmin, schoolId: selectedSchoolId }));
  }

  function confirmAction() {
    if (!selection) return;
    const { kind, school } = selection;
    const id = schoolKey(school);
    if (!id) return;
    const actions = {
      suspend: { call: suspendSchool, success: "School suspended." },
      reactivate: { call: reactivateSchool, success: "School reactivated." },
      delete: { call: deleteSchool, success: "School deleted." },
    };
    void runAction(() => actions[kind].call(id), actions[kind].success, cancelAction);
  }

  return (
    <>
      <PageHeader
        title="Schools"
        description="Create school workspaces, assign administrators and manage access."
        action={<Button type="button" variant="outline" onClick={loadSchools} disabled={loading || pending}><RefreshCw size={16} />Refresh</Button>}
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,21rem)]">
        <SectionCard title="School directory" description={`${filtered.length} shown`} action={<Badge tone="primary">{schools.length} total</Badge>}>
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1"><SearchInput value={query} onChange={setQuery} placeholder="Search schools" /></div>
            <Select className="sm:w-44" label="Status" placeholder="All statuses" value={status} onChange={setStatus} clearable
              options={[{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended or inactive" }, { value: "other", label: "Other statuses" }]} />
          </div>
          {error && <p className="border-b bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
          {message && <p className="border-b bg-success/10 px-4 py-3 text-sm text-success" role="status">{message}</p>}
          <SchoolTable schools={filtered} loading={loading} pending={pending}
            onAction={(kind, school) => setSelection({ kind, school })}
            onSelectAdmin={(schoolId) => {
              setAdminForm({ ...emptyAdmin, schoolId });
              adminPanel.current?.focus();
            }} />
        </SectionCard>
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Create school</h2>
            <form className="mt-4 space-y-3" onSubmit={submitSchool}>
              <label className="block space-y-1 text-sm"><span>School name</span><Input required value={schoolForm.name} onChange={(event) => setSchoolForm({ ...schoolForm, name: event.target.value })} /></label>
              <label className="block space-y-1 text-sm"><span>School code</span><Input value={schoolForm.code} onChange={(event) => setSchoolForm({ ...schoolForm, code: event.target.value })} /></label>
              <label className="block space-y-1 text-sm"><span>School email</span><Input type="email" value={schoolForm.email} onChange={(event) => setSchoolForm({ ...schoolForm, email: event.target.value })} /></label>
              <label className="block space-y-1 text-sm"><span>Phone</span><Input type="tel" value={schoolForm.phone} onChange={(event) => setSchoolForm({ ...schoolForm, phone: event.target.value })} /></label>
              <label className="block space-y-1 text-sm"><span>Address</span><Input value={schoolForm.address} onChange={(event) => setSchoolForm({ ...schoolForm, address: event.target.value })} /></label>
              <Button className="w-full" type="submit" disabled={pending || loading}><Plus size={16} />Create school</Button>
            </form>
          </Card>

          <Card className="p-5">
            <h2 tabIndex={-1} ref={adminPanel} className="text-sm font-semibold">Add school admin</h2>
            <form className="mt-4 space-y-3" onSubmit={submitAdmin}>
              <Select label="School" placeholder="Select school" value={selectedSchoolId}
                onChange={(schoolId) => setAdminForm({ ...adminForm, schoolId })} options={schoolOptions} searchable />
              <label className="block space-y-1 text-sm"><span>Admin name</span><Input required minLength={2} value={adminForm.name} onChange={(event) => setAdminForm({ ...adminForm, name: event.target.value })} /></label>
              <label className="block space-y-1 text-sm"><span>Admin email</span><Input required type="email" value={adminForm.email} onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })} /></label>
              <PasswordField label="Temporary password" autoComplete="new-password" required value={adminForm.password}
                onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} />
              <Button className="w-full" type="submit" disabled={!selectedSchoolId || pending || loading}><ShieldPlus size={16} />Create admin</Button>
            </form>
          </Card>
        </div>
      </div>

      {selection && (
        <ConfirmationDialog open
          title={`${statusLabel(selection.kind)} school?`}
          description={selection.kind === "delete" ? `Delete ${selectedName} from the school directory?` : `${statusLabel(selection.kind)} access for ${selectedName}?`}
          confirmLabel={statusLabel(selection.kind)} destructive={selection.kind !== "reactivate"}
          isLoading={pending} onCancel={cancelAction} onConfirm={confirmAction} />
      )}
    </>
  );
}

export function SuperAdminFeaturesScreen() {
  const [schools, setSchools] = useState<SchoolRecord[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [revision, setRevision] = useState(0);
  const [schoolError, setSchoolError] = useState("");

  useEffect(() => {
    let current = true;
    void getSchools().then((items) => {
      if (!current) return;
      const available = items.filter((school) => schoolKey(school));
      setSchools(available);
      setSelectedId((previous) => available.some((school) => schoolKey(school) === previous) ? previous : schoolKey(available[0] ?? {}));
    }).catch((caught) => {
      if (current) setSchoolError(caught instanceof Error ? caught.message : "Unable to load schools.");
    });
    return () => { current = false; };
  }, [revision]);

  const options = schools?.map((school) => ({ value: schoolKey(school), label: school.name ?? school.code ?? schoolKey(school) })) ?? [];

  return (
    <>
      <PageHeader title="Feature access" description="Choose which modules a school can use."
        action={<Button type="button" variant="outline" disabled={!schools && !schoolError} onClick={() => {
          setSchools(null);
          setSchoolError("");
          setRevision((current) => current + 1);
        }}><RefreshCw size={16} />Refresh</Button>} />

      {schoolError ? <Card role="alert" className="p-5 text-sm text-danger">{schoolError}</Card>
        : !schools ? <Card role="status" className="p-5 text-sm text-muted">Loading schools…</Card>
        : !options.length ? <Card className="p-5 text-sm text-muted">Create a school before configuring its features.</Card>
        : <SchoolFeatures key={selectedId} schoolId={selectedId} options={options} selectSchool={setSelectedId} />}
    </>
  );
}

function SchoolFeatures({ schoolId, options, selectSchool }: {
  schoolId: string;
  options: Array<{ value: string; label: string }>;
  selectSchool: (id: string) => void;
}) {
  const [features, setFeatures] = useState<SchoolFeatureSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const enabled = schoolFeatures.filter((feature) => features?.[feature.key]).length;

  useEffect(() => {
    if (!schoolId) return;
    let current = true;
    void getSchoolFeatureSettings(schoolId).then((settings) => {
      if (current) setFeatures(settings);
    }).catch((caught) => {
      if (current) setError(caught instanceof Error ? caught.message : "Unable to load feature access.");
    });
    return () => { current = false; };
  }, [schoolId]);

  async function save(next: Partial<SchoolFeatureSettings>, success: string) {
    if (!features || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      setFeatures(await updateSchoolFeatureSettings(schoolId, next));
      setMessage(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Feature access could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  function setAll(checked: boolean) {
    const next = Object.fromEntries(schoolFeatures.map((feature) => [feature.key, checked])) as SchoolFeatureSettings;
    void save(next, checked ? "All features enabled." : "All features disabled.");
  }

  return (
    <>
      {error && <p className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
      {message && <p className="mb-4 rounded-lg bg-success/10 p-3 text-sm text-success" role="status">{message}</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <Card className="p-5">
          <Select label="School" value={schoolId} onChange={selectSchool} options={options} disabled={saving} searchable />
          {features && (
            <>
              <p className="mt-4 text-sm text-muted">{enabled} of {schoolFeatures.length} modules enabled</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="px-3" disabled={saving || enabled === schoolFeatures.length} onClick={() => setAll(true)}>Enable all</Button>
                <Button type="button" variant="outline" className="px-3" disabled={saving || enabled === 0} onClick={() => setAll(false)}>Disable all</Button>
              </div>
            </>
          )}
        </Card>
        <SectionCard title="Modules" description="Changes apply across the selected school's portals.">
          {!features ? <p className="p-5 text-sm text-muted">{error ? "Feature settings are unavailable." : "Loading feature settings…"}</p> : (
            <ul className="divide-y">
              {schoolFeatures.map((feature) => (
                <li key={feature.key} className="flex items-center justify-between gap-4 p-4 sm:p-5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{feature.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{feature.description}</p>
                  </div>
                  <Switch label={feature.label} checked={features[feature.key]} disabled={saving}
                    onCheckedChange={(checked) => void save({ [feature.key]: checked }, "Feature access updated.")} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}

function SchoolTable({ schools, loading, pending, onAction, onSelectAdmin }: {
  schools: SchoolRecord[];
  loading: boolean;
  pending: boolean;
  onAction: (kind: SchoolAction["kind"], school: SchoolRecord) => void;
  onSelectAdmin: (id: string) => void;
}) {
  const pagination = usePaginatedRows(schools, `${schools.length}|${schoolKey(schools[0] ?? {})}|${schoolKey(schools.at(-1) ?? {})}`);
  if (loading) return <p className="p-8 text-center text-sm text-muted" role="status">Loading schools…</p>;
  if (!schools.length) return <p className="p-8 text-center text-sm text-muted">No schools match these filters.</p>;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="bg-surface-muted/70 text-xs uppercase tracking-wide text-muted">
            <tr>{["School", "Contact", "Status", "Actions"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {pagination.rows.map((school) => {
              const id = schoolKey(school);
              const state = schoolStatus(school.status);
              return (
                <tr className="hover:bg-surface-muted/40" key={id || school.name}>
                  <td className="px-4 py-3.5">
                    <p className="font-medium">{school.name ?? "Unnamed school"}</p>
                    {school.code && <p className="mt-1 text-xs text-muted">{school.code}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="break-all">{school.email ?? "—"}</p>
                    {school.phone && <p className="mt-1 text-xs text-muted">{school.phone}</p>}
                  </td>
                  <td className="px-4 py-3.5"><Badge tone={statusTone(school.status)}>{statusLabel(school.status)}</Badge></td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="min-h-9 px-3" disabled={!id || pending} onClick={() => onSelectAdmin(id)}>Add admin</Button>
                      {state !== "other" && (
                        <Button type="button" variant="outline" className="min-h-9 px-3" disabled={!id || pending}
                          onClick={() => onAction(state === "suspended" ? "reactivate" : "suspend", school)}>
                          {state === "suspended" ? "Reactivate" : "Suspend"}
                        </Button>
                      )}
                      <Button type="button" variant="ghost" className="min-h-9 px-3 text-danger" disabled={!id || pending}
                        onClick={() => onAction("delete", school)}><Trash2 size={15} />Delete</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TablePagination label="Schools" total={pagination.total} page={pagination.page} pageCount={pagination.pageCount}
        pageSize={pagination.pageSize} start={pagination.start} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
    </>
  );
}
