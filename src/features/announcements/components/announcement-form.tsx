"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getClassOptions } from "@/features/academics/academics.class-utils";
import { useAcademics } from "@/features/academics/academics-context";
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementInput,
  AnnouncementStatus,
} from "../announcements.types";

const audienceOptions: Array<{
  value: AnnouncementAudience;
  label: string;
}> = [
  { value: "EVERYONE", label: "Everyone" },
  { value: "STUDENTS", label: "Students" },
  { value: "TEACHERS", label: "Teachers" },
  { value: "PARENTS", label: "Parents" },
  { value: "STAFF", label: "Staff" },
  { value: "SELECTED_CLASSES", label: "Selected Classes" },
];

export function AnnouncementForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Announcement;
  onSave: (input: AnnouncementInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { state } = useAcademics();
  const activeClasses = getClassOptions(state);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [audiences, setAudiences] = useState<AnnouncementAudience[]>(
    initial?.audiences ?? [],
  );
  const [classIds, setClassIds] = useState(initial?.selectedClassIds ?? []);
  const [status, setStatus] = useState<AnnouncementStatus>(
    initial?.status ?? "DRAFT",
  );
  const [publishAt, setPublishAt] = useState(
    initial?.publishAt ?? new Date().toISOString().slice(0, 10),
  );
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt ?? "");
  const [isPinned, setPinned] = useState(initial?.isPinned ?? false);
  const [attachmentName, setAttachment] = useState(
    initial?.attachmentName ?? "",
  );
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(initial?.ctaUrl ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleAudience = (value: AnnouncementAudience) =>
    setAudiences((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  const toggleClass = (id: string) =>
    setClassIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!title.trim() || !summary.trim() || !content.trim()) {
      setError("Title, summary and message are required.");
      return;
    }
    if (!audiences.length) {
      setError("Select at least one audience.");
      return;
    }
    if (audiences.includes("SELECTED_CLASSES") && !classIds.length) {
      setError("Select at least one class.");
      return;
    }
    if (expiresAt && publishAt && expiresAt < publishAt) {
      setError("Expiry date cannot be before the publish date.");
      return;
    }
    if (ctaUrl) {
      try {
        new URL(ctaUrl);
      } catch {
        setError("Enter a valid call-to-action URL including https://");
        return;
      }
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        audiences,
        selectedClassIds: audiences.includes("SELECTED_CLASSES")
          ? classIds
          : [],
        status,
        isPinned,
        publishAt: status === "PUBLISHED" ? publishAt : undefined,
        expiresAt: expiresAt || undefined,
        attachmentName: attachmentName || undefined,
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
        createdByUserId: "admin-user-001",
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Announcement could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold">Content</h3>
        <div className="mt-3 grid gap-4">
          <label className="text-sm font-medium">Title<Input className="mt-2" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="text-sm font-medium">Short summary<Input className="mt-2" value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
          <label className="text-sm font-medium">Full message<textarea className="mt-2 min-h-28 w-full rounded-[10px] border bg-surface p-3" value={content} onChange={(event) => setContent(event.target.value)} /></label>
        </div>
      </section>
      <section>
        <h3 className="text-sm font-semibold">Audience</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {audienceOptions.map((item) => (
            <label key={item.value} className="flex min-h-10 items-center gap-2 rounded-[10px] border px-3 text-sm">
              <input type="checkbox" checked={audiences.includes(item.value)} onChange={() => toggleAudience(item.value)} />
              {item.label}
            </label>
          ))}
        </div>
        {audiences.includes("SELECTED_CLASSES") && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeClasses.map((item) => (
              <label key={item.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={classIds.includes(item.value)} onChange={() => toggleClass(item.value)} />
                {item.label}
              </label>
            ))}
          </div>
        )}
        <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm">
          <b>Visible to:</b>{" "}
          {audiences
            .map(
              (item) =>
                audienceOptions.find((option) => option.value === item)?.label,
            )
            .join(", ") || "No audience selected"}
          {classIds.length > 0 && audiences.includes("SELECTED_CLASSES") && (
            <>
              <br />
              <b>Classes:</b>{" "}
              {classIds
                .map(
                  (id) =>
                    state.classes.find((item) => item.id === id)?.displayName,
                )
                .filter(Boolean)
                .join(", ")}
            </>
          )}
        </p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <h3 className="text-sm font-semibold sm:col-span-2">Publishing</h3>
        <label className="text-sm font-medium">
          Status
          <Select className="mt-2" label="Announcement status" value={status} onChange={(value) => setStatus(value as AnnouncementStatus)} options={["DRAFT", "PUBLISHED", "ARCHIVED"].map((value) => ({ value, label: value }))} />
        </label>
        <label className="text-sm font-medium">Publish date<Input className="mt-2" type="date" value={publishAt} onChange={(event) => setPublishAt(event.target.value)} /></label>
        <label className="text-sm font-medium">Expiry date<Input className="mt-2" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPinned} onChange={(event) => setPinned(event.target.checked)} />Pin as important</label>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <h3 className="text-sm font-semibold sm:col-span-2">Optional actions</h3>
        <label className="text-sm font-medium">Attachment placeholder<Input className="mt-2" value={attachmentName} onChange={(event) => setAttachment(event.target.value)} placeholder="Term-calendar.pdf" /></label>
        <label className="text-sm font-medium">CTA label<Input className="mt-2" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} /></label>
        <label className="text-sm font-medium sm:col-span-2">CTA URL<Input className="mt-2" type="url" value={ctaUrl} onChange={(event) => setCtaUrl(event.target.value)} placeholder="https://example.com" /></label>
      </section>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save announcement"}</Button>
      </div>
    </form>
  );
}
