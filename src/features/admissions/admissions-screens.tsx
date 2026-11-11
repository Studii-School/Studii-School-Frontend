"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarCheck, ClipboardList, ExternalLink, Plus, Save, Settings2, Trash2, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { useAdmissions } from "./admissions-context";
import type { SchoolClass } from "@/features/academics/academics.types";
import type { AdmissionApplication, AdmissionFormField, AdmissionFormFieldType, AdmissionInput, AdmissionStatus } from "./admissions.types";

const statuses: AdmissionStatus[] = ["NEW", "UNDER_REVIEW", "INTERVIEW", "ACCEPTED", "REJECTED", "ENROLLED"];
const statusLabel = (status: AdmissionStatus) => status.replaceAll("_", " ");
const statusTone = (status: AdmissionStatus) => status === "ENROLLED" || status === "ACCEPTED" ? "success" as const : status === "REJECTED" ? "danger" as const : status === "INTERVIEW" ? "warning" as const : "neutral" as const;
const fullName = (item: Pick<AdmissionApplication, "firstName" | "middleName" | "lastName">) => [item.firstName, item.middleName, item.lastName].filter(Boolean).join(" ");
const formatDate = (value: string) => new Date(value).toLocaleDateString([], { dateStyle: "medium" });
const publicFormPath = "/admissions/apply";
const fieldTypes: Array<{ value: AdmissionFormFieldType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "date", label: "Date" },
  { value: "textarea", label: "Long text" },
  { value: "image", label: "Image upload" },
];

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange(value: string): void; type?: string }) {
  return <label className="text-sm font-medium">{label}<Input className="mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

const isCustomField = (key: AdmissionFormField["key"]) => key.startsWith("custom-");

export function AdmissionsDashboard() {
  const { applications } = useAdmissions();
  const { state } = useAcademics();
  const [query, setQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AdmissionStatus | "ALL" | "">("");
  const visible = useMemo(() => applications.filter((item) => {
    const className = state.classes.find((entry) => entry.id === item.classId)?.displayName ?? "";
    return (!selectedStatus || selectedStatus === "ALL" || item.status === selectedStatus) && (!query || `${fullName(item)} ${item.parentName} ${item.parentPhone} ${className} ${item.applicationNumber}`.toLowerCase().includes(query.toLowerCase()));
  }), [applications, query, selectedStatus, state.classes]);
  const cards: Array<{ label: string; status: AdmissionStatus | "ALL"; count: number; description: string }> = [
    { label: "All applications", status: "ALL", count: applications.length, description: "Complete admissions register" },
    { label: "New", status: "NEW", count: applications.filter((item) => item.status === "NEW").length, description: "Fresh submissions to screen" },
    { label: "Under review", status: "UNDER_REVIEW", count: applications.filter((item) => item.status === "UNDER_REVIEW").length, description: "Being checked by admissions" },
    { label: "Interview", status: "INTERVIEW", count: applications.filter((item) => item.status === "INTERVIEW").length, description: "Assessment or meeting stage" },
    { label: "Accepted", status: "ACCEPTED", count: applications.filter((item) => item.status === "ACCEPTED").length, description: "Ready to enroll" },
    { label: "Enrolled", status: "ENROLLED", count: applications.filter((item) => item.status === "ENROLLED").length, description: "Converted to student records" },
  ];

  return (
    <>
      <PageHeader
        title="Admissions"
        description="Run applications through screening, interviews, decisions and enrollment."
        action={<div className="flex flex-wrap gap-2"><Link href={publicFormPath} className={buttonStyles("outline")}><ExternalLink size={16} />Public form</Link><Link href="/admin/admissions/register" className={buttonStyles("outline")}><Plus size={16} />Register applicant</Link><Link href="/admin/admissions/new" className={buttonStyles()}><Settings2 size={16} />Design form</Link></div>}
      />
      {!selectedStatus ? <><Card className="mb-5 p-4"><div className="flex flex-wrap items-center gap-3 text-sm"><span className="inline-flex items-center gap-2 font-semibold"><CalendarCheck size={16} />Admissions pipeline</span>{cards.slice(1).map((card)=><button key={card.label} type="button" onClick={()=>setSelectedStatus(card.status)} className="rounded-[8px] border bg-surface px-3 py-2 font-medium hover:border-[var(--school-primary)]">{card.label}: {card.count}</button>)}</div></Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map((card)=><button key={card.label} type="button" onClick={()=>setSelectedStatus(card.status)} className="min-h-36 rounded-[8px] border bg-surface p-4 text-left transition hover:border-[var(--school-primary)] hover:shadow-sm"><ClipboardList className="text-[var(--school-primary)]" size={20}/><p className="mt-3 font-semibold">{card.label}</p><p className="mt-1 text-xs text-muted">{card.description}</p><p className="mt-4 text-2xl font-bold">{card.count}</p></button>)}</div></> : <>
      <Button className="mb-4" type="button" variant="outline" onClick={() => setSelectedStatus("")}><ArrowLeft size={16}/>Back to admission cards</Button>
      <Card className="mb-5 p-4"><SearchInput value={query} onChange={setQuery} placeholder="Search applicant, parent, phone, class or application no." /></Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-muted"><tr>{["Applicant", "Class", "Parent", "Phone", "Submitted", "Status", "Action"].map((item) => <th key={item} className="px-5 py-3">{item}</th>)}</tr></thead>
            <tbody className="divide-y">
              {visible.map((item) => (
                <ClickableTableRow key={item.id} href={`/admin/admissions/${item.id}`} label={fullName(item)}>
                  <td className="px-5 py-4"><p className="font-semibold">{fullName(item)}</p><p className="text-xs text-muted">{item.applicationNumber}</p></td>
                  <td className="px-5 py-4">{state.classes.find((entry) => entry.id === item.classId)?.displayName ?? "Unknown class"}</td>
                  <td className="px-5 py-4">{item.parentName}</td>
                  <td className="px-5 py-4">{item.parentPhone}</td>
                  <td className="px-5 py-4">{formatDate(item.submittedAt)}</td>
                  <td className="px-5 py-4"><Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge></td>
                  <td className="px-5 py-4"><Link className="font-semibold text-[var(--school-primary)]" href={`/admin/admissions/${item.id}`}>View details</Link></td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && <p className="p-8 text-center text-sm text-muted">No admission records found.</p>}
      </Card></>}
    </>
  );
}

const initialInput: AdmissionInput = { firstName: "", lastName: "", schoolLevel: "SECONDARY", classId: "", parentName: "", relationship: "Parent", parentPhone: "" };

export function AdmissionFormBuilderScreen() {
  const { formConfig, saveFormConfig } = useAdmissions();
  const { toast } = useActionFeedback();
  const [draft, setDraft] = useState(formConfig);
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState<AdmissionFormFieldType>("text");
  const [busy, setBusy] = useState(false);
  const updateField = (key: AdmissionFormField["key"], patch: Partial<Pick<AdmissionFormField, "enabled" | "required" | "label" | "type">>) => {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field) => field.key === key ? { ...field, ...patch, required: patch.enabled === false ? false : patch.required ?? field.required } : field),
    }));
  };
  const removeField = (key: AdmissionFormField["key"]) => {
    setDraft((current) => ({
      ...current,
      fields: current.fields.some((field) => field.key === key && field.builtIn)
        ? current.fields.map((field) => field.key === key ? { ...field, enabled: false, required: false } : field)
        : current.fields.filter((field) => field.key !== key),
    }));
  };
  const addCustomField = () => {
    const label = customLabel.trim();
    if (!label) {
      toast("Enter a custom field title first.", "warning");
      return;
    }
    const key = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` as const;
    setDraft((current) => ({ ...current, fields: [...current.fields, { key, label, type: customType, enabled: true, required: false, builtIn: false }] }));
    setCustomLabel("");
    setCustomType("text");
  };
  const save = async () => {
    setBusy(true);
    try {
      await saveFormConfig(draft);
      toast("Admission form settings saved.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Admission form settings could not be saved.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Design Admission Form" description="Control the public application form parents see before submission." backFallback="/admin/admissions" action={<Link href={publicFormPath} className={buttonStyles("outline")}><ExternalLink size={16} />Preview public form</Link>} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5">
          <h2 className="font-semibold">Public page content</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Form title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
            <label className="text-sm font-medium">Intro text<textarea className="mt-2 min-h-24 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--school-primary)]" value={draft.intro} onChange={(event) => setDraft((current) => ({ ...current, intro: event.target.value }))} /></label>
            <div className="flex items-center gap-3 text-sm font-semibold">
              <Checkbox label="Publish this form" checked={draft.isPublished} onCheckedChange={(checked) => setDraft((current) => ({ ...current, isPublished: checked }))} />
              <span>Publish this form</span>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Public link</h2>
          <p className="mt-3 text-sm text-muted">Share this page with parents when the form is published.</p>
          <Link href={publicFormPath} className={`${buttonStyles()} mt-4 w-full`}><ExternalLink size={16} />Open admission page</Link>
        </Card>
      </div>
      <Card className="mt-5 overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Form fields</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
            <Input value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} placeholder="Custom field title" />
            <Select label="Field type" value={customType} onChange={(value) => setCustomType(value as AdmissionFormFieldType)} options={fieldTypes} />
            <Button type="button" onClick={addCustomField}><Plus size={16} />Add field</Button>
          </div>
        </div>
        <div className="divide-y">
          {draft.fields.map((field) => (
            <div key={field.key} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_150px_110px_120px_44px] lg:items-center">
              <div>
                <Input value={field.label} onChange={(event) => updateField(field.key, { label: event.target.value })} />
                <p className="mt-1 text-xs text-muted">{field.builtIn ? "Default field" : "Custom field"}</p>
              </div>
              <Select disabled={field.builtIn} label="Field type" value={field.type} onChange={(value) => updateField(field.key, { type: value as AdmissionFormFieldType })} options={fieldTypes} />
              <div className="flex items-center gap-2 text-sm font-medium">
                <Checkbox label={`Show ${field.label}`} checked={field.enabled} onCheckedChange={(checked) => updateField(field.key, { enabled: checked })} />
                <span>Show</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Checkbox label={`Require ${field.label}`} disabled={!field.enabled} checked={field.required} onCheckedChange={(checked) => updateField(field.key, { required: checked })} />
                <span>Required</span>
              </div>
              <Button type="button" variant="ghost" title={field.builtIn ? "Remove from public form" : "Delete field"} onClick={() => removeField(field.key)}><Trash2 size={16} /></Button>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-5 flex justify-end gap-2"><Link href="/admin/admissions" className={buttonStyles("outline")}>Cancel</Link><Button disabled={busy} onClick={() => void save()}><Save size={16} />{busy ? "Saving..." : "Save form"}</Button></div>
    </>
  );
}

export function NewAdmissionScreen() {
  const { create } = useAdmissions();
  const { state } = useAcademics();
  const { settings } = useSchoolSettings();
  const { toast } = useActionFeedback();
  const router = useRouter();
  const [form, setForm] = useState<AdmissionInput>({ ...initialInput, schoolLevel: settings.schoolLevels[0] ?? "SECONDARY" });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof AdmissionInput, value: string) => setForm((current) => ({ ...current, [key]: value || undefined }));

  const submit = async () => {
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.classId || !form.parentName?.trim() || !form.parentPhone?.trim()) {
      toast("Applicant name, class, parent name and parent phone are required.", "warning");
      return;
    }
    setBusy(true);
    try {
      const item = await create(form);
      toast("Applicant registered.", "success");
      router.push(`/admin/admissions/${item.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Admission form could not be saved.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Register Applicant" description="Create a professional admission record for walk-in or phone applications." backFallback="/admin/admissions" />
      <div className="grid gap-5">
        <Card className="p-5">
          <h2 className="font-semibold">Student details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="First name" value={form.firstName} onChange={(value) => set("firstName", value)} />
            <Field label="Last name" value={form.lastName} onChange={(value) => set("lastName", value)} />
            <Field label="Middle name" value={form.middleName ?? ""} onChange={(value) => set("middleName", value)} />
            <label className="text-sm font-medium">Gender<Select className="mt-2" label="Gender" value={form.gender ?? ""} onChange={(value) => set("gender", value)} placeholder="Select gender" options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} /></label>
            <label className="text-sm font-medium">Date of birth<Input className="mt-2" type="date" value={form.dateOfBirth ?? ""} onChange={(event) => set("dateOfBirth", event.target.value)} /></label>
            <label className="text-sm font-medium">Class<Select searchable className="mt-2" label="Class" value={form.classId} onChange={(value) => { const selected = state.classes.find((item) => item.id === value); setForm((current) => ({ ...current, classId: value, schoolLevel: selected?.level ?? current.schoolLevel })); }} placeholder="Select class" options={state.classes.filter((item) => item.status === "ACTIVE" && settings.schoolLevels.includes(item.level)).map((item) => ({ value: item.id, label: item.displayName, description: item.level }))} /></label>
            <Field label="Nationality" value={form.nationality ?? ""} onChange={(value) => set("nationality", value)} />
            <Field label="Address" value={form.address ?? ""} onChange={(value) => set("address", value)} />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Parent details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Parent name" value={form.parentName} onChange={(value) => set("parentName", value)} />
            <Field label="Relationship" value={form.relationship} onChange={(value) => set("relationship", value)} />
            <Field label="Phone" value={form.parentPhone} onChange={(value) => set("parentPhone", value)} />
            <Field label="Email" type="email" value={form.parentEmail ?? ""} onChange={(value) => set("parentEmail", value)} />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Previous school</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Previous school" value={form.previousSchool ?? ""} onChange={(value) => set("previousSchool", value)} />
            <Field label="Previous class" value={form.previousClass ?? ""} onChange={(value) => set("previousClass", value)} />
            <Field label="Medical notes" value={form.medicalNotes ?? ""} onChange={(value) => set("medicalNotes", value)} />
          </div>
        </Card>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Link href="/admin/admissions" className={buttonStyles("outline")}>Cancel</Link><Button disabled={busy} onClick={() => void submit()}>{busy ? "Saving..." : "Create application"}</Button></div>
    </>
  );
}

const readImageFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result ?? ""));
  reader.onerror = () => reject(new Error("Image could not be read."));
  reader.readAsDataURL(file);
});

export function PublicAdmissionFormScreen() {
  const { create, formConfig } = useAdmissions();
  const { state } = useAcademics();
  const { settings } = useSchoolSettings();
  const { toast } = useActionFeedback();
  const [form, setForm] = useState<AdmissionInput>({ ...initialInput, schoolLevel: settings.schoolLevels[0] ?? "SECONDARY" });
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<AdmissionApplication | null>(null);
  const fields = formConfig.fields.filter((field) => field.enabled);
  const set = (key: keyof AdmissionInput, value: string) => setForm((current) => ({ ...current, [key]: value || undefined }));
  const setCustom = (key: string, value: string) => setForm((current) => ({ ...current, customFields: { ...current.customFields, [key]: value } }));
  const valueFor = (field: AdmissionFormField) => {
    if (isCustomField(field.key)) return form.customFields?.[field.key] ?? "";
    return String(form[field.key as keyof AdmissionInput] ?? "");
  };
  const classes = state.classes.filter((item) => item.status === "ACTIVE" && settings.schoolLevels.includes(item.level));
  const validate = () => {
    const missing = fields.filter((item) => item.required).find((item) => {
      const value = isCustomField(item.key) ? form.customFields?.[item.key] : form[item.key as keyof AdmissionInput];
      return typeof value !== "string" || !value.trim();
    });
    return missing?.label;
  };
  const submit = async () => {
    const missing = validate();
    if (missing) {
      toast(`${missing} is required.`, "warning");
      return;
    }
    setBusy(true);
    try {
      const item = await create(form);
      setSubmitted(item);
      toast("Application submitted.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Application could not be submitted.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!formConfig.isPublished) {
    return <main className="min-h-screen bg-surface-muted px-4 py-10"><section className="mx-auto max-w-2xl rounded-lg border bg-surface p-8 text-center"><BrandMark settings={settings} /><h1 className="mt-6 text-2xl font-bold">Admissions are currently closed</h1><p className="mt-3 text-sm text-muted">Please contact the school office for the next admission window.</p></section></main>;
  }

  if (submitted) {
    return <main className="min-h-screen bg-surface-muted px-4 py-10"><section className="mx-auto max-w-2xl rounded-lg border bg-surface p-8 text-center"><BrandMark settings={settings} /><h1 className="mt-6 text-2xl font-bold">Application received</h1><p className="mt-3 text-sm text-muted">Your application number is <span className="font-semibold text-foreground">{submitted.applicationNumber}</span>.</p><p className="mt-2 text-sm text-muted">The admissions team will review the details and contact the parent or guardian.</p></section></main>;
  }

  return (
    <main className="min-h-screen bg-surface-muted">
      <section className="border-b bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark settings={settings} />
          <div className="max-w-xl sm:text-right">
            <h1 className="text-3xl font-bold tracking-tight">{formConfig.title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">{formConfig.intro}</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-8">
        <Card className="p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map((field) => <PublicFormField key={field.key} field={field} value={valueFor(field)} classes={classes} photoUrl={form.photoUrl} onImage={(value) => set("photoUrl", value)} onChange={(value) => isCustomField(field.key) ? setCustom(field.key, value) : set(field.key as keyof AdmissionInput, value)} onClass={(value) => { const selected = classes.find((item) => item.id === value); setForm((current) => ({ ...current, classId: value, schoolLevel: selected?.level ?? current.schoolLevel })); }} />)}
          </div>
          <div className="mt-6 flex justify-end"><Button disabled={busy} onClick={() => void submit()}>{busy ? "Submitting..." : "Submit application"}</Button></div>
        </Card>
      </section>
    </main>
  );
}

function BrandMark({ settings }: { settings: ReturnType<typeof useSchoolSettings>["settings"] }) {
  return <div className="flex items-center gap-3">{settings.logoUrl ? <img src={settings.logoUrl} alt={`${settings.name} logo`} className="size-16 rounded-lg border bg-white object-contain p-2" /> : <span className="flex size-16 items-center justify-center rounded-lg bg-[var(--school-primary)] text-xl font-bold text-[var(--school-primary-foreground)]">{(settings.shortName || settings.name || "S").slice(0, 2).toUpperCase()}</span>}<div><p className="text-xl font-bold">{settings.name}</p>{settings.motto && <p className="text-sm text-muted">{settings.motto}</p>}</div></div>;
}

function PublicFormField({ field, value, classes, photoUrl, onChange, onClass, onImage }: { field: AdmissionFormField; value: string; classes: SchoolClass[]; photoUrl?: string; onChange(value: string): void; onClass(value: string): void; onImage(value: string): void }) {
  const required = field.required ? " *" : "";
  if (field.key === "photoUrl" || field.type === "image") {
    return <label className="text-sm font-medium sm:col-span-2">{field.label}{required}{photoUrl && <img src={photoUrl} alt="Applicant preview" className="mt-3 size-24 rounded-lg border object-cover" />}<Input className="mt-2" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImageFile(file).then(onImage); }} /></label>;
  }
  if (field.key === "classId") {
    return <label className="text-sm font-medium">{field.label}{required}<Select searchable className="mt-2" label={field.label} value={value} onChange={onClass} placeholder="Select class" options={classes.map((item) => ({ value: item.id, label: item.displayName, description: item.level }))} /></label>;
  }
  if (field.key === "gender") {
    return <label className="text-sm font-medium">{field.label}{required}<Select className="mt-2" label={field.label} value={value} onChange={onChange} placeholder="Select gender" options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} /></label>;
  }
  if (field.type === "textarea") {
    return <label className="text-sm font-medium sm:col-span-2">{field.label}{required}<textarea className="mt-2 min-h-24 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-[var(--school-primary)]" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
  }
  const type = field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "date" ? "date" : "text";
  return <Field label={`${field.label}${required}`} type={type} value={value} onChange={onChange} />;
}

