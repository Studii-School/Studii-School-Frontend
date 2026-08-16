"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getClassOptions } from "@/features/academics/academics.class-utils";
import { useAcademics } from "@/features/academics/academics-context";
import { eventAudiences, eventCategories } from "./events.defaults";
import type {
  EventAudience,
  EventCategory,
  SchoolEvent,
  SchoolEventInput,
} from "./events.types";

const emptyEvent: SchoolEventInput = {
  title: "", shortDescription: "", description: "", category: "General",
  startDate: "", startTime: "", endDate: "", endTime: "", location: "",
  audience: ["Everyone"], selectedClasses: [], color: "#075985",
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
  const classOptions = getClassOptions(state);
  const [form, setForm] = useState<SchoolEventInput>(() => toInput(event));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const patch = <K extends keyof SchoolEventInput>(
    key: K,
    value: SchoolEventInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const toggleAudience = (audience: EventAudience) =>
    patch(
      "audience",
      form.audience.includes(audience)
        ? form.audience.filter((item) => item !== audience)
        : [...form.audience, audience],
    );
  const toggleClass = (classId: string) =>
    patch(
      "selectedClasses",
      form.selectedClasses?.includes(classId)
        ? form.selectedClasses.filter((id) => id !== classId)
        : [...(form.selectedClasses ?? []), classId],
    );
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
        <div className="flex flex-wrap gap-2">
          {eventAudiences.map((audience) => (
            <label key={audience} className="flex min-h-10 items-center gap-2 rounded-[10px] border px-3 text-sm">
              <input type="checkbox" checked={form.audience.includes(audience)} onChange={() => toggleAudience(audience)} />
              {audience}
            </label>
          ))}
        </div>
        {errors.audience && <p className="mt-1 text-xs text-danger">{errors.audience}</p>}
      </fieldset>
      {form.audience.includes("Selected Classes") && (
        <fieldset>
          <legend className={labelClass}>Selected classes</legend>
          <div className="flex flex-wrap gap-2">
            {classOptions.map((item) => (
              <label key={item.value} className="flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm">
                <input type="checkbox" checked={form.selectedClasses?.includes(item.value) ?? false} onChange={() => toggleClass(item.value)} />
                {item.label}
              </label>
            ))}
          </div>
          {errors.classes && <p className="mt-1 text-xs text-danger">{errors.classes}</p>}
        </fieldset>
      )}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => patch("isFeatured", e.target.checked)} />Featured event</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={(e) => patch("isPublished", e.target.checked)} />Publish event</label>
      </div>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : event ? "Update event" : "Create event"}</Button>
      </div>
    </form>
  );
}
