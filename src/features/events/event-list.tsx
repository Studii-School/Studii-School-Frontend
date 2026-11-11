"use client";

import { Edit3, Trash2 } from "lucide-react";
import { AudienceQuickEdit } from "@/components/shared/audience-picker";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EventCard } from "./event-card";
import { eventAudienceOptions } from "./events-audience";
import type { EventAudience, SchoolEvent } from "./events.types";

export function EventList({ events, classOptions, busyId, onEdit, onDelete, onPublish, onAudience }: {
  events: SchoolEvent[];
  classOptions: { value: string; label: string }[];
  busyId: string;
  onEdit: (event: SchoolEvent) => void;
  onDelete: (id: string) => void;
  onPublish: (event: SchoolEvent) => Promise<void>;
  onAudience: (event: SchoolEvent, audience: EventAudience[], classIds: string[]) => Promise<void>;
}) {
  if (!events.length) return <p className="p-10 text-center text-sm text-muted">No events match these filters.</p>;
  return (
    <div className="grid gap-3 p-4 lg:grid-cols-2">
      {events.map((event) => (
        <EventCard key={event.id} event={event} actions={
          <div className="flex flex-wrap items-center gap-2">
            <AudienceQuickEdit label={`Audience for ${event.title}`} options={eventAudienceOptions} everyone="Everyone" classesValue="Selected Classes" values={event.audience} selectedClasses={event.selectedClasses ?? []} classOptions={classOptions} disabled={busyId === event.id} onSave={(values, classIds) => onAudience(event, values, classIds)} />
            <span className="flex items-center gap-2 rounded-lg border bg-surface-muted/40 px-3 py-2 text-xs font-medium"><span>{event.isPublished ? "Published" : "Draft"}</span><Switch checked={event.isPublished} disabled={busyId === event.id} onCheckedChange={() => void onPublish(event)} label={`${event.isPublished ? "Unpublish" : "Publish"} ${event.title}`} /></span>
            <Button variant="outline" aria-label={`Edit ${event.title}`} onClick={() => onEdit(event)} className="px-3"><Edit3 size={15} /></Button>
            <Button variant="outline" aria-label={`Delete ${event.title}`} onClick={() => onDelete(event.id)} className="px-3"><Trash2 size={15} /></Button>
          </div>
        } />
      ))}
    </div>
  );
}
