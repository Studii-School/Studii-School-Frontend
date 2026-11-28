"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, GraduationCap, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getSchoolSettings } from "@/features/school-settings/school-settings.storage";
import type { SchoolSettings } from "@/features/school-settings/school-settings.types";
import { formatDate } from "@/lib/date-utils";
import { getSchoolFeatureSettings, schoolFeatures, type SchoolFeatureSettings, updateSchoolFeatureSettings } from "@/lib/school-features";
import { isSuperAdminPreview } from "@/lib/super-admin-preview";
import { approveSchoolOnboarding, deleteSchool, getSchool, getSchoolClassSummaries, reactivateSchool, suspendSchool, updateSchool, type SchoolClassSummary } from "./super-admin.api";
import { schoolStatus, statusLabel, type SchoolFormState, type SchoolRecord } from "./super-admin.types";

type SchoolAction = "approve" | "suspend" | "reactivate" | "delete";

function schoolForm(school: SchoolRecord): SchoolFormState {
  return {
    name: school.name ?? "", code: school.code ?? "", email: school.email ?? "",
    phone: school.phone ?? "", address: school.address ?? "",
  };
}

function publicUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div className="min-w-0 border-b pb-3 last:border-0 last:pb-0"><dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value || "Not provided"}</dd></div>;
}

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return <div className="flex items-center gap-3 rounded-xl border p-3"><span className="size-10 shrink-0 rounded-lg border" style={{ backgroundColor: color }} /><span><span className="block text-xs text-muted">{label}</span><strong className="text-sm">{color.toUpperCase()}</strong></span></div>;
}

