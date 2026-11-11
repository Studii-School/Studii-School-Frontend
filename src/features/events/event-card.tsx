"use client";

import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatEventDate, formatEventTime } from "@/lib/date-utils";
import type { SchoolEvent } from "./events.types";

const fallbackColor = "#075985";
const hexColor = (value?: string) => /^#[0-9a-f]{6}$/i.test(value ?? "") ? value : fallbackColor;

export function EventCard({ event, actions, compact = false }: { event: SchoolEvent; actions?: React.ReactNode; compact?: boolean }) {
  const color = hexColor(event.color);
  return (
    <article className="rounded-xl border bg-surface shadow-sm" style={{ borderLeft: `5px solid ${color}` }}>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: color }} />
              <Badge tone="primary">{event.category}</Badge>
              {!event.isPublished && <Badge tone="neutral">Draft</Badge>}
            </div>
            <h3 className="mt-2 font-semibold">{event.title}</h3>
            {!compact && <p className="mt-1 text-sm leading-6 text-muted">{event.shortDescription}</p>}
          </div>
          {actions}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{formatEventDate(event.startDate)}</span>
          {event.startTime && <span className="inline-flex items-center gap-1.5"><Clock size={14} />{formatEventTime(event.startTime)}</span>}
          {event.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{event.location}</span>}
        </div>
        {!compact && <div className="mt-3 flex flex-wrap gap-1.5">{event.audience.map((audience) => <Badge key={audience}>{audience}</Badge>)}</div>}
      </div>
    </article>
  );
}
