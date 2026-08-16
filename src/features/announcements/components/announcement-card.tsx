"use client";

import { CalendarClock, Link2, Paperclip, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAcademics } from "@/features/academics/academics-context";
import type { Announcement } from "../announcements.types";
import { AnnouncementStatusBadge } from "./announcement-status-badge";

const audienceLabel: Record<Announcement["audiences"][number], string> = { EVERYONE: "Everyone", STUDENTS: "Students", TEACHERS: "Teachers", PARENTS: "Parents", STAFF: "Staff", SELECTED_CLASSES: "Selected classes" };

function formatAnnouncementDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function AnnouncementCard({ announcement, adminActions }: { announcement: Announcement; adminActions?: React.ReactNode }) {
  const {state}=useAcademics();const classNameFor=(id:string)=>state.classes.find((item)=>item.id===id)?.displayName??id;
  return <article className="rounded-xl border bg-surface p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{announcement.isPinned && <Pin size={15} className="text-[var(--school-primary)]" aria-label="Pinned"/>}<h2 className="font-semibold">{announcement.title}</h2><AnnouncementStatusBadge status={announcement.status}/></div><p className="mt-1 text-sm text-muted">{announcement.summary}</p></div>{adminActions}</div><p className="mt-4 whitespace-pre-wrap text-sm leading-6">{announcement.content}</p><div className="mt-4 flex flex-wrap gap-2">{announcement.audiences.map((item)=><Badge key={item}>{audienceLabel[item]}</Badge>)}{announcement.selectedClassIds.map((id)=><Badge key={id} tone="primary">{classNameFor(id)}</Badge>)}</div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted">{announcement.publishAt&&<span className="inline-flex items-center gap-1"><CalendarClock size={13}/>Published {formatAnnouncementDate(announcement.publishAt)}</span>}{announcement.expiresAt&&<span>Expires {formatAnnouncementDate(announcement.expiresAt)}</span>}{announcement.attachmentName&&<span className="inline-flex items-center gap-1"><Paperclip size={13}/>{announcement.attachmentName}</span>}{announcement.ctaLabel&&announcement.ctaUrl&&<a className="inline-flex items-center gap-1 font-semibold text-[var(--school-primary)]" href={announcement.ctaUrl}><Link2 size={13}/>{announcement.ctaLabel}</a>}</div></article>;
}