export function SchoolDetailScreen({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [school, setSchool] = useState<SchoolRecord | null>(null);
  const [profile, setProfile] = useState<SchoolSettings | null>(null);
  const [classes, setClasses] = useState<SchoolClassSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [classError, setClassError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SchoolFormState>({ name: "", code: "", email: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<SchoolAction | null>(null);
  const [pending, setPending] = useState(false);
  const preview = isSuperAdminPreview();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const results = await Promise.allSettled([
        getSchool(schoolId), getSchoolSettings(schoolId), getSchoolClassSummaries(schoolId),
      ] as const);
      if (!active) return;
      const [schoolResult, profileResult, classResult] = results;
      if (schoolResult.status === "fulfilled") {
        setSchool(schoolResult.value);
        setForm(schoolForm(schoolResult.value));
        setError("");
      } else { setSchool(null); setError(schoolResult.reason instanceof Error ? schoolResult.reason.message : "School details could not be loaded."); }
      if (profileResult.status === "fulfilled") { setProfile(profileResult.value); setProfileError(""); }
      else { setProfile(null); setProfileError(profileResult.reason instanceof Error ? profileResult.reason.message : "School settings could not be loaded."); }
      if (classResult.status === "fulfilled") { setClasses(classResult.value); setClassError(""); }
      else { setClasses(null); setClassError(classResult.reason instanceof Error ? classResult.reason.message : "Classes could not be loaded."); }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [schoolId, revision]);

  const refresh = useCallback(() => { setLoading(true); setRevision((value) => value + 1); }, []);

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || saving || !school) return;
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (name.length < 2 || code.length < 2) { setError("School name and code must each have at least two characters."); return; }
    if (school.email && !form.email.trim()) { setError("Enter a valid school email address."); return; }
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
      refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "School details could not be saved."); }
    finally { setSaving(false); }
  }

  async function confirmAction() {
    if (!action || !school || preview || pending) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (action === "approve") {
        const response = await approveSchoolOnboarding(schoolId);
        const approved = "school" in response ? response.school : response;
        if (schoolStatus(approved.status) !== "active") throw new Error("The API did not confirm approval. Refresh this school before trying again.");
      } else if (action === "suspend") await suspendSchool(schoolId);
      else if (action === "reactivate") await reactivateSchool(schoolId);
      else await deleteSchool(schoolId);
      const completed = action;
      setAction(null);
      if (completed === "delete") { router.replace("/super-admin/schools"); return; }
      setMessage(completed === "approve" ? "School profile approved." : completed === "suspend" ? "School suspended." : "School reactivated.");
      refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The action could not be completed."); setAction(null); }
    finally { setPending(false); }
  }

  const state = schoolStatus(school?.status);
  const logo = publicUrl(profile?.logoUrl) ?? publicUrl(profile?.crestUrl);
  const displayName = preview && profile?.name === "School"
    ? school?.name || "Unnamed school"
    : profile?.name || school?.name || "Unnamed school";
  const userCount = school?.totalUsers ?? school?._count?.users;

  return <>
    <PageHeader title={school?.name || "School profile"} description="School profile and workspace overview" showBack backFallback="/super-admin/schools"
      action={<Button type="button" variant="outline" disabled={loading} onClick={refresh}><RefreshCw size={16} />Refresh</Button>} />
    {error && <Card role="alert" className="mb-5 p-4 text-sm text-danger">{error}</Card>}
    {message && <Card role="status" className="mb-5 p-4 text-sm text-success">{message}</Card>}
    {loading && !school ? <Card role="status" className="p-8 text-sm text-muted">Loading school profile…</Card> : !school ?
      <Card className="p-8 text-sm text-muted">This school could not be found. Return to the school directory and choose another school.</Card> : <div className="space-y-5">
        <Card className="overflow-hidden">
          <div className="h-3" style={{ background: `linear-gradient(90deg, ${profile?.branding.primaryColor ?? "#0B6B68"}, ${profile?.branding.secondaryColor ?? "#102B3E"}, ${profile?.branding.accentColor ?? "#F3C664"})` }} />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-surface-muted">
              {logo ? <Image unoptimized src={logo} alt={`${displayName} logo`} width={96} height={96} className="size-full object-contain p-2" /> : <Building2 size={36} className="text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3"><h2 className="break-words text-2xl font-bold">{displayName}</h2><Badge tone={state === "active" ? "success" : state === "review" || state === "suspended" ? "warning" : "neutral"}>{statusLabel(school.status)}</Badge></div>
              {profile?.motto && <p className="mt-2 text-sm font-medium text-primary">{profile.motto}</p>}
              {profile?.slogan && <p className="mt-1 text-sm text-muted">{profile.slogan}</p>}
              {profile?.description && <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{profile.description}</p>}
            </div>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Classes", value: classes ? classes.length : "—", icon: GraduationCap },
            { label: "Active classes", value: classes ? classes.filter((item) => item.status?.toUpperCase() === "ACTIVE").length : "—", icon: Users },
            { label: "Current session", value: profile?.currentAcademicSession || "—", icon: CalendarDays },
            { label: "School code", value: school.code || "—", icon: ShieldCheck },
          ].map(({ label, value, icon: Icon }) => <Card key={label} className="flex items-start justify-between gap-3 p-4"><div><p className="text-xs text-muted">{label}</p><p className="mt-2 break-words text-lg font-bold tabular-nums">{value}</p></div><Icon size={19} className="shrink-0 text-primary" /></Card>)}
        </div>

        {profileError && <Card role="alert" className="p-4 text-sm text-danger">School settings are unavailable: {profileError}</Card>}

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <SectionCard title="School identity" description="Details supplied by the school and its workspace record."
            action={<Button type="button" variant="outline" disabled={preview || loading || saving} onClick={() => { setEditing((value) => !value); setForm(schoolForm(school)); }}>{editing ? "Cancel" : "Edit workspace"}</Button>}>
            {editing ? <form onSubmit={saveDetails} className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="School name" required value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <Field label="School code" required value={form.code} onChange={(value) => setForm({ ...form, code: value })} />
              <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
              <Field label="Phone" type="tel" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
              <div className="sm:col-span-2"><Field label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} /></div>
              <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div>
            </form> : <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
              <Info label="Short name" value={profile?.shortName} /><Info label="School code" value={school.code} />
              <Info label="School type" value={profile?.schoolType} /><Info label="Ownership" value={profile?.ownershipType} />
              <Info label="School levels" value={profile?.schoolLevels.join(", ")} /><Info label="Established" value={profile?.establishedYear} />
              <Info label="Workspace created" value={school.createdAt ? formatDate(school.createdAt) : undefined} />
              <Info label="Last updated" value={school.updatedAt ? formatDate(school.updatedAt) : undefined} />
            </dl>}
          </SectionCard>
          <SectionCard title="Contact and location" description="Official school contact details.">
            <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
              <Info label="Official email" value={profile?.email || school.email} /><Info label="Primary phone" value={profile?.primaryPhone || school.phone} />
              <Info label="Secondary phone" value={profile?.secondaryPhone} /><Info label="Website" value={publicUrl(profile?.website) ? <a className="text-primary underline" href={publicUrl(profile?.website)!} target="_blank" rel="noreferrer">{profile?.website}</a> : profile?.website} />
              <Info label="Address" value={profile?.address || school.address} /><Info label="City" value={profile?.city} />
              <Info label="State" value={profile?.state} /><Info label="Country" value={profile?.country} />
            </dl>
          </SectionCard>
          <SectionCard title="Academic period" description="The session and term recorded in school settings.">
            <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
              <Info label="Current session" value={profile?.currentAcademicSession} /><Info label="Current term" value={profile?.currentTerm} />
              <Info label="Term starts" value={profile?.resumptionDate ? formatDate(profile.resumptionDate) : undefined} />
              <Info label="Term ends" value={profile?.closingDate ? formatDate(profile.closingDate) : undefined} />
            </dl>
          </SectionCard>
          <SectionCard title="Branding" description="The school’s saved colours and image assets.">
            <div className="space-y-4 p-5">
              {profile ? <div className="grid gap-3 sm:grid-cols-3"><ColorSwatch label="Primary" color={profile.branding.primaryColor} /><ColorSwatch label="Secondary" color={profile.branding.secondaryColor} /><ColorSwatch label="Accent" color={profile.branding.accentColor} /></div> : <p className="text-sm text-muted">Brand colours are unavailable.</p>}
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2"><Info label="Logo" value={profile?.logoUrl ? "Added" : undefined} /><Info label="Crest" value={profile?.crestUrl ? "Added" : undefined} /><Info label="Browser icon" value={profile?.faviconUrl ? "Added" : undefined} /></dl>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Classes" description="Class structure and enrolment counts only. Student and staff records are not shown.">
          {classError ? <p role="alert" className="p-5 text-sm text-danger">Class information is unavailable: {classError}</p>
            : !classes ? <p role="status" className="p-5 text-sm text-muted">Loading classes…</p>
            : !classes.length ? <p className="p-5 text-sm text-muted">No classes are listed for this school.</p>
            : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Class</th><th className="px-4 py-3">Level</th><th className="px-4 py-3">Academic year</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{classes.map((item) => <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.name}</td><td className="px-4 py-3">{item.level?.replaceAll("_", " ") || "—"}</td><td className="px-4 py-3">{item.academicYear || "—"}</td><td className="px-4 py-3 tabular-nums">{item.studentCount ?? "Unavailable"}</td><td className="px-4 py-3 tabular-nums">{item.capacity ?? "—"}</td><td className="px-4 py-3">{item.status ? statusLabel(item.status) : "—"}</td></tr>)}</tbody></table></div>}
        </SectionCard>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <SectionCard title="Workspace access" description="Review and manage this school’s status.">
            <div className="space-y-4 p-5"><div className="flex flex-wrap items-center gap-3"><Badge tone={state === "active" ? "success" : state === "review" || state === "suspended" ? "warning" : "neutral"}>{statusLabel(school.status)}</Badge><span className="text-sm text-muted">{userCount ?? "—"} people in workspace</span></div>
              <p className="text-sm text-muted">Approving a reviewed profile enables student and staff setup. Suspending a school blocks sign-in.</p>
              <div className="flex flex-wrap gap-2">
                {state === "review" && <Button type="button" disabled={preview || pending || !profile} onClick={() => setAction("approve")}>Approve profile</Button>}
                {state !== "other" && <Button type="button" variant="outline" disabled={preview || pending} onClick={() => setAction(state === "suspended" ? "reactivate" : "suspend")}>{state === "suspended" ? "Reactivate school" : "Suspend school"}</Button>}
                <Button type="button" variant="ghost" className="text-danger" disabled={preview || pending || userCount !== 0} onClick={() => setAction("delete")}>Delete empty school</Button>
              </div>
            </div>
          </SectionCard>
          <SchoolFeatures schoolId={schoolId} preview={preview} />
        </div>
      </div>}

    {action && school && <ConfirmationDialog open title={action === "approve" ? "Approve school profile?" : `${statusLabel(action)} school?`}
      description={action === "approve" ? `Approve ${school.name ?? "this school"} and allow student and staff setup?` : action === "delete" ? `Permanently delete ${school.name ?? "this school"}? This cannot be undone.` : action === "suspend" ? `Suspend ${school.name ?? "this school"}? Its users will be unable to sign in.` : `Reactivate ${school.name ?? "this school"} and restore access?`}
      confirmLabel={action === "approve" ? "Approve profile" : action === "delete" ? "Delete permanently" : statusLabel(action)} destructive={action === "delete" || action === "suspend"}
      isLoading={pending} onCancel={() => setAction(null)} onConfirm={() => void confirmAction()} />}
  </>;
}

