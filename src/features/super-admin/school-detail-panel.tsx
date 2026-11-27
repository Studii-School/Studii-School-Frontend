"use client";

import { useEffect, useState } from "react";
import { Building2, Mail, MapPin, Phone, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { SidePanel } from "@/components/ui/side-panel";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/date-utils";
import { getSchoolFeatureSettings, schoolFeatures, type SchoolFeatureSettings, updateSchoolFeatureSettings } from "@/lib/school-features";
import { createSchoolAdmin, getSchool, updateSchool } from "./super-admin.api";
import { schoolKey, schoolStatus, statusLabel, type SchoolFormState, type SchoolRecord } from "./super-admin.types";

export type SchoolPanelTab = "overview" | "features" | "admins";
type SchoolAction = "suspend" | "reactivate" | "delete";

function schoolForm(school: SchoolRecord): SchoolFormState {
  return {
    name: school.name ?? "",
    code: school.code ?? "",
    email: school.email ?? "",
    phone: school.phone ?? "",
    address: school.address ?? "",
  };
}

export function SchoolDetailPanel({ school, initialTab, preview, pending, onClose, onChanged, onAction }: {
  school: SchoolRecord | null;
  initialTab: SchoolPanelTab;
  preview: boolean;
  pending: boolean;
  onClose: () => void;
  onChanged: () => void;
  onAction: (kind: SchoolAction, school: SchoolRecord) => void;
}) {
  return (
    <SidePanel open={Boolean(school)} title={school?.name ?? "School"}
      description={school ? `School code ${school.code || "not set"} · ${statusLabel(school.status)}` : undefined}
      onClose={onClose} maxWidth="xl">
      {school && <SchoolDetailContent key={schoolKey(school)} school={school} initialTab={initialTab} preview={preview}
        pending={pending} onChanged={onChanged} onAction={onAction} />}
    </SidePanel>
  );
}

function SchoolDetailContent({ school, initialTab, preview, pending, onChanged, onAction }: {
  school: SchoolRecord;
  initialTab: SchoolPanelTab;
  preview: boolean;
  pending: boolean;
  onChanged: () => void;
  onAction: (kind: SchoolAction, school: SchoolRecord) => void;
}) {
  const schoolId = schoolKey(school);
  const [tab, setTab] = useState<SchoolPanelTab>(initialTab);
  const [details, setDetails] = useState<SchoolRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => schoolForm(school));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let current = true;
    getSchool(schoolId).then((record) => {
      if (!current) return;
      setDetails(record);
      setForm(schoolForm(record));
      setError("");
    }).catch((caught) => {
      if (current) setError(caught instanceof Error ? caught.message : "School details could not be loaded.");
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [schoolId, revision, school.status]);

  const current = details ?? school;
  const state = schoolStatus(current.status);
  const userCount = current.totalUsers ?? current._count?.users;
  const tabs: Array<{ id: SchoolPanelTab; label: string; icon: typeof Building2 }> = [
    { id: "overview", label: "Details", icon: Building2 },
    { id: "features", label: "Features", icon: SlidersHorizontal },
    { id: "admins", label: "Administrators", icon: Users },
  ];

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || saving) return;
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (name.length < 2 || code.length < 2) {
      setError("School name and code must each have at least two characters.");
      return;
    }
    if (current.email && !form.email.trim()) {
      setError("An existing school email cannot be cleared here. Enter a valid email address to change it.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateSchool(schoolId, {
        name, code,
        ...(form.email.trim() ? { email: form.email.trim().toLowerCase() } : {}),
        phone: form.phone.trim(), address: form.address.trim(),
      });
      setEditing(false);
      setMessage("School details saved.");
      setRevision((value) => value + 1);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "School details could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-surface-muted/50 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Workspace status</p>
          <div className="mt-1 flex items-center gap-2"><Badge tone={state === "active" ? "success" : state === "suspended" ? "warning" : "neutral"}>{statusLabel(current.status)}</Badge><span className="text-xs text-muted">{current.totalUsers ?? current._count?.users ?? "—"} people</span></div>
        </div>
        <p className="text-xs text-muted">Added {current.createdAt ? formatDate(current.createdAt) : "—"}</p>
      </div>

      <div role="tablist" aria-label="School management" className="flex gap-1 overflow-x-auto border-b">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(""); setMessage(""); }}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${tab === id ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success">{message}</p>}

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="font-semibold">School information</h3><p className="mt-1 text-sm text-muted">Contact details and the code used to identify this school.</p></div>
            <Button type="button" variant="outline" disabled={preview || loading || saving} onClick={() => { setEditing((value) => !value); setForm(schoolForm(current)); }}>
              {editing ? "Cancel" : "Edit details"}
            </Button>
          </div>
          {loading ? <p className="text-sm text-muted" role="status">Loading school details…</p> : editing ? (
            <form onSubmit={saveDetails} className="grid gap-4 sm:grid-cols-2">
              <Field label="School name" required value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <Field label="School code" required value={form.code} onChange={(value) => setForm({ ...form, code: value })} />
              <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
              <Field label="Phone" type="tel" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
              <div className="sm:col-span-2"><Field label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} /></div>
              <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div>
            </form>
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info icon={Building2} label="School code" value={current.code} />
              <Info icon={Mail} label="Email" value={current.email} />
              <Info icon={Phone} label="Phone" value={current.phone} />
              <Info icon={MapPin} label="Address" value={current.address} />
            </dl>
          )}

          <div className="rounded-xl border p-4">
            <h3 className="font-semibold">Access and status</h3>
            <p className="mt-1 text-sm leading-6 text-muted">Suspending a school blocks its users from signing in. Only schools with no users can be permanently deleted.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {state !== "other" && <Button type="button" variant="outline" disabled={preview || pending} onClick={() => onAction(state === "suspended" ? "reactivate" : "suspend", current)}>{state === "suspended" ? "Reactivate school" : "Suspend school"}</Button>}
              <Button type="button" variant="ghost" className="text-danger" disabled={preview || pending || userCount !== 0} onClick={() => onAction("delete", current)}>Delete empty school</Button>
            </div>
          </div>
        </div>
      )}

      {tab === "features" && <SchoolFeatures schoolId={schoolId} preview={preview} />}
      {tab === "admins" && <SchoolAdministrators schoolId={schoolId} school={current} preview={preview} onCreated={() => { setRevision((value) => value + 1); onChanged(); }} />}
    </div>
  );
}

