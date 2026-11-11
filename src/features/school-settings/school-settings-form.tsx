"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, Plus, RotateCcw, Save } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect, Select } from "@/components/ui/select";
import { ButtonTabs } from "@/components/ui/tabs";
import {
  ClassesSettings,
  SchoolTypeSettings,
} from "@/features/academics/school-structure-settings";
import type { ClassesSettingsHandle } from "@/features/academics/school-structure-settings";
import { useAcademics } from "@/features/academics/academics-context";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { academicTermLabel, academicTermNameFromLabel } from "@/features/academic-period/academic-period.types";
import { isValidHexColor, resolveColor } from "@/lib/color-utils";
import { toLocalDateKey } from "@/lib/date-utils";
import { SchoolBrandPreview } from "./school-brand-preview";
import { SchoolLogoUpload } from "./school-logo-upload";
import { useSchoolSettings } from "./school-settings-context";
import type {
  AcademicTerm,
  ConfiguredSchoolLevel,
  OwnershipType,
  SchoolSettings,
  SchoolType,
} from "./school-settings.types";

const popularSubjectsByLevel: Record<ConfiguredSchoolLevel, string[]> = {
  PRIMARY: [
    "Mathematics",
    "English Language",
    "Basic Science",
    "Social Studies",
    "Civic Education",
    "Computer Studies",
    "Agricultural Science",
    "Physical and Health Education",
    "Creative Arts",
    "Home Economics",
    "Christian Religious Studies",
    "Islamic Religious Studies",
    "French",
    "Yoruba",
    "Igbo",
    "Hausa",
  ],
  SECONDARY: [
    "Mathematics",
    "English Language",
    "Basic Science",
    "Basic Technology",
    "Civic Education",
    "Business Studies",
    "Computer Studies",
    "Agricultural Science",
    "Physical and Health Education",
    "Literature in English",
    "Further Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Economics",
    "Government",
    "Geography",
    "Commerce",
    "Financial Accounting",
  ],
};

