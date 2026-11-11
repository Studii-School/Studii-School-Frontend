"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Plus, RefreshCw, ShieldPlus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { SearchInput } from "@/components/shared/search-input";
import { DashboardQuickLinks } from "@/features/dashboard-customisation/dashboard-quick-links";
import { DEFAULT_SCHOOL_ID, getSchoolFeatureSettings, loadSchoolFeatureSettings, schoolFeatures, type SchoolFeatureSettings, updateSchoolFeatureSettings } from "@/lib/school-features";
import { createSchool, createSchoolAdmin, deleteSchool, getSchools, reactivateSchool, suspendSchool } from "./super-admin.api";
import type { SchoolAdminFormState, SchoolFormState, SchoolRecord } from "./super-admin.types";

const emptySchool: SchoolFormState = { name: "", code: "", email: "", phone: "", address: "" };
const emptyAdmin: SchoolAdminFormState = { schoolId: "", name: "", email: "", password: "" };

function schoolKey(school: SchoolRecord) {
  return school.id ?? school.schoolId ?? "";
}

function statusTone(status?: string) {
  const value = status?.toLowerCase() ?? "";
  if (value.includes("active")) return "success";
  if (value.includes("suspend") || value.includes("inactive")) return "warning";
  return "neutral";
}

function matchesSchool(query: string, school: SchoolRecord) {
  const target = [school.name, school.code, school.email, school.phone, school.status].join(" ").toLowerCase();
  return target.includes(query.trim().toLowerCase());
}

function featureSchoolOptions(schools: SchoolRecord[]) {
  const options = schools.map((school) => ({ id: schoolKey(school), label: school.name ?? school.code ?? schoolKey(school) })).filter((item) => item.id);
  if (!options.some((item) => item.id === DEFAULT_SCHOOL_ID)) options.unshift({ id: DEFAULT_SCHOOL_ID, label: "Selected school" });
  return options;
}

