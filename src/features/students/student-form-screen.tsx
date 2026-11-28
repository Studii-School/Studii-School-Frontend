"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, FileCheck2, HeartPulse, School, Trash2, Upload, UserRound, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileImageField } from "@/components/shared/profile-image-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandIcon, type BrandTone } from "@/components/ui/brand-icon";
import { Input } from "@/components/ui/input";
import { MultiSelect, Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import type {
  Guardian,
  SchoolLevel,
  StudentInput,
  StudentStatus,
} from "@/features/academics/academics.types";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { availableSchoolLevels, preferredSchoolLevel, studentRequiredIssues } from "./student-form-rules";

const steps = [
  "Student",
  "Class",
  "Parent",
  "Health",
  "Files",
  "Review",
];

type FormState = Omit<StudentInput, "schoolLevel"> & {
  schoolLevel: SchoolLevel | "";
  guardianMode: "existing" | "new";
  existingGuardianId: string;
  selectedGuardianIds: string[];
  guardianRelationship: string;
  guardianDateOfBirth: string;
  guardianAddress: string;
  guardianPhotoUrl: string;
  guardianPrimary: boolean;
  guardianEmergency: boolean;
};

const blankForm = (level: SchoolLevel | ""): FormState => ({
  admissionNumber: "",
  firstName: "",
  middleName: "",
  lastName: "",
  gender: undefined,
  dateOfBirth: "",
  admissionDate: new Date().toISOString().slice(0, 10),
  nationality: "Nigerian",
  email: "",
  phone: "",
  address: "",
  photoUrl: "",
  medicalNotes: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  schoolLevel: level,
  classId: "",
  guardianIds: [],
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  status: "ACTIVE",
  temporaryPassword: "",
  guardianMode: "existing",
  existingGuardianId: "",
  selectedGuardianIds: [],
  guardianRelationship: "Parent",
  guardianDateOfBirth: "",
  guardianAddress: "",
  guardianPhotoUrl: "",
  guardianPrimary: true,
  guardianEmergency: true,
});

export function StudentFormPage({
  studentId,
  variant = "page",
  onCancel,
  onSaved,
}: {
  studentId?: string;
  variant?: "page" | "modal";
  onCancel?: () => void;
  onSaved?: (studentId: string) => void;
}) {
  const {
    state,
    isLoading: academicsLoading,
    createGuardian,
    updateGuardian,
    createStudent,
    updateStudent,
    moveStudentToClass,
    addStudentDocument,
    assignStudentParents,
  } = useAcademics();
  const { settings } = useSchoolSettings();
  const { toast } = useActionFeedback();
  const router = useRouter();
  const existing = state.students.find((item) => item.id === studentId);
  const existingGuardian = state.guardians.find((item) =>
    existing?.guardianIds.includes(item.id),
  );
  const availableLevels = availableSchoolLevels(state.classes, settings.schoolLevels);
  const defaultLevel = preferredSchoolLevel(availableLevels, settings.schoolLevels);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const schoolLevelTouched = useRef(false);
  const [documents, setDocuments] = useState<
    Array<{ name: string; type: string; dataUrl: string }>
  >([]);
  const [form, setForm] = useState<FormState>(() =>
    existing
      ? {
          ...blankForm(existing.schoolLevel),
          ...existing,
          guardianMode: existingGuardian ? "existing" : "new",
          existingGuardianId: existingGuardian?.id ?? "",
          selectedGuardianIds: existing.guardianIds,
          guardianRelationship: existingGuardian?.relationship ?? "Parent",
          guardianDateOfBirth: existingGuardian?.dateOfBirth?.slice(0, 10) ?? "",
          guardianAddress: existingGuardian?.address ?? "",
          guardianPhotoUrl: existingGuardian?.photoUrl ?? "",
          guardianPrimary: existingGuardian?.isPrimaryContact ?? true,
          guardianEmergency: existingGuardian?.isEmergencyContact ?? true,
        }
      : blankForm(defaultLevel),
  );

  useEffect(() => {
    if (existing || academicsLoading || schoolLevelTouched.current) return;
    void Promise.resolve().then(() => setForm((current) => current.classId || schoolLevelTouched.current ? current : { ...current, schoolLevel: preferredSchoolLevel(availableSchoolLevels(state.classes, settings.schoolLevels), settings.schoolLevels) }));
  }, [academicsLoading, existing, settings.schoolLevels, state.classes]);

  useEffect(() => {
    if (academicsLoading || !form.classId) return;
    const match = state.classes.some((item) => item.id === form.classId && item.status === "ACTIVE" && item.level === form.schoolLevel);
    if (!match) void Promise.resolve().then(() => setForm((current) => current.classId === form.classId ? { ...current, classId: "" } : current));
  }, [academicsLoading, form.classId, form.schoolLevel, state.classes]);

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const classes = state.classes
    .filter(
      (item) =>
        item.status === "ACTIVE" && item.level === form.schoolLevel,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedClass = state.classes.find((item) => item.id === form.classId);
  const selectedGuardians = state.guardians.filter((item) =>
    form.selectedGuardianIds.includes(item.id),
  );
  const studentName =
    [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ") ||
    "Not provided";
  const requiredIssues = studentRequiredIssues(form, classes, state.guardians);
  const completion = requiredIssues.filter((issues) => issues.length === 0).length;
  const newGuardianDetails = [
    ["Full name", form.guardianName],
    ["Relationship", form.guardianRelationship],
    ["Phone", form.guardianPhone],
    ["Email", form.guardianEmail],
    ["Address", form.guardianAddress],
    ["Primary contact", form.guardianPrimary ? "Yes" : "No"],
    ["Emergency contact", form.guardianEmergency ? "Yes" : "No"],
  ] as const;

  const validateStep = () => {
    const issue = requiredIssues[step]?.[0];
    if (issue) toast(issue, "error");
    return !issue;
  };

  const next = () => {
    if (validateStep()) setStep((current) => Math.min(current + 1, 5));
  };

  const addFile = (file?: File) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast("Each document must be smaller than 3MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setDocuments((current) => [
        ...current,
        {
          name: file.name,
          type: file.type || "Document",
          dataUrl: String(reader.result),
        },
      ]);
    reader.readAsDataURL(file);
  };

  const addPhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Upload a valid image file.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Photo must be smaller than 5MB.", "error");
      return;
    }
    try {
      patch("photoUrl", await resizeStudentPhoto(file));
    } catch {
      toast("Photo could not be prepared. Try a different image.", "error");
    }
  };

  const save = async () => {
    const incomplete = requiredIssues.findIndex((issues) => issues.length > 0);
    if (incomplete >= 0) {
      setStep(incomplete);
      toast(requiredIssues[incomplete][0], "error");
      return;
    }
    setSaving(true);
    try {
      let guardian: Guardian | undefined;
      const linkedGuardians = state.guardians.filter((item) =>
        form.selectedGuardianIds.includes(item.id),
      );
      let guardianIds = linkedGuardians.map((item) => item.id);
      if (form.guardianMode === "existing") {
        guardian = linkedGuardians[0];
        if (guardian && (form.guardianPhotoUrl !== (guardian.photoUrl ?? "") || form.guardianDateOfBirth !== (guardian.dateOfBirth?.slice(0, 10) ?? ""))) {
          guardian = await updateGuardian(guardian.id, { photoUrl: form.guardianPhotoUrl || undefined, dateOfBirth: form.guardianDateOfBirth || undefined });
        }
      } else {
        guardian = await createGuardian({
          fullName: form.guardianName.trim(),
          relationship: form.guardianRelationship.trim() || "Guardian",
          phone: form.guardianPhone.trim(),
          email: form.guardianEmail?.trim() || undefined,
          address: form.guardianAddress.trim() || undefined,
          dateOfBirth: form.guardianDateOfBirth || undefined,
          photoUrl: form.guardianPhotoUrl || undefined,
          isPrimaryContact: form.guardianPrimary,
          isEmergencyContact: form.guardianEmergency,
        });
        guardianIds = [...new Set([...guardianIds, guardian.id])];
      }
      if (guardianIds.length > 2) {
        throw new Error("A student can have a maximum of two parents.");
      }
      if (!guardianIds.length) throw new Error("Select or create at least one parent.");
      guardian =
        guardian ??
        linkedGuardians[0] ??
        state.guardians.find((item) => item.id === guardianIds[0]);
      if (!guardian) throw new Error("Select or create at least one parent.");
      const input: StudentInput = {
        admissionNumber: existing ? form.admissionNumber : "",
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || undefined,
        admissionDate: form.admissionDate || undefined,
        nationality: form.nationality || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        address: form.address || undefined,
        photoUrl: form.photoUrl || undefined,
        medicalNotes: form.medicalNotes || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        schoolLevel: form.schoolLevel as SchoolLevel,
        classId: form.classId,
        parentIds: guardianIds,
        guardianIds,
        guardianName: guardian.fullName,
        guardianPhone: guardian.phone,
        guardianEmail: guardian.email,
        status: form.status,
        temporaryPassword: form.temporaryPassword || undefined,
      };

      let savedId: string;
      if (existing) {
        const classChanged = existing.classId !== input.classId;
        await updateStudent(existing.id, {
          ...input,
          classId: classChanged ? existing.classId : input.classId,
          schoolLevel: classChanged
            ? existing.schoolLevel
            : input.schoolLevel,
        });
        if (classChanged) {
          await moveStudentToClass({
            studentId: existing.id,
            classId: input.classId,
            effectiveDate: new Date().toISOString().slice(0, 10),
            reason: "Updated from student edit form",
          });
        }
        await assignStudentParents(existing.id, guardianIds);
        savedId = existing.id;
        toast("Student updated successfully.", "success");
      } else {
        const created = await createStudent(input);
        savedId = created.id;
        for (const document of documents) {
          await addStudentDocument(savedId, {
            ...document,
            uploadedBy: "Admin",
          });
        }
        toast("Student added successfully.", "success");
      }
      if (onSaved) {
        onSaved(savedId);
      } else {
        router.push(`/admin/students/${savedId}`);
      }
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Student could not be saved.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={variant === "modal" ? "w-full min-w-0" : "w-full min-w-0 max-w-4xl"}>
      {variant === "page" && (
        <PageHeader
          title={existing ? "Edit Student" : "Add Enrolled Student"}
          description="Capture the essentials first, then enrich the student profile without making manual entry feel heavy."
        />
      )}
      <Card className={variant === "modal" ? "mb-4 overflow-hidden" : "sticky top-16 z-10 mb-5 overflow-hidden shadow-sm"}>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_170px]">
          <nav aria-label="Student form sections" className="grid min-w-0 grid-cols-3 gap-2 p-3 lg:grid-cols-6">
            <ProgressTile icon={<UserRound size={16} />} tone="primary" label="Name" done={!requiredIssues[0].length} status="Required" active={step === 0} onClick={() => setStep(0)} />
            <ProgressTile icon={<School size={16} />} tone="secondary" label="Class" done={!requiredIssues[1].length} status="Required" active={step === 1} onClick={() => setStep(1)} />
            <ProgressTile icon={<UsersRound size={16} />} tone="accent" label="Parent" done={!requiredIssues[2].length} status="Required" active={step === 2} onClick={() => setStep(2)} />
            <ProgressTile icon={<HeartPulse size={16} />} tone="secondary" label="Care notes" done={Boolean(form.emergencyContactName?.trim() || form.medicalNotes?.trim() || documents.length)} status="Optional" active={step === 3} onClick={() => setStep(3)} />
            <ProgressTile icon={<Upload size={16} />} tone="accent" label="Files" done={Boolean(documents.length)} status="Optional" active={step === 4} onClick={() => setStep(4)} />
            <ProgressTile icon={<FileCheck2 size={16} />} tone="primary" label="Review" done={false} status="Summary" active={step === 5} onClick={() => setStep(5)} />
          </nav>
          <div className="min-w-0 border-t bg-surface-muted p-3 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase text-muted">Record readiness</p>
            <p className="mt-1 text-2xl font-bold">{completion}/3</p>
            <p className="mt-1 truncate text-xs text-muted" title={selectedClass?.displayName ?? "Class not selected"}>{selectedClass?.displayName ?? "Class not selected"}</p>
          </div>
        </div>
      </Card>

      <section id="student-form-section" aria-label={`${steps[step]} details`} className="rounded-xl border bg-surface p-4 sm:p-5">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <Input value={form.firstName} onChange={(event) => patch("firstName", event.target.value)} />
            </Field>
            <Field label="Middle name">
              <Input value={form.middleName ?? ""} onChange={(event) => patch("middleName", event.target.value)} />
            </Field>
            <Field label="Last name">
              <Input value={form.lastName} onChange={(event) => patch("lastName", event.target.value)} />
            </Field>
            <Field label="Gender">
              <Select label="Gender" value={form.gender ?? ""} onChange={(value) => patch("gender", value as "Male" | "Female")} placeholder="Select gender" options={["Male", "Female"].map((value) => ({ value, label: value }))} />
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={form.dateOfBirth ?? ""} onChange={(event) => patch("dateOfBirth", event.target.value)} />
            </Field>
            <Field label="Student email">
              <Input type="email" value={form.email ?? ""} onChange={(event) => patch("email", event.target.value)} />
            </Field>
            <Field label="Student phone">
              <Input type="tel" value={form.phone ?? ""} onChange={(event) => patch("phone", event.target.value)} />
            </Field>
            <Field label="Nationality">
              <Input value={form.nationality ?? ""} onChange={(event) => patch("nationality", event.target.value)} />
            </Field>
            <Field label="Address" wide>
              <Input value={form.address ?? ""} onChange={(event) => patch("address", event.target.value)} />
            </Field>
            <Field label="Student photo" wide>
              <Input className="mb-3" type="url" value={form.photoUrl?.startsWith("data:") ? "" : form.photoUrl ?? ""} onChange={(event) => patch("photoUrl", event.target.value)} placeholder="https://example.com/student.jpg" />
              <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-surface-muted p-3">
                <img
                  src={form.photoUrl || "/default-profile.svg"}
                  alt={form.photoUrl ? `${studentName} preview` : "Default student photo"}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/default-profile.svg";
                  }}
                  className="size-20 rounded-lg border bg-surface object-cover"
                />
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border bg-surface px-3 text-sm font-semibold">
                    <Upload size={16} /> Upload image
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => void addPhoto(event.target.files?.[0])}
                    />
                  </label>
                  {form.photoUrl && (
                    <Button type="button" variant="outline" onClick={() => patch("photoUrl", "")}>
                      <Trash2 size={16} /> Remove image
                    </Button>
                  )}
                </div>
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {!availableLevels.length && <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm sm:col-span-2">There are no active classes for this school. <Link className="font-semibold text-primary underline" href="/admin/settings?section=classes">Open Settings → Classes</Link> to create or activate a class.</p>}
            <Field label="Admission number">
              <Input value={existing ? form.admissionNumber : "Auto-generated when saved"} disabled />
            </Field>
            <Field label="Admission date">
              <Input type="date" value={form.admissionDate ?? ""} onChange={(event) => patch("admissionDate", event.target.value)} />
            </Field>
            <Field label="School type">
              <Select label="School type" value={form.schoolLevel} onChange={(value) => { schoolLevelTouched.current = true; setForm((current) => ({ ...current, schoolLevel: value as SchoolLevel, classId: "" })); }} placeholder="Choose school type" options={availableLevels.map((value) => ({ value, label: value === "PRIMARY" ? "Primary School" : "Secondary School" }))} />
            </Field>
            <Field label="Class">
              <Select searchable label="Class" value={form.classId} onChange={(value) => patch("classId", value)} placeholder="Select class" options={classes.map((item) => ({ value: item.id, label: item.displayName }))} />
            </Field>
            {availableLevels.length > 0 && form.schoolLevel && !classes.length && <p className="text-xs text-warning sm:col-span-2">No active classes for this school type. <Link className="font-semibold underline" href="/admin/settings?section=classes">Manage classes</Link>.</p>}
            <Field label="Student status">
              <Select label="Student status" value={form.status} onChange={(value) => patch("status", value as StudentStatus)} options={["ACTIVE", "INACTIVE", "GRADUATED", "WITHDRAWN", "SUSPENDED"].map((value) => ({ value, label: value }))} />
            </Field>
            <Field label="Current session">
              <Input value={settings.currentAcademicSession} disabled />
            </Field>
            <Field label="Current term">
              <Input value={settings.currentTerm} disabled />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(["existing", "new"] as const).map((value) => (
                <button key={value} type="button" onClick={() => patch("guardianMode", value)} className={`rounded-[8px] border p-4 text-left transition ${form.guardianMode === value ? "border-[var(--school-primary)] bg-primary-light text-[var(--school-primary)]" : "bg-surface hover:bg-surface-muted"}`}>
                  <UsersRound size={18} />
                  <p className="mt-3 font-semibold">{value === "existing" ? "Link existing parent" : "Create parent profile"}</p>
                  <p className="mt-1 text-xs text-muted">{value === "existing" ? "Use a parent already known by the school." : "Create login-ready parent contact details now."}</p>
                </button>
              ))}
            </div>
            {form.guardianMode === "existing" ? (
              <div className="space-y-4">
                <Field label="Find guardian">
                  <MultiSelect searchable label="Existing parents" values={form.selectedGuardianIds} onChange={(values) => { const limited = values.slice(0, 2); patch("selectedGuardianIds", limited); const primary = state.guardians.find((item) => item.id === limited[0]); patch("guardianPhotoUrl", primary?.photoUrl ?? ""); patch("guardianDateOfBirth", primary?.dateOfBirth?.slice(0, 10) ?? ""); }} placeholder="Search by name, phone or email" options={state.guardians.map((item) => ({ value: item.id, label: item.fullName, description: [item.phone, item.email].filter(Boolean).join(" · ") }))} />
                </Field>
                <Field label="Primary parent date of birth"><Input type="date" value={form.guardianDateOfBirth} onChange={(event) => patch("guardianDateOfBirth", event.target.value)} /></Field>
                {selectedGuardians[0] && <ProfileImageField label={`${selectedGuardians[0].fullName}'s profile image`} name={selectedGuardians[0].fullName} value={form.guardianPhotoUrl} onChange={(value) => patch("guardianPhotoUrl", value)} />}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name"><Input value={form.guardianName} onChange={(event) => patch("guardianName", event.target.value)} /></Field>
                <Field label="Relationship"><Input value={form.guardianRelationship} onChange={(event) => patch("guardianRelationship", event.target.value)} /></Field>
                <Field label="Phone"><Input type="tel" value={form.guardianPhone} onChange={(event) => patch("guardianPhone", event.target.value)} /></Field>
                <Field label="Parent login email"><Input type="email" value={form.guardianEmail ?? ""} onChange={(event) => patch("guardianEmail", event.target.value)} /></Field>
                <Field label="Parent date of birth"><Input type="date" value={form.guardianDateOfBirth} onChange={(event) => patch("guardianDateOfBirth", event.target.value)} /></Field>
                <Field label="Address" wide><Input value={form.guardianAddress} onChange={(event) => patch("guardianAddress", event.target.value)} /></Field>
                <div className="sm:col-span-2"><ProfileImageField label="Parent profile image" name={form.guardianName || "Parent"} value={form.guardianPhotoUrl} onChange={(value) => patch("guardianPhotoUrl", value)} /></div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Emergency contact name"><Input value={form.emergencyContactName ?? ""} onChange={(event) => patch("emergencyContactName", event.target.value)} /></Field>
            <Field label="Emergency contact phone"><Input type="tel" value={form.emergencyContactPhone ?? ""} onChange={(event) => patch("emergencyContactPhone", event.target.value)} /></Field>
            <Field label="Medical notes" wide><textarea className="min-h-28 w-full rounded-[10px] border bg-surface p-3 text-sm" value={form.medicalNotes ?? ""} onChange={(event) => patch("medicalNotes", event.target.value)} /></Field>
          </div>
        )}

        {step === 4 && (
          <div>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold">
              <Upload size={16} /> Add Document
              <input className="sr-only" type="file" onChange={(event) => addFile(event.target.files?.[0])} />
            </label>
            <div className="mt-4 divide-y rounded-xl border px-4">
              {documents.map((item) => <div key={item.name} className="py-3 text-sm">{item.name}</div>)}
              {!documents.length && <p className="py-6 text-center text-sm text-muted">Documents are optional and can be added later.</p>}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            {completion < 3 && <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm"><p className="font-semibold">Complete these required details before creating the record:</p><ul className="mt-2 space-y-1">{requiredIssues.flatMap((issues, index) => issues.map((issue) => <li key={`${index}-${issue}`}><button type="button" className="text-left text-primary underline" onClick={() => setStep(index)}>{steps[index]}: {issue}</button></li>))}</ul></div>}
            <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
              <div className="flex min-h-44 items-center justify-center rounded-xl border bg-surface-muted p-3">
                <img
                  src={form.photoUrl || "/default-profile.svg"}
                  alt={form.photoUrl ? `${studentName} preview` : "Default student photo"}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/default-profile.svg";
                  }}
                  className="size-36 rounded-lg border bg-surface object-cover"
                />
              </div>
              <ReviewSection
                title="Personal Details"
                items={[
                  ["Student", studentName],
                  ["First name", form.firstName],
                  ["Middle name", form.middleName],
                  ["Last name", form.lastName],
                  ["Gender", form.gender],
                  ["Date of birth", form.dateOfBirth],
                  ["Student email", form.email],
                  ["Student phone", form.phone],
                  ["Nationality", form.nationality],
                  ["Address", form.address],
                ]}
              />
            </div>

            <ReviewSection
              title="School Details"
              items={[
                ["Admission number", existing ? form.admissionNumber : "Auto-generated when saved"],
                ["Admission date", form.admissionDate],
                ["School type", form.schoolLevel],
                ["Class", selectedClass?.displayName],
                ["Student status", form.status],
                ["Current session", settings.currentAcademicSession],
                ["Current term", settings.currentTerm],
              ]}
            />

            <div className="rounded-xl border">
              <div className="border-b p-4">
                <h3 className="font-semibold">Parent Details</h3>
              </div>
              <div className="divide-y">
                {selectedGuardians.map((guardian) => (
                  <div key={guardian.id} className="grid gap-3 p-4 sm:grid-cols-2">
                    {([
                      ["Full name", guardian.fullName],
                      ["Relationship", guardian.relationship],
                      ["Phone", guardian.phone],
                      ["Email", guardian.email],
                      ["Address", guardian.address],
                      ["Primary contact", guardian.isPrimaryContact ? "Yes" : "No"],
                      ["Emergency contact", guardian.isEmergencyContact ? "Yes" : "No"],
                    ] as Array<readonly [string, string | undefined]>).map(([label, value]) => (
                      <ReviewItem key={label} label={label} value={value} />
                    ))}
                  </div>
                ))}
                {form.guardianMode === "new" && (
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    {newGuardianDetails.map(([label, value]) => (
                      <ReviewItem key={label} label={label} value={value} />
                    ))}
                  </div>
                )}
                {!selectedGuardians.length && form.guardianMode === "existing" && (
                  <p className="p-4 text-sm text-muted">No parent selected.</p>
                )}
              </div>
            </div>

            <ReviewSection
              title="Contact and Emergency"
              items={[
                ["Emergency contact name", form.emergencyContactName],
                ["Emergency contact phone", form.emergencyContactPhone],
                ["Medical notes", form.medicalNotes],
              ]}
            />

            <div className="rounded-xl border">
              <div className="border-b p-4">
                <h3 className="font-semibold">Documents</h3>
              </div>
              <div className="divide-y">
                {documents.map((item) => (
                  <div key={`${item.name}-${item.dataUrl}`} className="flex items-center gap-3 p-4 text-sm">
                    {item.type.startsWith("image/") ? (
                      <img src={item.dataUrl} alt={`${item.name} preview`} className="size-14 rounded-lg border object-cover" />
                    ) : (
                      <div className="flex size-14 items-center justify-center rounded-lg border bg-surface-muted text-xs font-semibold uppercase text-muted">
                        File
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.name}</p>
                      <p className="text-xs text-muted">{item.type || "Document"}</p>
                    </div>
                  </div>
                ))}
                {!documents.length && <p className="p-4 text-sm text-muted">No documents selected.</p>}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-3 border-t pt-4">
          <div className="flex flex-wrap gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
              <ArrowLeft size={15} /> Back
            </Button>
          </div>
          {step < 5 ? (
            <Button type="button" onClick={next}>{step === 0 ? "Choose class" : step === 1 ? "Add parent" : step === 2 ? "Health details" : step === 3 ? "Attach files" : "Review record"} <ArrowRight size={15} /></Button>
          ) : (
            <Button type="button" disabled={saving || completion < 3} onClick={() => void save()}><FileCheck2 size={15} />{saving ? "Saving student..." : existing ? "Save Changes" : "Create Student Record"}</Button>
          )}
        </div>
      </section>
    </div>
  );
}