export function AdmissionDetailScreen({ applicationId }: { applicationId: string }) {
  const { applications, formConfig, updateStatus } = useAdmissions();
  const { state, createGuardian, createStudent } = useAcademics();
  const { confirm, toast } = useActionFeedback();
  const item = applications.find((entry) => entry.id === applicationId);
  if (!item) return <><PageHeader title="Admission not found" description="This record may no longer be available." backFallback="/admin/admissions" /><Card className="p-8 text-center text-sm text-muted">Return to Admissions to choose another record.</Card></>;
  const schoolClass = state.classes.find((entry) => entry.id === item.classId);
  const customRows = Object.entries(item.customFields ?? {}).map(([key, value]) => [formConfig.fields.find((field) => field.key === key)?.label ?? key.replace(/^custom-/, "Custom field "), value || "Not provided"] as [string, string]);

  const enroll = async () => {
    const guardian = await createGuardian({ fullName: item.parentName, relationship: item.relationship, phone: item.parentPhone, email: item.parentEmail, address: item.address, isPrimaryContact: true, isEmergencyContact: true });
    const student = await createStudent({ admissionNumber: "", firstName: item.firstName, middleName: item.middleName, lastName: item.lastName, gender: item.gender, dateOfBirth: item.dateOfBirth, admissionDate: new Date().toISOString().slice(0, 10), nationality: item.nationality, address: item.address, photoUrl: item.photoUrl, medicalNotes: item.medicalNotes, emergencyContactName: item.parentName, emergencyContactPhone: item.parentPhone, schoolLevel: item.schoolLevel, classId: item.classId, parentIds: [guardian.id], guardianIds: [guardian.id], guardianName: guardian.fullName, guardianPhone: guardian.phone, guardianEmail: guardian.email, status: "ACTIVE" });
    await updateStatus(item.id, "ENROLLED", "Student record created from admission form.", student.id);
    toast("Applicant enrolled as student.", "success");
  };

  return (
    <>
      <PageHeader title={fullName(item)} description={`${item.applicationNumber} - ${schoolClass?.displayName ?? "Unknown class"}`} backFallback="/admin/admissions" action={<Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          {item.photoUrl && <Card className="p-5"><h2 className="font-semibold">Applicant photo</h2><img src={item.photoUrl} alt={`${fullName(item)} photo`} className="mt-4 size-32 rounded-lg border object-cover" /></Card>}
          <InfoCard title="Student details" rows={[["Full name", fullName(item)], ["Class", schoolClass?.displayName ?? "Unknown class"], ["Gender", item.gender ?? "Not provided"], ["Date of birth", item.dateOfBirth ? formatDate(item.dateOfBirth) : "Not provided"], ["Nationality", item.nationality ?? "Not provided"], ["Address", item.address ?? "Not provided"], ["Medical notes", item.medicalNotes ?? "None"]]} />
          <InfoCard title="Parent details" rows={[["Name", item.parentName], ["Relationship", item.relationship], ["Phone", item.parentPhone], ["Email", item.parentEmail ?? "Not provided"]]} />
          <InfoCard title="Previous school" rows={[["School", item.previousSchool ?? "Not provided"], ["Class", item.previousClass ?? "Not provided"]]} />
          {!!customRows.length && <InfoCard title="Custom fields" rows={customRows} />}
        </div>
        <Card className="h-fit p-5">
          <h2 className="font-semibold">Decision</h2>
          <div className="mt-4 space-y-3">
            {statuses.filter((status) => status !== "ENROLLED").map((status) => <Button key={status} className="w-full" variant={item.status === status ? "primary" : "outline"} onClick={() => void updateStatus(item.id, status).then(() => toast("Admission status updated.", "success"))}>{statusLabel(status)}</Button>)}
            {item.status === "ACCEPTED" && <Button className="w-full" onClick={() => confirm({ title: "Enroll applicant?", description: "This creates a real student and parent record in the backend.", confirmLabel: "Enroll student", onConfirm: enroll })}><UserCheck size={16} />Enroll as student</Button>}
            {item.enrolledStudentId && <Link className={`${buttonStyles("outline")} w-full`} href={`/admin/students/${item.enrolledStudentId}`}>Open student record</Link>}
          </div>
        </Card>
      </div>
    </>
  );
}

function InfoCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return <Card className="p-5"><h2 className="font-semibold">{title}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label}><p className="text-xs text-muted">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}</div></Card>;
}