function SchoolFeatures({ schoolId, preview }: { schoolId: string; preview: boolean }) {
  const [features, setFeatures] = useState<SchoolFeatureSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getSchoolFeatureSettings(schoolId).then((value) => { if (active) setFeatures(value); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Feature access could not be loaded."); });
    return () => { active = false; };
  }, [schoolId]);

  async function save(next: Partial<SchoolFeatureSettings>) {
    if (preview || !features || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try { setFeatures(await updateSchoolFeatureSettings(schoolId, next)); setMessage("Feature access saved."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Feature access could not be saved."); }
    finally { setSaving(false); }
  }

  const enabled = schoolFeatures.filter((item) => features?.[item.key]).length;
  return <SectionCard title="Feature access" description="Modules enabled for this school.">
    <div className="p-5">
      {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="mb-3 text-sm text-success">{message}</p>}
      {!features ? !error && <p role="status" className="text-sm text-muted">Loading features…</p> : <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Badge tone="primary">{enabled} of {schoolFeatures.length} enabled</Badge><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={preview || saving || enabled === schoolFeatures.length} onClick={() => void save(Object.fromEntries(schoolFeatures.map(({ key }) => [key, true])) as SchoolFeatureSettings)}>Enable all</Button><Button type="button" variant="outline" disabled={preview || saving || enabled === 0} onClick={() => void save(Object.fromEntries(schoolFeatures.map(({ key }) => [key, false])) as SchoolFeatureSettings)}>Disable all</Button></div></div>
        <ul className="divide-y rounded-xl border">{schoolFeatures.map((item) => <li key={item.key} className="flex items-center justify-between gap-3 py-3 px-4"><span className="text-sm font-medium">{item.label}</span><Switch label={item.label} checked={features[item.key]} disabled={preview || saving} onCheckedChange={(checked) => void save({ [item.key]: checked })} /></li>)}</ul>
      </>}
    </div>
  </SectionCard>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{label}</span><Input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