function ProgressTile({
  icon,
  tone,
  label,
  done,
  status,
  active,
  onClick,
}: {
  icon: ReactNode;
  tone: BrandTone;
  label: string;
  done: boolean;
  status: "Required" | "Optional" | "Summary";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-pressed={active} aria-controls="student-form-section" onClick={onClick} className={`min-w-0 rounded-[8px] border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--school-primary)] ${active ? "border-[var(--school-primary)] bg-[var(--school-primary)] text-[var(--school-primary-foreground)]" : "bg-surface hover:border-[var(--school-primary)] hover:bg-surface-muted"}`}>
      <div className="flex items-center justify-between gap-1">
        <BrandIcon tone={tone} className="size-7">{icon}</BrandIcon>
        {done ? <Check size={14} className={`shrink-0 ${active ? "text-current" : "text-[var(--school-primary)]"}`} /> : <span className={`hidden truncate text-[10px] leading-tight sm:block ${active ? "text-current opacity-80" : "text-muted"}`}>{status}</span>}
      </div>
      <span className="mt-2 block truncate text-xs font-semibold" title={label}>{label}</span>
    </button>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`min-w-0 text-sm font-medium ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      <div className="mt-2 min-w-0 max-w-full">{children}</div>
    </label>
  );
}

function ReviewSection({
  title,
  items,
}: {
  title: string;
  items: Array<readonly [string, string | undefined]>;
}) {
  return (
    <div className="rounded-xl border">
      <div className="border-b p-4">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <ReviewItem key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-muted p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words font-semibold">
        {value?.toString().trim() || "Not provided"}
      </p>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.onload = () => resolve(image);
    image.src = src;
  });
}

async function resizeStudentPhoto(file: File) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxSize = 520;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image could not be resized.");
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.78);
}
