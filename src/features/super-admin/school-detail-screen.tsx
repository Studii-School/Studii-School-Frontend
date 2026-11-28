"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Building2, CalendarDays, GraduationCap, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { pageTabClass } from "@/components/ui/tabs";
import { getSchoolSettings } from "@/features/school-settings/school-settings.storage";
import type { SchoolSettings } from "@/features/school-settings/school-settings.types";
import { formatDate } from "@/lib/date-utils";
import { getSchoolFeatureSettings, schoolFeatures, type SchoolFeatureSettings } from "@/lib/school-features";
import { isSuperAdminPreview } from "@/lib/super-admin-preview";
import { getSchool, getSchoolClassSummaries, type SchoolClassSummary } from "./super-admin.api";
import { schoolStatus, statusLabel, type SchoolRecord } from "./super-admin.types";

type DetailTab = "profile" | "academics";

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
  const [school, setSchool] = useState<SchoolRecord | null>(null);
  const [profile, setProfile] = useState<SchoolSettings | null>(null);
  const [classes, setClasses] = useState<SchoolClassSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [classError, setClassError] = useState("");
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<DetailTab>("profile");
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

        <div role="tablist" aria-label="School profile sections" className="portal-page-tabs max-w-full overflow-x-auto" onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next: DetailTab = event.key === "Home" ? "profile" : event.key === "End" ? "academics" : tab === "profile" ? "academics" : "profile";
          setTab(next);
          event.currentTarget.querySelector<HTMLButtonElement>(`#school-tab-${next}`)?.focus();
        }}>
          <div className="flex min-w-max gap-1 border-b">
            {([["profile", "Profile"], ["academics", "Academics & settings"]] as const).map(([key, label]) =>
              <button key={key} id={`school-tab-${key}`} type="button" role="tab" aria-selected={tab === key} aria-controls={`school-panel-${key}`} tabIndex={tab === key ? 0 : -1} onClick={() => setTab(key)} className={pageTabClass(tab === key)}>{label}</button>)}
          </div>
        </div>

        <div id="school-panel-profile" role="tabpanel" aria-labelledby="school-tab-profile" tabIndex={0} hidden={tab !== "profile"} className="space-y-5">
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <SectionCard title="School identity" description="Details supplied by the school and its workspace record.">
              <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
                <Info label="Short name" value={profile?.shortName} /><Info label="School code" value={school.code} />
                <Info label="School type" value={profile?.schoolType} /><Info label="Ownership" value={profile?.ownershipType} />
                <Info label="School levels" value={profile?.schoolLevels.join(", ")} /><Info label="Established" value={profile?.establishedYear} />
                <Info label="Workspace created" value={school.createdAt ? formatDate(school.createdAt) : undefined} />
                <Info label="Last updated" value={school.updatedAt ? formatDate(school.updatedAt) : undefined} />
              </dl>
            </SectionCard>
            <SectionCard title="Contact and location" description="Official school contact details.">
              <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
                <Info label="Official email" value={profile?.email || school.email} /><Info label="Primary phone" value={profile?.primaryPhone || school.phone} />
                <Info label="Secondary phone" value={profile?.secondaryPhone} /><Info label="Website" value={publicUrl(profile?.website) ? <a className="text-primary underline" href={publicUrl(profile?.website)!} target="_blank" rel="noreferrer">{profile?.website}</a> : profile?.website} />
                <Info label="Address" value={profile?.address || school.address} /><Info label="City" value={profile?.city} />
                <Info label="State" value={profile?.state} /><Info label="Country" value={profile?.country} />
              </dl>
            </SectionCard>
            <div className="xl:col-span-2">
              <SectionCard title="Branding" description="The school’s saved colours and image assets.">
                <div className="space-y-4 p-5">
                  {profile ? <div className="grid gap-3 sm:grid-cols-3"><ColorSwatch label="Primary" color={profile.branding.primaryColor} /><ColorSwatch label="Secondary" color={profile.branding.secondaryColor} /><ColorSwatch label="Accent" color={profile.branding.accentColor} /></div> : <p className="text-sm text-muted">Brand colours are unavailable.</p>}
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2"><Info label="Logo" value={profile?.logoUrl ? "Added" : undefined} /><Info label="Crest" value={profile?.crestUrl ? "Added" : undefined} /><Info label="Browser icon" value={profile?.faviconUrl ? "Added" : undefined} /></dl>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>

        <div id="school-panel-academics" role="tabpanel" aria-labelledby="school-tab-academics" tabIndex={0} hidden={tab !== "academics"} className="space-y-5">
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <SectionCard title="Academic period" description="The session and term recorded in school settings.">
              <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
                <Info label="Current session" value={profile?.currentAcademicSession} /><Info label="Current term" value={profile?.currentTerm} />
                <Info label="Term starts" value={profile?.resumptionDate ? formatDate(profile.resumptionDate) : undefined} />
                <Info label="Term ends" value={profile?.closingDate ? formatDate(profile.closingDate) : undefined} />
              </dl>
            </SectionCard>
            <SectionCard title="Workspace access" description="Current workspace status and account count.">
              <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
                <Info label="Status" value={<Badge tone={state === "active" ? "success" : state === "review" || state === "suspended" ? "warning" : "neutral"}>{statusLabel(school.status)}</Badge>} />
                <Info label="People in workspace" value={userCount ?? "—"} />
              </dl>
            </SectionCard>
          </div>

          <SectionCard title="Classes" description="Class structure and enrolment counts only. Student and staff records are not shown.">
            {classError ? <p role="alert" className="p-5 text-sm text-danger">Class information is unavailable: {classError}</p>
              : !classes ? <p role="status" className="p-5 text-sm text-muted">Loading classes…</p>
              : !classes.length ? <p className="p-5 text-sm text-muted">No classes are listed for this school.</p>
              : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Class</th><th className="px-4 py-3">Level</th><th className="px-4 py-3">Academic year</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{classes.map((item) => <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.name}</td><td className="px-4 py-3">{item.level?.replaceAll("_", " ") || "—"}</td><td className="px-4 py-3">{item.academicYear || "—"}</td><td className="px-4 py-3 tabular-nums">{item.studentCount ?? "Unavailable"}</td><td className="px-4 py-3 tabular-nums">{item.capacity ?? "—"}</td><td className="px-4 py-3">{item.status ? statusLabel(item.status) : "—"}</td></tr>)}</tbody></table></div>}
          </SectionCard>

          <SchoolFeatures schoolId={schoolId} />
        </div>
      </div>}
  </>;
}

function SchoolFeatures({ schoolId }: { schoolId: string }) {
  const [features, setFeatures] = useState<SchoolFeatureSettings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getSchoolFeatureSettings(schoolId).then((value) => { if (active) setFeatures(value); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Feature access could not be loaded."); });
    return () => { active = false; };
  }, [schoolId]);

  const enabled = schoolFeatures.filter((item) => features?.[item.key]).length;
  return <SectionCard title="Feature access" description="Modules enabled for this school.">
    <div className="p-5">
      {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
      {!features ? !error && <p role="status" className="text-sm text-muted">Loading features…</p> : <>
        <Badge tone="primary">{enabled} of {schoolFeatures.length} enabled</Badge>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{schoolFeatures.map((item) => <li key={item.key} className="flex items-center justify-between gap-3 rounded-xl border p-3"><span className="text-sm font-medium">{item.label}</span><Badge tone={features[item.key] ? "success" : "neutral"}>{features[item.key] ? "Enabled" : "Disabled"}</Badge></li>)}</ul>
      </>}
    </div>
  </SectionCard>;
}
