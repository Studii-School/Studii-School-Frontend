"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AudienceQuickEdit } from "@/components/shared/audience-picker";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/shared/search-input";
import { Select } from "@/components/ui/select";
import { RowActionSelect } from "@/components/ui/row-action-select";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademics } from "@/features/academics/academics-context";
import { getClassOptions } from "@/features/academics/academics.class-utils";
import { parentChildrenFromAcademics, studentLabel } from "@/features/parents/parent-child-utils";
import { matchesSearch } from "@/lib/search";
import { readStoredToken } from "@/lib/api";
import { useAnnouncements } from "./announcements-context";
import { announcementAudienceOptions } from "./announcement-audiences";
import type { Announcement, AnnouncementAudience, AnnouncementInput, AnnouncementStatus } from "./announcements.types";
import { getAnnouncementsForUser, type AnnouncementViewerRole } from "./announcements.utils";
import { AnnouncementCard } from "./components/announcement-card";
import { AnnouncementForm } from "./components/announcement-form";

type ParentTarget = "ALL" | "PARENT" | string;

export function AdminAnnouncementsScreen() {
  const { announcements, isLoading, error, createAnnouncement, updateAnnouncement, deleteAnnouncement, setPublished } = useAnnouncements();
  const { confirm, toast } = useActionFeedback();
  const { state: academics } = useAcademics();
  const classOptions = getClassOptions(academics);
  const [editing, setEditing] = useState<Announcement | "new">();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AnnouncementStatus | "ALL">("ALL");
  const [audience, setAudience] = useState<AnnouncementAudience | "ALL">("ALL");
  const [busyId, setBusyId] = useState("");
  const filtered = announcements.filter((item) => matchesSearch(search, item.title, item.summary, item.body) && (status === "ALL" || item.status === status) && (audience === "ALL" || item.audiences.includes(audience) || (audience !== "SELECTED_CLASSES" && item.audiences.includes("EVERYONE"))));

  const save = async (input: AnnouncementInput) => {
    try {
      if (editing && editing !== "new") {
        await updateAnnouncement(editing.id, input);
        toast("Announcement updated successfully.", "success");
      } else {
        await createAnnouncement(input);
        toast("Announcement created successfully.", "success");
      }
      setEditing(undefined);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Announcement could not be saved.", "error");
    }
  };

  const toggle = async (item: Announcement) => {
    setBusyId(item.id);
    try {
      await setPublished(item.id, item.status !== "PUBLISHED");
      toast(item.status === "PUBLISHED" ? "Announcement unpublished successfully." : "Announcement published successfully.", "success");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Announcement could not be saved.", "error");
    } finally {
      setBusyId("");
    }
  };

  const saveAudience = async (item: Announcement, audiences: AnnouncementAudience[], selectedClassIds: string[]) => {
    setBusyId(item.id);
    try {
      await updateAnnouncement(item.id, { audiences, selectedClassIds });
      toast("Announcement audience updated.", "success");
    } finally {
      setBusyId("");
    }
  };

  const remove = (item: Announcement) => confirm({
    title: "Delete announcement?",
    description: `"${item.title}" will be removed from every connected portal. This action cannot be undone.`,
    confirmLabel: "Delete Announcement",
    destructive: true,
    onConfirm: async () => {
      await deleteAnnouncement(item.id);
      toast("Announcement deleted successfully.", "success");
    },
  });

  return <>
    <PageHeader title="Announcements" description="Publish one shared announcement source to the right school audiences." action={<Button onClick={() => setEditing("new")}><Plus size={16} />New announcement</Button>} />
    <Modal open={Boolean(editing)} title={editing && editing !== "new" ? "Edit announcement" : "New announcement"} description="Write the announcement and choose who should see it." maxWidth="xl" onClose={() => setEditing(undefined)}>
      <AnnouncementForm initial={editing && editing !== "new" ? editing : undefined} onSave={save} onCancel={() => setEditing(undefined)} />
    </Modal>
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Search announcements" />
      <Select label="Filter by status" value={status} onChange={(value) => setStatus(value as AnnouncementStatus | "ALL")} options={["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map((value) => ({ value, label: value === "ALL" ? "All statuses" : value }))} />
      <Select label="Filter by audience" value={audience} onChange={(value) => setAudience(value as AnnouncementAudience | "ALL")} options={["ALL", "EVERYONE", "STUDENTS", "TEACHERS", "PARENTS", "STAFF", "SELECTED_CLASSES"].map((value) => ({ value, label: value === "ALL" ? "All audiences" : value.replaceAll("_", " ") }))} />
    </div>
    {isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-xl bg-surface-muted" />)}</div> : error ? <p role="alert" className="text-danger">{error}</p> : filtered.length ? <div className="space-y-4">{filtered.map((item) => <AnnouncementCard key={item.id} announcement={item} adminActions={<div className="flex flex-wrap items-center gap-2"><AudienceQuickEdit label={`Audience for ${item.title}`} options={announcementAudienceOptions} everyone="EVERYONE" classesValue="SELECTED_CLASSES" values={item.audiences} selectedClasses={item.selectedClassIds} classOptions={classOptions} disabled={busyId === item.id} onSave={(values, classIds) => saveAudience(item, values, classIds)} /><span className="flex items-center gap-2 rounded-lg border bg-surface-muted/40 px-3 py-2 text-xs font-medium"><span>{item.status === "PUBLISHED" ? "Published" : item.status === "ARCHIVED" ? "Archived" : "Draft"}</span><Switch checked={item.status === "PUBLISHED"} disabled={busyId === item.id} onCheckedChange={() => void toggle(item)} label={`${item.status === "PUBLISHED" ? "Unpublish" : "Publish"} ${item.title}`} /></span><RowActionSelect label={`Actions for ${item.title}`} actions={[{ label: "Edit", onSelect: () => setEditing(item) }, { label: "Delete", onSelect: () => remove(item) }]} /></div>} />)}</div> : <EmptyState title="No announcements found" description="Adjust the filters or create a new announcement." />}
  </>;
}

export function AudienceAnnouncementsScreen({ role }: { role: Exclude<AnnouncementViewerRole, "admin"> }) {
  const { announcements, isLoading, error } = useAnnouncements();
  const { state: academics } = useAcademics();
  const [target, setTarget] = useState<ParentTarget>("ALL");
  const backendAuthorized = Boolean(readStoredToken());
  const children = useMemo(() => parentChildrenFromAcademics(academics), [academics]);
  const classIds = useMemo(() => role === "parent" ? children.map((child) => child.classId) : [], [children, role]);
  const visible = useMemo(() => {
    // The API has already checked the signed-in user's audience and classes.
    // Local demo records still need client-side audience filtering.
    const rows = backendAuthorized ? announcements : getAnnouncementsForUser(announcements, role, classIds);
    if (role !== "parent" || target === "ALL") return rows;
    if (target === "PARENT") return rows.filter((item) => item.audiences.includes("EVERYONE") || item.audiences.includes("PARENTS"));
    const child = children.find((item) => item.id === target);
    if (!child) return rows;
    return rows.filter((item) => item.audiences.includes("EVERYONE") || (item.audiences.includes("SELECTED_CLASSES") && item.selectedClassIds.includes(child.classId)));
  }, [announcements, backendAuthorized, children, classIds, role, target]);
  const targetOptions = [
    { value: "ALL", label: "All family" },
    { value: "PARENT", label: "Parent account" },
    ...children.map((child) => ({ value: child.id, label: studentLabel(child) })),
  ];

  return <>
    <PageHeader title="Announcements" description="Published school updates relevant to you." />
    {role === "parent" && <Card className="mb-5 p-4"><Select label="Show announcements for" value={target} onChange={setTarget} options={targetOptions} /></Card>}
    {isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-xl bg-surface-muted" />)}</div> : error ? <p role="alert" className="text-danger">{error}</p> : visible.length ? <div className="space-y-4">{visible.map((item) => <AnnouncementCard key={item.id} announcement={item} />)}</div> : <EmptyState title="No announcements" description="New school updates for your audience will appear here." />}
  </>;
}
