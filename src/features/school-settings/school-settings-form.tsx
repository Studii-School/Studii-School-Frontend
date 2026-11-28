"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, Building2, CalendarCheck, CalendarDays, Check, ContactRound, GraduationCap, ImageIcon, LockKeyhole, Palette, Plus, RotateCcw, Save } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { MultiSelect, Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { pageTabClass } from "@/components/ui/tabs";
import {
  ClassesSettings,
  SchoolTypeSettings,
} from "@/features/academics/school-structure-settings";
import type { ClassesSettingsHandle } from "@/features/academics/school-structure-settings";
import { useAcademics } from "@/features/academics/academics-context";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { academicTermLabel, academicTermNameFromLabel } from "@/features/academic-period/academic-period.types";
import { academicPeriodIssues, sessionDateBounds } from "@/features/academic-period/academic-period-validation";
import { isValidHexColor, resolveColor } from "@/lib/color-utils";
import { toLocalDateKey } from "@/lib/date-utils";
import { verifyAdminPassword } from "@/lib/api";
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
const tabDetails = {
  Profile: { icon: Building2, description: "Identity and contact details" },
  Academics: { icon: BookOpenCheck, description: "Levels, subjects and terms" },
  Classes: { icon: GraduationCap, description: "Class structure and setup" },
  Branding: { icon: Palette, description: "Colours and school images" },
} as const;
const profileControlClass =
  "!rounded-xl !border !bg-surface !px-3.5 focus:!border-[var(--school-primary)] focus:outline-none";

function ProfileSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full min-w-0 max-w-full self-start overflow-hidden rounded-2xl border bg-surface shadow-sm">
      <header className="flex items-start gap-3 border-b px-4 py-4 sm:px-6 sm:py-5">
        {Icon && <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--school-secondary-soft)] text-[var(--foreground)]"><Icon size={19} /></span>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm leading-5 text-muted">{description}</p>}
        </div>
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

  if (!visibleLevels.includes(form.level)) {
    setForm({ ...form, level: visibleLevels[0] });
    setSelectedPopularSubjects([]);
  }

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
  description,
  value,
  onChange,
  error,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const resolvedColor = resolveColor(value);
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border bg-surface shadow-sm">
      <div className="h-2" style={{ backgroundColor: resolvedColor ?? "var(--surface-muted)" }} />
      <div className="p-4 sm:p-5">
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 min-h-10 text-xs leading-5 text-muted">{description}</p>
        <div className="mt-4 flex min-w-0 items-center gap-3">
          <input
            aria-label={`Choose ${label.toLowerCase()}`}
            className="size-12 shrink-0 cursor-pointer rounded-xl border bg-surface p-1"
            type="color"
            value={resolvedColor ?? "#075985"}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
          />
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-medium text-muted">Hex value</span>
            <Input
              aria-invalid={Boolean(error)}
              className="min-w-0 max-w-full font-mono uppercase"
              value={value}
              maxLength={32}
              placeholder="#0F766E"
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}