const settingsTabs = ["Profile", "Academics", "Classes", "Branding"] as const;
type SettingsTab = (typeof settingsTabs)[number];
const profileControlClass =
  "!rounded-none !border-0 !border-b !border-border !bg-transparent !px-0 focus:!border-[var(--school-primary)] focus:outline-none";

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full min-w-0 max-w-full self-start rounded-xl border bg-surface">
      <header className="border-b px-4 py-4 sm:px-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-xs text-muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function SubjectSettingsPanel({ levels }: { levels: ConfiguredSchoolLevel[] }) {
  const { state, createSubjects, setSubjectStatus, removeSubject } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const [form, setForm] = useState({ name: "", code: "", level: (levels[0] ?? "SECONDARY") as ConfiguredSchoolLevel, description: "" });
  const [selectedPopularSubjects, setSelectedPopularSubjects] = useState<string[]>([]);
  const visibleLevels = useMemo(() => levels.length ? levels : ["SECONDARY" as ConfiguredSchoolLevel], [levels]);
  const existingSubjects = useMemo(
    () =>
      new Set(
        state.subjects
          .filter((subject) => subject.level === form.level)
          .map((subject) => subject.name.toLowerCase()),
      ),
    [form.level, state.subjects],
  );
  const popularSubjectOptions = useMemo(
    () =>
      popularSubjectsByLevel[form.level].map((name) => ({
        value: name,
        label: name,
        disabled: existingSubjects.has(name.toLowerCase()),
        description: existingSubjects.has(name.toLowerCase()) ? "Already added" : undefined,
      })),
    [existingSubjects, form.level],
  );

  useEffect(() => {
    if (!visibleLevels.includes(form.level)) {
      setForm((current) => ({ ...current, level: visibleLevels[0] }));
      setSelectedPopularSubjects([]);
    }
  }, [form.level, visibleLevels]);

  const addSubjects = async () => {
    try {
      const selectedNames = selectedPopularSubjects.map((name) => name.trim()).filter(Boolean);
      const customName = form.name.trim();
      const uniqueNames = [...new Set([...selectedNames, customName].filter(Boolean).map((name) => name.toLowerCase()))];
      const trimmedCode = form.code.trim();
      const trimmedDescription = form.description.trim();
      const inputs = uniqueNames.map((nameKey) => {
        const name = [...selectedNames, customName].find((item) => item.toLowerCase() === nameKey) ?? nameKey;
        const isSingleSubject = uniqueNames.length === 1;
        return {
          name,
          code: isSingleSubject && trimmedCode ? trimmedCode : undefined,
          level: form.level,
          description: name === customName && trimmedDescription ? trimmedDescription : undefined,
        };
      });
      await createSubjects(inputs);
      setForm((current) => ({ ...current, name: "", code: "", description: "" }));
      setSelectedPopularSubjects([]);
      toast(inputs.length === 1 ? "Subject added." : `${inputs.length} subjects added.`, "success");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Subjects could not be added.", "error");
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[11rem_minmax(0,1.35fr)_minmax(0,1fr)_9rem_auto]">
        <Select label="Subject level" value={form.level} onChange={(value) => {
          setForm((current) => ({ ...current, level: value as ConfiguredSchoolLevel }));
          setSelectedPopularSubjects([]);
        }} options={visibleLevels.map((value) => ({ value, label: value }))} />
        <MultiSelect label="Popular subjects" values={selectedPopularSubjects} onChange={setSelectedPopularSubjects} placeholder={`${form.level === "PRIMARY" ? "Primary" : "Secondary"} subjects`} options={popularSubjectOptions} />
        <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Custom subject name" />
        <Input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="Code optional" />
        <Button type="button" disabled={!form.name.trim() && !selectedPopularSubjects.length} onClick={() => void addSubjects()}><Plus size={16} />Add</Button>
      </div>
      <div className="overflow-x-auto rounded-[8px] border">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Subject", "Code", "Level", "Status", "Actions"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
          <tbody className="divide-y">
            {state.subjects.map((subject) => (
              <tr key={subject.id}>
                <td className="px-4 py-3 font-semibold">{subject.name}</td>
                <td className="px-4 py-3">{subject.code || "-"}</td>
                <td className="px-4 py-3">{subject.level}</td>
                <td className="px-4 py-3">{subject.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <button className="font-semibold text-[var(--school-primary)]" onClick={() => void setSubjectStatus(subject.id, subject.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE").then(() => toast(subject.status === "ACTIVE" ? "Subject archived." : "Subject activated.", "success")).catch((caught) => toast(caught instanceof Error ? caught.message : "Subject status could not be changed.", "error"))} type="button">{subject.status === "ACTIVE" ? "Archive" : "Activate"}</button>
                    <button className="font-semibold text-danger" onClick={() => confirm({ title: "Remove subject?", description: `${subject.name} will be removed from the subject list and any subject teacher assignments that use it.`, confirmLabel: "Remove Subject", destructive: true, onConfirm: async () => { await removeSubject(subject.id); toast("Subject removed.", "success"); } })} type="button">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!state.subjects.length && <p className="p-6 text-center text-sm text-muted">No subjects have been added yet.</p>}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  error,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  wide?: boolean;
}) {
  return (
    <label
      className={`min-w-0 max-w-full ${wide ? "sm:col-span-2" : ""}`}
    >
      <span className="mb-2 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const resolvedColor = resolveColor(value);
  return (
    <Field label={label} error={error}>
      <div className="flex min-w-0 max-w-full gap-2">
        <input
          aria-label={`${label} picker`}
          className="h-11 w-12 shrink-0 cursor-pointer rounded-[10px] border bg-surface p-1"
          type="color"
          value={resolvedColor ?? "#075985"}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <Input
          className="min-w-0 max-w-full"
          value={value}
          maxLength={32}
          placeholder="#0F766E"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </Field>
  );
}

function hasValidUrl(value?: string) {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function SchoolSettingsForm() {
  const {
    settings,
    updateSettings,
    saveSettings,
    resetSettings,
    isLoading,
    isSaving,
    hasUnsavedChanges,
  } = useSchoolSettings();
  const periods = useAcademicPeriod();
  const historicalLocked = !periods.scope.isCurrentPeriod && !settings.historicalEditingEnabled;
  const { setSchoolLevels } = useAcademics();
  const { toast } = useActionFeedback();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<SettingsTab>("Profile");
  const [hasPendingClassChanges, setHasPendingClassChanges] = useState(false);
  const classesSettingsRef = useRef<ClassesSettingsHandle>(null);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  const patch = <K extends keyof SchoolSettings>(
    key: K,
    value: SchoolSettings[K],
  ) =>
    updateSettings((current) => ({
      ...current,
      [key]: value,
    }));

  const setHistoricalEditing = async (enabled: boolean) => {
    const nextSettings = { ...settings, historicalEditingEnabled: enabled };
    try {
      await saveSettings(nextSettings);
      toast(enabled ? "Historical editing enabled for administrators." : "Historical editing disabled.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Historical editing setting could not be saved.", "error");
    }
  };

  const patchBrand = (
    key: keyof SchoolSettings["branding"],
    value: string,
  ) =>
    updateSettings((current) => ({
      ...current,
      branding: { ...current.branding, [key]: value },
    }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!(settings.name ?? "").trim()) next.name = "School name is required.";
    if (!/^\S+@\S+\.\S+$/.test(settings.email ?? "")) {
      next.email = "Enter a valid email address.";
    }
    if (!/^\+?[0-9 ()-]{7,20}$/.test(settings.primaryPhone ?? "")) {
      next.primaryPhone = "Enter a valid phone number.";
    }
    if (
      settings.secondaryPhone &&
      !/^\+?[0-9 ()-]{7,20}$/.test(settings.secondaryPhone)
    ) {
      next.secondaryPhone = "Enter a valid phone number.";
    }
    if (!/^\d{4}\/\d{4}$/.test(settings.currentAcademicSession ?? "")) {
      next.session = "Use the format 2026/2027.";
    }
    if (!settings.schoolLevels?.length) {
      next.schoolLevels = "Select at least one school level.";
    }
    if (!hasValidUrl(settings.website)) next.website = "Enter a valid website URL.";
    if (!hasValidUrl(settings.logoUrl)) next.logoUrl = "Enter a valid logo URL.";
    if (!hasValidUrl(settings.crestUrl)) next.crestUrl = "Enter a valid crest URL.";
    if (!hasValidUrl(settings.faviconUrl)) next.faviconUrl = "Enter a valid favicon URL.";
    for (const [key, value] of Object.entries(settings.branding ?? {})) {
      if (!isValidHexColor(value)) {
        next[key] = "Use a six-digit hex colour such as #075985.";
      }
    }
    if (
      settings.resumptionDate &&
      settings.closingDate &&
      settings.closingDate <= settings.resumptionDate
    ) {
      next.closingDate = "Term end date must be after the start date.";
    } else if (settings.resumptionDate && !settings.closingDate) {
      next.closingDate = "Term end date is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      toast("Please correct the highlighted profile fields.", "error");
      return;
    }
    try {
      await saveSettings(settings);
      if (settings.resumptionDate) {
        const { sessionStartDate, sessionEndDate } = sessionFallbackDates();
        await periods.upsertTerm({
          sessionName: settings.currentAcademicSession,
          sessionStartDate,
          sessionEndDate,
          termName: academicTermNameFromLabel(settings.currentTerm),
          termStartDate: settings.resumptionDate,
          termEndDate: settings.closingDate ?? "",
          makeCurrent: true,
        });
      }
      await setSchoolLevels(settings.schoolLevels);
      await classesSettingsRef.current?.saveChanges();
      toast("School settings saved.", "success");
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "School settings could not be saved.",
        "error",
      );
    }
  };

  const sessionFallbackDates = () => {
    const match = settings.currentAcademicSession.match(/^(\d{4})\/(\d{4})$/);
    return {
      sessionStartDate: match ? `${match[1]}-01-01` : settings.resumptionDate || "",
      sessionEndDate: match ? `${match[2]}-12-31` : settings.closingDate || "",
    };
  };

  const saveCurrentTerm = async () => {
    if (!/^\d{4}\/\d{4}$/.test(settings.currentAcademicSession ?? "")) {
      setErrors((current) => ({ ...current, session: "Use the format 2026/2027." }));
      toast("Enter the academic session in 2026/2027 format.", "error");
      return;
    }
    if (!settings.resumptionDate) {
      setErrors((current) => ({ ...current, resumptionDate: "Term start date is required for attendance." }));
      toast("Enter the term start date first.", "error");
      return;
    }
    if (!settings.closingDate) {
      setErrors((current) => ({ ...current, closingDate: "Term end date is required." }));
      toast("Enter the term end date first.", "error");
      return;
    }
    if (settings.closingDate <= settings.resumptionDate) {
      setErrors((current) => ({ ...current, closingDate: "Term end date must be after the start date." }));
      toast("Term end date must be after the start date.", "error");
      return;
    }
    try {
      const { sessionStartDate, sessionEndDate } = sessionFallbackDates();
      const result = await periods.upsertTerm({
        sessionName: settings.currentAcademicSession,
        sessionStartDate,
        sessionEndDate,
        termName: academicTermNameFromLabel(settings.currentTerm),
        termStartDate: settings.resumptionDate,
        termEndDate: settings.closingDate,
        makeCurrent: true,
      });
      const nextSettings = {
        ...settings,
        currentAcademicSession: result.session.name,
        currentTerm: academicTermLabel(result.term.name) as AcademicTerm,
        resumptionDate: result.term.startDate,
        closingDate: result.term.endDate || undefined,
      };
      updateSettings(nextSettings);
      await saveSettings(nextSettings);
      setErrors((current) => ({ ...current, session: "", resumptionDate: "", closingDate: "" }));
      toast("Current term saved and activated.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Current term could not be saved.", "error");
    }
  };

  const markTermEndedToday = async () => {
    const endDate = toLocalDateKey(new Date());
    const nextSettings = {
      ...settings,
      closingDate: endDate,
    };
    updateSettings(nextSettings);
    try {
      let sessionId = periods.selectedSession?.id;
      let termId = periods.selectedTerm?.id;
      if (!sessionId || !termId) {
        const { sessionStartDate, sessionEndDate } = sessionFallbackDates();
        const result = await periods.upsertTerm({
          sessionName: settings.currentAcademicSession,
          sessionStartDate,
          sessionEndDate: sessionEndDate || endDate,
          termName: academicTermNameFromLabel(settings.currentTerm),
          termStartDate: settings.resumptionDate || endDate,
          termEndDate: endDate,
          makeCurrent: true,
        });
        sessionId = result.session.id;
        termId = result.term.id;
      }
      await periods.markTermEnded(sessionId, termId, endDate);
      await saveSettings(nextSettings);
      toast("Current term ended. Create or select the next term and save it as current.", "success");
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Term end date could not be saved.",
        "error",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-muted" />
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full min-w-0 max-w-full space-y-6"
    >
      <PageHeader
        title="School Settings"
        description="Manage the school name, contact details, academic dates, colours and brand assets used across your portal."
      />

      <ProfileSection title="Historical records" description={periods.scope.isCurrentPeriod ? "Choose whether administrators can edit records when viewing a past session or term." : "Past sessions and terms are read only unless an administrator enables editing here."}>
        <label className="flex items-start gap-3 p-4 sm:p-5">
          <input data-historical-editing-toggle className="mt-1" type="checkbox" checked={settings.historicalEditingEnabled ?? false} disabled={isSaving} onChange={(event) => void setHistoricalEditing(event.target.checked)} />
          <span><span className="block text-sm font-semibold">Allow editing past sessions and terms</span><span className="mt-1 block text-xs leading-5 text-muted">Teachers, parents and students remain read only for past periods.</span></span>
        </label>
      </ProfileSection>

      <fieldset disabled={historicalLocked} className="contents">

      <ButtonTabs items={settingsTabs} value={activeTab} onChange={setActiveTab} label="School settings sections" />

      {activeTab === "Profile" && (
        <div className="grid min-w-0 max-w-full items-start gap-6 lg:grid-cols-2">
          <ProfileSection title="School Details">
            <div className="grid min-w-0 max-w-full gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <Field label="School name" error={errors.name}>
                <Input
                  className={profileControlClass}
                  value={settings.name}
                  onChange={(event) => patch("name", event.target.value)}
                />
              </Field>
              <Field label="Short name or abbreviation">
                <Input
                  className={profileControlClass}
                  value={settings.shortName}
                  onChange={(event) => patch("shortName", event.target.value)}
                />
              </Field>
              <Field label="School motto">
                <Input
                  className={profileControlClass}
                  value={settings.motto}
                  onChange={(event) => patch("motto", event.target.value)}
                />
              </Field>
              <Field label="School slogan">
                <Input
                  className={profileControlClass}
                  value={settings.slogan}
                  onChange={(event) => patch("slogan", event.target.value)}
                />
              </Field>
              <Field label="Year established">
                <Input
                  className={profileControlClass}
                  type="number"
                  min="1800"
                  max="2100"
                  value={settings.establishedYear ?? ""}
                  onChange={(event) =>
                    patch(
                      "establishedYear",
                      event.target.value ? Number(event.target.value) : undefined,
                    )
                  }
                />
              </Field>
              <Field label="Day or boarding">
                <Select
                  triggerClassName={profileControlClass}
                  label="Day or boarding"
                  value={settings.schoolType}
                  onChange={(value) => patch("schoolType", value as SchoolType)}
                  options={[
                    "Day School",
                    "Boarding School",
                    "Day and Boarding School",
                  ].map((value) => ({ value, label: value }))}
                />
              </Field>
              <Field label="Ownership">
                <Select
                  triggerClassName={profileControlClass}
                  label="Ownership type"
                  value={settings.ownershipType}
                  onChange={(value) =>
                    patch("ownershipType", value as OwnershipType)
                  }
                  options={[
                    "Private",
                    "Public",
                    "Faith-based",
                    "International",
                  ].map((value) => ({ value, label: value }))}
                />
              </Field>
              <Field label="School description" wide>
                <textarea
                  className={`min-h-24 w-full py-3 text-sm ${profileControlClass}`}
                  value={settings.description}
                  onChange={(event) => patch("description", event.target.value)}
                />
              </Field>
            </div>
          </ProfileSection>

          <ProfileSection title="Contact Details">
            <div className="grid min-w-0 max-w-full gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <Field label="Official email address" error={errors.email}>
                <Input
                  className={profileControlClass}
                  type="email"
                  value={settings.email}
                  onChange={(event) => patch("email", event.target.value)}
                />
              </Field>
              <Field label="Website" error={errors.website}>
                <Input
                  className={profileControlClass}
                  type="url"
                  value={settings.website ?? ""}
                  onChange={(event) => patch("website", event.target.value)}
                />
              </Field>
              <Field label="Primary phone number" error={errors.primaryPhone}>
                <Input
                  className={profileControlClass}
                  type="tel"
                  value={settings.primaryPhone}
                  onChange={(event) =>
                    patch("primaryPhone", event.target.value)
                  }
                />
              </Field>
              <Field label="Secondary phone number" error={errors.secondaryPhone}>
                <Input
                  className={profileControlClass}
                  type="tel"
                  value={settings.secondaryPhone ?? ""}
                  onChange={(event) =>
                    patch("secondaryPhone", event.target.value)
                  }
                />
              </Field>
              <Field label="School address" wide>
                <Input
                  className={profileControlClass}
                  value={settings.address}
                  onChange={(event) => patch("address", event.target.value)}
                />
              </Field>
              <Field label="City">
                <Input
                  className={profileControlClass}
                  value={settings.city}
                  onChange={(event) => patch("city", event.target.value)}
                />
              </Field>
              <Field label="State">
                <Input
                  className={profileControlClass}
                  value={settings.state}
                  onChange={(event) => patch("state", event.target.value)}
                />
              </Field>
              <Field label="Country">
                <Input
                  className={profileControlClass}
                  value={settings.country}
                  onChange={(event) => patch("country", event.target.value)}
                />
              </Field>
            </div>
          </ProfileSection>
        </div>
      )}

      {activeTab === "Academics" && (
        <div className="space-y-6">
          <ProfileSection
            title="School Levels"
            description="Choose whether this school runs primary, secondary, or both. This controls class and school type options across the portal."
          >
            <SchoolTypeSettings />
          </ProfileSection>
          {errors.schoolLevels && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-danger">
              {errors.schoolLevels}
            </p>
          )}

          <ProfileSection
            title="Subjects Offered"
            description="Add the subjects available to primary or secondary classes."
          >
            <SubjectSettingsPanel levels={settings.schoolLevels} />
          </ProfileSection>

          <ProfileSection
            title="Academic Details"
            description="Set the active term dates. Attendance percentages use elapsed calendar days from term start to today, or to the term end date once it has passed."
          >
            <div className="grid min-w-0 max-w-full gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <Field label="Current academic session" error={errors.session}>
                <Input
                  value={settings.currentAcademicSession}
                  onChange={(event) =>
                    patch("currentAcademicSession", event.target.value)
                  }
                />
              </Field>
              <Field label="Current term">
                <Select
                  label="Current term"
                  value={settings.currentTerm}
                  onChange={(value) =>
                    patch("currentTerm", value as AcademicTerm)
                  }
                  options={["First Term", "Second Term", "Third Term"].map(
                    (value) => ({ value, label: value }),
                  )}
                />
              </Field>
              <Field label="Term start date">
                <Input
                  type="date"
                  value={settings.resumptionDate ?? ""}
                  onChange={(event) =>
                    patch("resumptionDate", event.target.value)
                  }
                />
                {errors.resumptionDate && <span className="mt-1 block text-xs text-danger">{errors.resumptionDate}</span>}
              </Field>
              <Field label="Term end date" error={errors.closingDate}>
                <Input
                  type="date"
                  value={settings.closingDate ?? ""}
                  onChange={(event) => patch("closingDate", event.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={isSaving} onClick={() => void saveCurrentTerm()}>
                    <Save size={16} />Save and Set Current Term
                  </Button>
                  <Button type="button" variant="outline" disabled={isSaving} onClick={() => void markTermEndedToday()}>
                    <CalendarCheck size={16} />Mark Term Ended Today
                  </Button>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  To begin a new term, change the session or term above, enter the new start date, then save it as current.
                </p>
              </div>
            </div>
          </ProfileSection>
        </div>
      )}

      <div className={activeTab === "Classes" ? "block" : "hidden"}>
        <ClassesSettings
          ref={classesSettingsRef}
          onPendingChange={setHasPendingClassChanges}
        />
      </div>

      {activeTab === "Branding" && (
        <div className="space-y-6">
          <ProfileSection title="School Branding">
            <div className="grid min-w-0 max-w-full gap-4 p-4 sm:grid-cols-3 sm:p-5">
              <ColorField
                label="Primary colour"
                value={settings.branding.primaryColor}
                error={errors.primaryColor}
                onChange={(value) => patchBrand("primaryColor", value)}
              />
              <ColorField
                label="Secondary colour"
                value={settings.branding.secondaryColor}
                error={errors.secondaryColor}
                onChange={(value) => patchBrand("secondaryColor", value)}
              />
              <ColorField
                label="Accent colour"
                value={settings.branding.accentColor}
                error={errors.accentColor}
                onChange={(value) => patchBrand("accentColor", value)}
              />
            </div>
            <div className="border-t p-4">
              <SchoolBrandPreview />
            </div>
          </ProfileSection>

          <ProfileSection title="Logo">
            <div className="grid min-w-0 max-w-full items-start gap-4 p-4 sm:grid-cols-3 sm:p-5">
              <SchoolLogoUpload
                label="School logo"
                value={settings.logoUrl}
                onChange={(value) => patch("logoUrl", value)}
                onError={(message) =>
                  setErrors((current) => ({ ...current, logoUrl: message }))
                }
              />
              <SchoolLogoUpload
                label="School crest"
                value={settings.crestUrl}
                onChange={(value) => patch("crestUrl", value)}
                onError={(message) =>
                  setErrors((current) => ({ ...current, crestUrl: message }))
                }
              />
              <SchoolLogoUpload
                label="School favicon"
                value={settings.faviconUrl}
                onChange={(value) => patch("faviconUrl", value)}
                onError={(message) =>
                  setErrors((current) => ({ ...current, faviconUrl: message }))
                }
              />
              {(errors.logoUrl || errors.crestUrl || errors.faviconUrl) && (
                <p className="text-sm text-danger sm:col-span-3">
                  {errors.logoUrl || errors.crestUrl || errors.faviconUrl}
                </p>
              )}
            </div>
          </ProfileSection>
        </div>
      )}

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-surface/95 p-3 shadow-lg backdrop-blur">
        <p className="text-sm text-muted">
          {hasUnsavedChanges || hasPendingClassChanges
            ? "You have unsaved settings changes."
            : "All settings changes are saved."}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void resetSettings();
              classesSettingsRef.current?.resetChanges();
              setErrors({});
            }}
          >
            <RotateCcw size={16} />
            Reset
          </Button>
          <Button
            type="submit"
            disabled={
              isSaving || (!hasUnsavedChanges && !hasPendingClassChanges)
            }
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
      </fieldset>
    </form>
  );
}