function SchoolFeatures({ schoolId, preview }: { schoolId: string; preview: boolean }) {
  const [features, setFeatures] = useState<SchoolFeatureSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let current = true;
    getSchoolFeatureSettings(schoolId).then((settings) => { if (current) setFeatures(settings); })
      .catch((caught) => { if (current) setError(caught instanceof Error ? caught.message : "Feature access could not be loaded."); });
    return () => { current = false; };
  }, [schoolId]);

  async function save(next: Partial<SchoolFeatureSettings>) {
    if (preview || !features || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      setFeatures(await updateSchoolFeatureSettings(schoolId, next));
      setMessage("Feature access saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Feature access could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const enabled = schoolFeatures.filter((feature) => features?.[feature.key]).length;
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-surface-muted/60 p-4">
        <h3 className="font-semibold">Feature access</h3>
        <p className="mt-1 text-sm leading-6 text-muted">Choose the modules this school can use. Changes apply across its admin, teacher, parent and student portals.</p>
        {features && <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><Badge tone="primary">{enabled} of {schoolFeatures.length} enabled</Badge><div className="flex gap-2"><Button type="button" variant="outline" disabled={preview || saving || enabled === schoolFeatures.length} onClick={() => void save(Object.fromEntries(schoolFeatures.map(({ key }) => [key, true])) as SchoolFeatureSettings)}>Enable all</Button><Button type="button" variant="outline" disabled={preview || saving || enabled === 0} onClick={() => void save(Object.fromEntries(schoolFeatures.map(({ key }) => [key, false])) as SchoolFeatureSettings)}>Disable all</Button></div></div>}
      </div>
      {error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success">{message}</p>}
      {!features ? !error && <p role="status" className="text-sm text-muted">Loading features…</p> : (
        <ul className="divide-y rounded-xl border">
          {schoolFeatures.map((feature) => (
            <li key={feature.key} className="flex items-start justify-between gap-4 p-4">
              <div><p className="text-sm font-semibold">{feature.label}</p><p className="mt-1 text-xs leading-5 text-muted">{feature.description}</p></div>
              <Switch label={feature.label} checked={features[feature.key]} disabled={preview || saving} onCheckedChange={(checked) => void save({ [feature.key]: checked })} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SchoolAdministrators({ schoolId, school, preview, onCreated }: { schoolId: string; school: SchoolRecord; preview: boolean; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await createSchoolAdmin({ schoolId, name: name.trim(), email: email.trim().toLowerCase(), password });
      setName(""); setEmail(""); setPassword("");
      setMessage("Administrator created.");
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Administrator could not be created.");
    } finally {
      setSaving(false);
    }
  }

  const admins = school.schoolAdmins ?? school.admins ?? [];
  return (
    <div className="space-y-5">
      <div><h3 className="font-semibold">School administrators</h3><p className="mt-1 text-sm text-muted">People who can manage this school workspace.</p></div>
      {admins.length ? <ul className="divide-y rounded-xl border">{admins.map((admin) => <li key={admin.id ?? admin.email} className="flex items-center gap-3 p-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><ShieldCheck size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{admin.name ?? "School admin"}</p><p className="break-all text-xs text-muted">{admin.email ?? "No email"}</p></div></li>)}</ul>
        : <p className="rounded-xl border border-dashed p-4 text-sm text-muted">No administrators are listed for this school.</p>}
      <form onSubmit={submit} className="space-y-4 rounded-xl border p-4">
        <div><h4 className="font-semibold">Add an administrator</h4><p className="mt-1 text-xs leading-5 text-muted">Create a login for someone who will manage this school.</p></div>
        {schoolStatus(school.status) === "suspended" && <p className="text-sm text-warning">Reactivate this school before adding an administrator.</p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {message && <p role="status" className="text-sm text-success">{message}</p>}
        <fieldset disabled={preview || saving || schoolStatus(school.status) === "suspended"} className="space-y-4">
          <Field label="Full name" required value={name} onChange={setName} />
          <Field label="Email" type="email" required value={email} onChange={setEmail} />
          <PasswordField label="Temporary password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create administrator"}</Button>
        </fieldset>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{label}</span><Input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Info({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value?: string }) {
  return <div className="flex min-w-0 items-start gap-3 rounded-xl border p-3"><Icon size={17} className="mt-0.5 shrink-0 text-primary" /><div className="min-w-0"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value || "Not provided"}</dd></div></div>;
}