function hasValidUrl(value?: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function SchoolSettingsForm({ initialTab = "Profile" }: { initialTab?: SettingsTab } = {}) {
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
  const historicalLocked = Boolean(periods.selectedTerm) && !periods.scope.isCurrentPeriod && !settings.historicalEditingEnabled;
  const { setSchoolLevels } = useAcademics();
  const { toast } = useActionFeedback();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [hasPendingClassChanges, setHasPendingClassChanges] = useState(false);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const classesSettingsRef = useRef<ClassesSettingsHandle>(null);
  const currentPeriodIssues = settings.currentAcademicSession
    ? academicPeriodIssues(settings.currentAcademicSession, settings.resumptionDate, settings.closingDate)
    : [];

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

  const closePasswordPrompt = () => {
    if (isVerifyingPassword) return;
    setPasswordPromptOpen(false);
    setAdminPassword("");
    setPasswordError("");
  };

  const enableHistoricalEditing = async () => {
    if (isVerifyingPassword || !adminPassword) return;
    setIsVerifyingPassword(true);
    setPasswordError("");
    try {
      await verifyAdminPassword(adminPassword);
      await saveSettings({ ...settings, historicalEditingEnabled: true });
      setPasswordPromptOpen(false);
      setAdminPassword("");
      toast("Historical editing enabled for administrators.", "success");
    } catch (error) {
      setAdminPassword("");
      setPasswordError(error instanceof Error ? error.message : "Historical editing could not be enabled.");
    } finally {
      setIsVerifyingPassword(false);
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
    for (const issue of academicPeriodIssues(settings.currentAcademicSession, settings.resumptionDate, settings.closingDate)) next[issue.field] = issue.message;
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
    if (settings.resumptionDate && !settings.closingDate) {
      next.closingDate = "Term end date is required.";
    }
    setErrors(next);
    return next;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      const keys = Object.keys(validationErrors);
      setActiveTab(keys.some((key) => ["name", "email", "primaryPhone", "secondaryPhone", "website"].includes(key))
        ? "Profile"
        : keys.some((key) => ["schoolLevels", "session", "resumptionDate", "closingDate"].includes(key))
          ? "Academics"
          : "Branding");
      toast("Please correct the highlighted settings fields.", "error");
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
    const bounds = sessionDateBounds(settings.currentAcademicSession);
    return {
      sessionStartDate: bounds?.start ?? settings.resumptionDate ?? "",
      sessionEndDate: bounds?.end ?? settings.closingDate ?? "",
    };
  };

  const saveCurrentTerm = async () => {
    const periodIssues = academicPeriodIssues(settings.currentAcademicSession, settings.resumptionDate, settings.closingDate);
    if (periodIssues.length) {
      setErrors((current) => ({ ...current, ...Object.fromEntries(periodIssues.map((issue) => [issue.field, issue.message])) }));
      toast(periodIssues[0].message, "error");
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
    if (!settings.resumptionDate) {
      setErrors((current) => ({ ...current, resumptionDate: "Set the term start date before ending this term." }));
      toast("Set the term start date before ending this term.", "error");
      return;
    }
    const issue = academicPeriodIssues(settings.currentAcademicSession, settings.resumptionDate, endDate)[0];
    if (issue) {
      setErrors((current) => ({ ...current, [issue.field]: issue.message }));
      toast(issue.message, "error");
      return;
    }
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
      className="w-full min-w-0 max-w-full space-y-5 pb-4"
    >
      <PageHeader
        title="School Settings"
        description="Keep your school details, academic setup and portal appearance in one place."
        action={<span aria-live="polite" className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${hasUnsavedChanges || hasPendingClassChanges ? "bg-[var(--school-accent-soft)] text-foreground" : "bg-[var(--school-secondary-soft)] text-foreground"}`}>{hasUnsavedChanges || hasPendingClassChanges ? <span className="size-2 rounded-full bg-[var(--school-accent)]" /> : <Check size={14} className="text-[var(--school-secondary)]" />}{hasUnsavedChanges || hasPendingClassChanges ? "Unsaved changes" : "Up to date"}</span>}
      />

      <SidePanel open={passwordPromptOpen} title="Confirm historical editing" description="Enter your administrator password to allow edits to past sessions and terms." maxWidth="md" presentation="modal" onClose={closePasswordPrompt}>
        <div onKeyDown={(event) => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            void enableHistoricalEditing();
          }
        }}>
          <PasswordField autoComplete="current-password" label="Administrator password" value={adminPassword} onChange={(event) => {
            setAdminPassword(event.target.value);
            setPasswordError("");
          }} />
          {passwordError && <p role="alert" className="mt-2 text-sm text-danger">{passwordError}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={isVerifyingPassword} onClick={closePasswordPrompt}>Cancel</Button>
            <Button type="button" disabled={isVerifyingPassword || !adminPassword} onClick={() => void enableHistoricalEditing()}>{isVerifyingPassword ? "Verifying..." : "Enable editing"}</Button>
          </div>
        </div>
      </SidePanel>

      {!isLoading && currentPeriodIssues.length > 0 && activeTab !== "Academics" && <button type="button" className="w-full rounded-xl border border-warning/40 bg-warning/10 p-4 text-left text-sm" onClick={() => setActiveTab("Academics")}><strong>Academic period needs correction.</strong> {currentPeriodIssues[0].message} Open Academics to update the dates and save the current term.</button>}
      <nav className="portal-page-tabs grid grid-cols-2 gap-2 rounded-2xl border !bg-surface p-2 lg:grid-cols-4" aria-label="School settings sections">
        {settingsTabs.map((tab) => {
          const { icon: Icon, description } = tabDetails[tab];
          const selected = activeTab === tab;
          const hasError = tab === "Profile"
            ? ["name", "email", "primaryPhone", "secondaryPhone", "website"].some((key) => errors[key])
            : tab === "Academics"
              ? ["schoolLevels", "session", "resumptionDate", "closingDate"].some((key) => errors[key])
              : tab === "Branding" && ["primaryColor", "secondaryColor", "accentColor", "logoUrl", "crestUrl", "faviconUrl"].some((key) => errors[key]);
          return <button key={tab} type="button" aria-pressed={selected} onClick={() => setActiveTab(tab)} className={`${pageTabClass(selected)} flex min-w-0 items-start gap-3 rounded-xl text-left`}>
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-[var(--school-primary)] text-[var(--school-primary-foreground)]" : "bg-[var(--school-secondary-soft)] text-[var(--school-secondary-ink)]"}`}><Icon size={18} /></span>
            <span className="min-w-0"><span className="flex items-center gap-1.5 text-sm font-semibold">{tab}{hasError && <span className="size-2 rounded-full bg-danger" aria-label="Has errors" />}</span><span className="mt-0.5 hidden text-xs leading-4 opacity-80 sm:block">{description}</span></span>
          </button>;
        })}
      </nav>

      {activeTab === "Academics" && (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border bg-surface px-4 py-3 shadow-sm sm:flex-nowrap sm:px-5" aria-label="Past records access">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--school-secondary-soft)] text-[var(--school-secondary-ink)]"><LockKeyhole size={18} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Editing past records</h2>
            <p className="mt-0.5 text-xs leading-5 text-muted">{periods.scope.isCurrentPeriod ? "Allow administrators to edit previous terms. Other roles stay read only." : "This past period is read only until an administrator enables editing."}</p>
          </div>
          <button
            data-historical-editing-toggle
            type="button"
            role="switch"
            aria-label="Allow editing past sessions and terms"
            aria-checked={settings.historicalEditingEnabled ?? false}
            disabled={isSaving || isVerifyingPassword}
            onClick={() => {
              if (settings.historicalEditingEnabled) {
                void setHistoricalEditing(false);
              } else {
                setPasswordError("");
                setPasswordPromptOpen(true);
              }
            }}
            className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 ${settings.historicalEditingEnabled ? "bg-[var(--school-primary)]" : "bg-slate-300"}`}
          >
            <span className={`mt-0.5 ml-0.5 size-6 rounded-full bg-white shadow transition-transform ${settings.historicalEditingEnabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </section>
      )}

      <fieldset disabled={historicalLocked} className="contents">

      {activeTab === "Profile" && (
        <div className="grid min-w-0 max-w-full items-start gap-6 lg:grid-cols-2">
          <ProfileSection icon={Building2} title="School details" description="The name and description people see across your portal.">
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

          <ProfileSection icon={ContactRound} title="Contact details" description="How families and staff can reach the school.">
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
            icon={GraduationCap}
            title="School levels"
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
            icon={BookOpenCheck}
            title="Subjects offered"
            description="Add the subjects available to primary or secondary classes."
          >
            <SubjectSettingsPanel levels={settings.schoolLevels} />
          </ProfileSection>

          <ProfileSection
            icon={CalendarDays}
            title="Current academic period"
            description="Set the active term dates. Attendance percentages use elapsed calendar days from term start to today, or to the term end date once it has passed."
          >
            {!isLoading && currentPeriodIssues.length > 0 && <div role="alert" className="mx-4 mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm sm:mx-5"><p className="font-semibold">The active academic period needs correction.</p><p className="mt-1">{currentPeriodIssues.map((issue) => issue.message).join(" ")} Update the session or dates below, then select “Save and Set Current Term.” Existing records will be preserved.</p></div>}
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
          <ProfileSection icon={Palette} title="Portal colours" description="Choose where each brand colour appears. Changes preview across the portal as you edit; save them to keep them.">
            <div className="grid min-w-0 max-w-full gap-4 p-4 md:grid-cols-3 sm:p-6">
              <ColorField
                label="Primary colour"
                description="Main buttons, links and selected navigation."
                value={settings.branding.primaryColor}
                error={errors.primaryColor}
                onChange={(value) => patchBrand("primaryColor", value)}
              />
              <ColorField
                label="Secondary colour"
                description="Tabs, supporting details and dashboard icons."
                value={settings.branding.secondaryColor}
                error={errors.secondaryColor}
                onChange={(value) => patchBrand("secondaryColor", value)}
              />
              <ColorField
                label="Accent colour"
                description="Small highlights, action cues and badges."
                value={settings.branding.accentColor}
                error={errors.accentColor}
                onChange={(value) => patchBrand("accentColor", value)}
              />
            </div>
            <div className="border-t p-4 sm:p-6">
              <p className="mb-3 text-sm font-semibold">Live preview</p>
              <SchoolBrandPreview />
            </div>
          </ProfileSection>

          <ProfileSection icon={ImageIcon} title="School images" description="Add image URLs for your logo, crest and browser icon.">
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

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-surface/95 p-3 shadow-lg backdrop-blur sm:px-5">
        <p aria-live="polite" className="text-sm text-muted">
          {hasUnsavedChanges || hasPendingClassChanges
            ? "You have unsaved settings changes."
            : "All settings changes are saved."}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!hasUnsavedChanges && !hasPendingClassChanges}
            onClick={() => {
              void resetSettings();
              classesSettingsRef.current?.resetChanges();
              setErrors({});
            }}
          >
            <RotateCcw size={16} />
            Discard changes
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
