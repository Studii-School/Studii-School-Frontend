"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AudiencePicker } from "@/components/shared/audience-picker";
import { getClassOptions } from "@/features/academics/academics.class-utils";
import { useAcademics } from "@/features/academics/academics-context";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { academicTermLabel } from "@/features/academic-period/academic-period.types";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { eventCategories } from "./events.defaults";
import { eventAudienceOptions } from "./events-audience";
import type {
  EventCategory,
  SchoolEvent,
  SchoolEventInput,
} from "./events.types";

const emptyEvent: SchoolEventInput = {
  title: "", shortDescription: "", description: "", category: "General",
  startDate: "", startTime: "", endDate: "", endTime: "", location: "",
  audience: ["Everyone"], selectedClasses: [], color: "#075985",
  academicSession: "", term: "",
  isFeatured: false, isPublished: false,
};
const toInput = (event?: SchoolEvent): SchoolEventInput =>
  event
    ? {
        title: event.title,
        shortDescription: event.shortDescription,
        description: event.description,
        category: event.category,
        startDate: event.startDate,
        startTime: event.startTime,
        endDate: event.endDate,
        endTime: event.endTime,
        location: event.location,
        audience: event.audience,
        selectedClasses: event.selectedClasses,
        color: event.color,
        academicSession: event.academicSession,
        term: event.term,
        isFeatured: event.isFeatured,
        isPublished: event.isPublished,
      }
    : emptyEvent;

const labelClass = "mb-2 block text-sm font-medium";

export function EventForm({
  event,
  onSubmit,
  onCancel,
}: {
  event?: SchoolEvent;
  onSubmit: (input: SchoolEventInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { state } = useAcademics();
  const { selectedSession, selectedTerm } = useAcademicPeriod();
  const { settings } = useSchoolSettings();
  const classOptions = getClassOptions(state);
  const currentSession = selectedSession?.name || settings.currentAcademicSession;
  const currentTerm = selectedTerm ? academicTermLabel(selectedTerm.name) : settings.currentTerm;
  const [form, setForm] = useState<SchoolEventInput>(() => ({
    ...toInput(event),
    academicSession: event?.academicSession || currentSession,
    term: event?.term || currentTerm,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const patch = <K extends keyof SchoolEventInput>(
    key: K,
    value: SchoolEventInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Event title is required.";
    if (!form.startDate) next.startDate = "Start date is required.";
    if (form.endDate && form.endDate < form.startDate) {
      next.endDate = "End date cannot be before the start date.";
    }
    if (!form.audience.length) next.audience = "Select at least one audience.";
    if (
      form.audience.includes("Selected Classes") &&
      !form.selectedClasses?.length
    ) {
      next.classes = "Select at least one class.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const submit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className={labelClass}>Event title</span>
          <Input value={form.title} onChange={(e) => patch("title", e.target.value)} />
          {errors.title && <span className="text-xs text-danger">{errors.title}</span>}
        </label>
        <label>
          <span className={labelClass}>Short description</span>
          <Input value={form.shortDescription} onChange={(e) => patch("shortDescription", e.target.value)} />
        </label>
        <label>
          <span className={labelClass}>Event category</span>
          <Select label="Event category" value={form.category} onChange={(value) => patch("category", value as EventCategory)} options={eventCategories.map((value) => ({ value, label: value }))} />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>Full description</span>
          <textarea className="min-h-24 w-full rounded-[10px] border p-3 text-sm" value={form.description ?? ""} onChange={(e) => patch("description", e.target.value)} />
        </label>
        <label><span className={labelClass}>Start date</span><Input type="date" value={form.startDate} onChange={(e) => patch("startDate", e.target.value)} />{errors.startDate && <span className="text-xs text-danger">{errors.startDate}</span>}</label>
        <label><span className={labelClass}>Start time</span><Input type="time" value={form.startTime ?? ""} onChange={(e) => patch("startTime", e.target.value)} /></label>
        <label><span className={labelClass}>End date</span><Input type="date" value={form.endDate ?? ""} onChange={(e) => patch("endDate", e.target.value)} />{errors.endDate && <span className="text-xs text-danger">{errors.endDate}</span>}</label>
        <label><span className={labelClass}>End time</span><Input type="time" value={form.endTime ?? ""} onChange={(e) => patch("endTime", e.target.value)} /></label>
        <label><span className={labelClass}>Location</span><Input value={form.location ?? ""} onChange={(e) => patch("location", e.target.value)} /></label>
        <label><span className={labelClass}>Event colour</span><div className="flex gap-2"><input aria-label="Event colour" className="h-11 w-12 rounded-[10px] border p-1" type="color" value={form.color ?? "#075985"} onChange={(e) => patch("color", e.target.value)} /><Input value={form.color ?? ""} onChange={(e) => patch("color", e.target.value)} /></div></label>
      </div>
      <fieldset>
        <legend className={labelClass}>Audience</legend>
        <AudiencePicker options={eventAudienceOptions} everyone="Everyone" classesValue="Selected Classes" values={form.audience} onChange={(values) => patch("audience", values)} classOptions={classOptions} selectedClasses={form.selectedClasses ?? []} onClassesChange={(ids) => patch("selectedClasses", ids)} />
        {errors.audience && <p className="mt-1 text-xs text-danger">{errors.audience}</p>}
        {errors.classes && <p className="mt-1 text-xs text-danger">{errors.classes}</p>}
      </fieldset>
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-surface-muted/40 p-3">
        <div><p className="text-sm font-semibold">Publish event</p><p className="text-xs text-muted">{form.isPublished ? "Visible to the selected audience" : "Saved as a draft"}</p></div>
        <Switch checked={form.isPublished} onCheckedChange={(value) => patch("isPublished", value)} label="Publish event" />
      </div>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : event ? "Update event" : "Create event"}</Button>
      </div>
    </form>
  );
}
