"use client";

import Link from "@/features/navigation-progress/navigation-progress-link";
import { ArrowRight, CalendarX2 } from "lucide-react";
import { isUpcomingDate } from "@/lib/date-utils";
import { readStoredToken } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
import { useAcademics } from "@/features/academics/academics-context";
import { parentChildrenFromAcademics } from "@/features/parents/parent-child-utils";
import { filterEventsForAudience } from "./events.storage";
import { useEvents } from "./events-context";
import type { PortalAudience } from "./events.types";
import { EventCard } from "./event-card";

export function UpcomingEvents({ role, compact = false, selectedClass, parentTarget = "ALL", limit = 5 }: {
  role: PortalAudience;
  compact?: boolean;
  selectedClass?: string;
  parentTarget?: "ALL" | "PARENT" | string;
  limit?: number;
}) {
  const { events, isLoading, error } = useEvents();
  const { state } = useAcademics();
  const children = parentChildrenFromAcademics(state);
  const user = readStoredUser();
  const requestedClass = state.classes.find((item) => item.id === selectedClass || item.displayName === selectedClass || item.baseName === selectedClass)?.id;
  const classes = requestedClass
    ? [requestedClass]
    : role === "student"
      ? [user?.currentClassId || user?.classId || state.students.find((item) => item.userId === user?.id)?.classId].filter((id): id is string => Boolean(id))
      : role === "parent"
        ? children.map((child) => child.classId)
        : role === "teacher"
          ? user?.assignedClassIds ?? []
          : [];

  // The authenticated API already applies audience and class permissions.
  // The provider has already selected the academic term.
  const authorized = Boolean(readStoredToken());
  const audienceEvents = authorized ? events.filter((item) => item.isPublished) : filterEventsForAudience(events, role, classes);
  const targetEvents = role === "parent" && parentTarget === "PARENT"
    ? audienceEvents.filter((event) => event.audience.includes("Everyone") || event.audience.includes("Parents"))
    : role === "parent" && parentTarget !== "ALL"
      ? audienceEvents.filter((event) => {
        const child = children.find((item) => item.id === parentTarget);
        return event.audience.includes("Everyone") || Boolean(child && event.audience.includes("Selected Classes") && event.selectedClasses?.includes(child.classId));
      })
      : audienceEvents;
  const visible = targetEvents.filter((event) => isUpcomingDate(event.startDate, event.endDate)).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const shown = compact ? visible.slice(0, limit) : visible;
  const href = role === "admin" ? "/admin/events" : `/${role}/events`;

  if (isLoading) return <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-surface-muted" />)}</div>;
  if (error) return <p role="alert" className="p-5 text-sm text-danger">{error}</p>;
  if (!shown.length) return <div className="flex flex-col items-center p-8 text-center"><CalendarX2 className="text-muted" size={24} /><p className="mt-3 text-sm font-semibold">No upcoming events</p><p className="mt-1 text-xs text-muted">Published events for this audience will appear here.</p></div>;
  return <div><div className="space-y-3 p-4">{shown.map((event) => <EventCard key={event.id} event={event} compact={compact} />)}</div>{compact && <div className="border-t p-4"><Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--school-primary)]">View all events <ArrowRight size={15} /></Link></div>}</div>;
}
