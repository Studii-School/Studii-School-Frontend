"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { getSchoolFeatureSettings, schoolFeatures, type SchoolFeatureSettings, updateSchoolFeatureSettings } from "@/lib/school-features";
import { getSchools } from "./super-admin.api";
import { schoolKey, type SchoolRecord } from "./super-admin.types";
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
        : !schools ? <Card role="status" className="p-5 text-sm text-muted">Loading schoolsâ€¦</Card>
        : !options.length ? <Card className="p-5 text-sm text-muted">Invite a school before configuring its features.</Card>
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
          {!features ? <p className="p-5 text-sm text-muted">{error ? "Feature settings are unavailable." : "Loading feature settingsâ€¦"}</p> : (
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