export function SuperAdminDashboardScreen() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const activeSchools = schools.filter((school) => statusTone(school.status) === "success").length;
  const suspendedSchools = schools.filter((school) => statusTone(school.status) === "warning").length;

  useEffect(() => {
    let mounted = true;
    getSchools()
      .then((items) => { if (mounted) setSchools(items); })
      .catch(() => { if (mounted) setError("Unable to load school statistics. Please refresh to try again."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <PageHeader title="Super admin" description="Manage schools, platform access and school administrators." action={<DashboardQuickLinks />} />
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Total schools", value: schools.length, icon: Building2, tone: "text-primary" },
            { label: "Active schools", value: activeSchools, icon: CheckCircle2, tone: "text-success" },
            { label: "Suspended schools", value: suspendedSchools, icon: ShieldPlus, tone: "text-warning" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted">{label}</p><Icon className={tone} size={18} /></div>
              <p className="mt-2 text-xl font-bold">{loading ? "..." : value}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export function SuperAdminSchoolsScreen() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [query, setQuery] = useState("");
  const [schoolForm, setSchoolForm] = useState(emptySchool);
  const [adminForm, setAdminForm] = useState(emptyAdmin);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => schools.filter((school) => !query.trim() || matchesSchool(query, school)), [query, schools]);

  async function loadSchools() {
    setLoading(true);
    setError("");
    try {
      const data = await getSchools();
      setSchools(data);
      const firstSchoolId = schoolKey(data[0] ?? {});
      setAdminForm((current) => ({ ...current, schoolId: current.schoolId || firstSchoolId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load schools");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadSchools);
  }, []);

  async function runAction(label: string, action: () => Promise<unknown>, success: string) {
    setPending(label);
    setMessage("");
    setError("");
    try {
      await action();
      setMessage(success);
      await loadSchools();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPending("");
    }
  }

  async function submitSchool(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction("create-school", () => createSchool(schoolForm), "School created.");
    setSchoolForm(emptySchool);
  }

  async function submitAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const schoolId = adminForm.schoolId;
    await runAction("create-admin", () => createSchoolAdmin(adminForm), "School admin created.");
    setAdminForm({ ...emptyAdmin, schoolId });
  }

  return (
    <>
      <PageHeader title="Schools" description="Create schools, manage lifecycle status and add school administrators." action={<Button type="button" variant="outline" onClick={loadSchools} disabled={loading}><RefreshCw size={16} />Refresh</Button>} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <SectionCard title="All schools" description={`${filtered.length} visible`} action={<Badge tone="primary">{schools.length} total</Badge>}>
          <div className="border-b p-4"><SearchInput value={query} onChange={setQuery} placeholder="Search schools" /></div>
          {error && <p className="border-b bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>}
          {message && <p className="border-b bg-green-50 px-4 py-3 text-sm text-success">{message}</p>}
          <SchoolTable schools={filtered} loading={loading} onSuspend={(id) => runAction(`suspend-${id}`, () => suspendSchool(id), "School suspended.")} onReactivate={(id) => runAction(`reactivate-${id}`, () => reactivateSchool(id), "School reactivated.")} onDelete={(id) => runAction(`delete-${id}`, () => deleteSchool(id), "School deleted.")} pending={pending} />
        </SectionCard>
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Create school</h2>
            <form className="mt-4 space-y-3" onSubmit={submitSchool}>
              <Input required placeholder="School name" value={schoolForm.name} onChange={(event) => setSchoolForm({ ...schoolForm, name: event.target.value })} />
              <Input placeholder="School code" value={schoolForm.code} onChange={(event) => setSchoolForm({ ...schoolForm, code: event.target.value })} />
              <Input type="email" placeholder="School email" value={schoolForm.email} onChange={(event) => setSchoolForm({ ...schoolForm, email: event.target.value })} />
              <Input placeholder="Phone" value={schoolForm.phone} onChange={(event) => setSchoolForm({ ...schoolForm, phone: event.target.value })} />
              <Input placeholder="Address" value={schoolForm.address} onChange={(event) => setSchoolForm({ ...schoolForm, address: event.target.value })} />
              <Button className="w-full" type="submit" disabled={pending === "create-school"}><Plus size={16} />Create school</Button>
            </form>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Add school admin</h2>
            <form className="mt-4 space-y-3" onSubmit={submitAdmin}>
              <select className="h-11 w-full rounded-[10px] border bg-surface px-3 text-sm" required value={adminForm.schoolId} onChange={(event) => setAdminForm({ ...adminForm, schoolId: event.target.value })}>
                <option value="">Select school</option>
                {schools.map((school) => <option key={schoolKey(school)} value={schoolKey(school)}>{school.name ?? school.code ?? schoolKey(school)}</option>)}
              </select>
              <Input required minLength={2} placeholder="Admin name" value={adminForm.name} onChange={(event) => setAdminForm({ ...adminForm, name: event.target.value })} />
              <Input required type="email" placeholder="Admin email" value={adminForm.email} onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })} />
              <PasswordField label="Temporary password" required value={adminForm.password} onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} />
              <Button className="w-full" type="submit" disabled={pending === "create-admin"}><ShieldPlus size={16} />Create admin</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

export function SuperAdminFeaturesScreen() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(DEFAULT_SCHOOL_ID);
  const [featureSettings, setFeatureSettings] = useState<SchoolFeatureSettings>(() => loadSchoolFeatureSettings(DEFAULT_SCHOOL_ID));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const schoolOptions = useMemo(() => featureSchoolOptions(schools), [schools]);
  const selectedSchool = schoolOptions.find((school) => school.id === selectedSchoolId);
  const enabledFeatureCount = schoolFeatures.filter((feature) => featureSettings[feature.key] !== false).length;

  async function loadFeatureSchools() {
    setLoading(true);
    setError("");
    try {
      const data = await getSchools();
      setSchools(data);
      const schoolIds = data.map((school) => schoolKey(school)).filter(Boolean);
      setSelectedSchoolId((current) => schoolIds.includes(current) ? current : schoolIds[0] || DEFAULT_SCHOOL_ID);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load schools");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadFeatureSchools);
  }, []);

  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(() => {
      if (!mounted) return;
      setFeatureSettings(loadSchoolFeatureSettings(selectedSchoolId));
      setError("");
    });
    getSchoolFeatureSettings(selectedSchoolId)
      .then((settings) => {
        if (mounted) setFeatureSettings(settings);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Unable to load feature access");
      });
    return () => {
      mounted = false;
    };
  }, [selectedSchoolId]);

  async function toggleFeature(feature: keyof SchoolFeatureSettings, enabled: boolean) {
    const previous = featureSettings;
    const next = { ...featureSettings, [feature]: enabled };
    setFeatureSettings(next);
    setError("");
    setMessage("");
    try {
      const saved = await updateSchoolFeatureSettings(selectedSchoolId, { [feature]: enabled });
      setFeatureSettings(saved);
      setMessage("Feature access updated.");
    } catch (err) {
      setFeatureSettings(previous);
      setError(err instanceof Error ? err.message : "Feature access could not be updated.");
    }
  }

  async function setAll(enabled: boolean) {
    const previous = featureSettings;
    const next = schoolFeatures.reduce((settings, feature) => ({ ...settings, [feature.key]: enabled }), {} as SchoolFeatureSettings);
    setFeatureSettings(next);
    setError("");
    setMessage("");
    try {
      const saved = await updateSchoolFeatureSettings(selectedSchoolId, next);
      setFeatureSettings(saved);
      setMessage(enabled ? "All features enabled." : "All features disabled.");
    } catch (err) {
      setFeatureSettings(previous);
      setError(err instanceof Error ? err.message : "Feature access could not be updated.");
    }
  }

  return (
    <>
      <PageHeader title="Feature access" description="Turn modules on or off for each school and every connected role." action={<Button type="button" variant="outline" onClick={loadFeatureSchools} disabled={loading}><RefreshCw size={16} />Refresh</Button>} />
      {error && <p className="mb-4 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>}
      {message && <p className="mb-4 rounded-[8px] border border-green-100 bg-green-50 px-4 py-3 text-sm text-success">{message}</p>}
      <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">School</h2>
          <select className="mt-4 h-11 w-full rounded-[10px] border bg-surface px-3 text-sm" value={selectedSchoolId} onChange={(event) => setSelectedSchoolId(event.target.value)}>
            {schoolOptions.map((school) => <option key={school.id} value={school.id}>{school.label}</option>)}
          </select>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3"><dt className="text-muted">Selected</dt><dd className="truncate font-medium">{selectedSchool?.label ?? selectedSchoolId}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted">Modules</dt><dd><Badge tone={enabledFeatureCount === schoolFeatures.length ? "success" : "warning"}>{enabledFeatureCount}/{schoolFeatures.length} enabled</Badge></dd></div>
          </dl>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="min-h-10 px-3" onClick={() => setAll(true)}>Enable all</Button>
            <Button type="button" variant="outline" className="min-h-10 px-3" onClick={() => setAll(false)}>Disable all</Button>
          </div>
        </Card>
        <SectionCard title="Modules" description="Changes apply to admin, teacher, student and parent portals for this school.">
          <div className="divide-y">
            {schoolFeatures.map((feature) => {
              const enabled = featureSettings[feature.key] !== false;
              return (
                <div key={feature.key} className="flex items-center justify-between gap-5 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{feature.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{feature.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-xs font-medium text-muted sm:inline">{enabled ? "Enabled" : "Off"}</span>
                    <Switch label={`${enabled ? "Disable" : "Enable"} ${feature.label}`} checked={enabled} onCheckedChange={(checked) => void toggleFeature(feature.key, checked)} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function SchoolTable({ schools, loading, onSuspend, onReactivate, onDelete, pending }: { schools: SchoolRecord[]; loading: boolean; onSuspend?: (id: string) => void; onReactivate?: (id: string) => void; onDelete?: (id: string) => void; pending?: string }) {
  if (loading) return <p className="p-8 text-center text-sm text-muted">Loading schools...</p>;
  if (!schools.length) return <p className="p-8 text-center text-sm text-muted">No schools found.</p>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-surface-muted/70 text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3 font-medium">School</th><th className="px-4 py-3 font-medium">Contact</th><th className="px-4 py-3 font-medium">Status</th>{onSuspend && <th className="px-4 py-3 font-medium">Actions</th>}</tr></thead><tbody className="divide-y">{schools.map((school) => { const id = schoolKey(school); const suspended = statusTone(school.status) === "warning"; return <tr className="hover:bg-surface-muted/40" key={id || school.name}><td className="px-4 py-3.5"><p className="font-medium">{school.name ?? "Unnamed school"}</p><p className="mt-0.5 text-xs text-muted">{school.code ?? id}</p></td><td className="px-4 py-3.5"><p>{school.email ?? "No email"}</p><p className="mt-0.5 text-xs text-muted">{school.phone ?? school.address ?? "No phone"}</p></td><td className="px-4 py-3.5"><Badge tone={statusTone(school.status)}>{school.status ?? "Unknown"}</Badge></td>{onSuspend && <td className="px-4 py-3.5"><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-9 px-3" disabled={!id || pending === `suspend-${id}` || pending === `reactivate-${id}`} onClick={() => suspended ? onReactivate?.(id) : onSuspend?.(id)}>{suspended ? "Reactivate" : "Suspend"}</Button><Button type="button" variant="danger" className="min-h-9 px-3" disabled={!id || pending === `delete-${id}`} onClick={() => onDelete?.(id)}><Trash2 size={15} />Delete</Button></div></td>}</tr>; })}</tbody></table></div>;
}
