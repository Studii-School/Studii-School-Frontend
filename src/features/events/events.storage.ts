import { apiRequest, readStoredToken } from "@/lib/api";
import { readStoredJson, writeStoredJson } from "@/lib/storage";
import { isUpcomingDate } from "@/lib/date-utils";
import { fromBackendEventAudience, toBackendEventAudience, type BackendEventAudience } from "./events-audience";
import type { PortalAudience, SchoolEvent, SchoolEventInput } from "./events.types";
export const EVENTS_STORAGE_KEY = "schoolos.events.v1";
const STORAGE_KEY = EVENTS_STORAGE_KEY;
const load = () => readStoredJson<SchoolEvent[]>(STORAGE_KEY, []);
const store = (events: SchoolEvent[]) => { writeStoredJson(STORAGE_KEY, events); return events; };
const hasSession = () => Boolean(readStoredToken());
type BackendEvent = Partial<Omit<SchoolEvent, "audience">> & { sessionId?: string; selectedClassIds?: string[]; audience?: BackendEventAudience[]; audiences?: BackendEventAudience[] };
type BackendEventResponse = BackendEvent | { data?: BackendEvent; item?: BackendEvent; event?: BackendEvent };
type BackendEventPayload = Partial<Omit<Pick<SchoolEventInput, "title" | "shortDescription" | "description" | "category" | "startDate" | "startTime" | "endDate" | "endTime" | "location" | "audience" | "selectedClasses" | "color" | "termId" | "isFeatured" | "isPublished">, "audience">> & { sessionId?: string; audience?: BackendEventAudience[] };
function unwrapList<T>(value: T[] | { data?: T[]; items?: T[]; results?: T[]; events?: T[] }) { return Array.isArray(value) ? value : value.data ?? value.items ?? value.results ?? value.events ?? []; }
function unwrapEvent(value: BackendEventResponse): BackendEvent { const wrapped = value as { data?: BackendEvent; item?: BackendEvent; event?: BackendEvent }; return wrapped.event ?? wrapped.data ?? wrapped.item ?? value as BackendEvent; }
function optionalString(value?: string) { const trimmed = value?.trim(); return trimmed ? trimmed : undefined; }
function mapEvent(item: BackendEvent): SchoolEvent {
  const now = new Date().toISOString();
  return {
    id: item.id ?? `evt-${Date.now()}`,
    schoolId: item.schoolId ?? "school-001",
    title: item.title ?? "Untitled event",
    shortDescription: item.shortDescription ?? item.description ?? "",
    description: item.description,
    category: item.category ?? "General",
    startDate: item.startDate?.slice(0, 10) ?? now.slice(0, 10),
    startTime: item.startTime,
    endDate: item.endDate?.slice(0, 10),
    endTime: item.endTime,
    location: item.location,
    audience: fromBackendEventAudience(item.audience ?? item.audiences ?? ["Everyone"]),
    selectedClasses: item.selectedClasses ?? item.selectedClassIds ?? [],
    color: item.color,
    academicSessionId: item.academicSessionId ?? item.sessionId,
    termId: item.termId,
    isFeatured: item.isFeatured ?? false,
    isPublished: item.isPublished ?? false,
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  };
}
function eventBody(input: Partial<SchoolEventInput>): BackendEventPayload {
  const body: BackendEventPayload = {
    title: optionalString(input.title),
    shortDescription: optionalString(input.shortDescription),
    description: optionalString(input.description) ?? optionalString(input.shortDescription),
    category: input.category,
    startDate: optionalString(input.startDate),
    startTime: optionalString(input.startTime),
    endDate: optionalString(input.endDate),
    endTime: optionalString(input.endTime),
    location: optionalString(input.location),
    color: optionalString(input.color),
    sessionId: optionalString(input.academicSessionId),
    termId: optionalString(input.termId),
    isFeatured: input.isFeatured,
    isPublished: input.isPublished,
  };
  if (input.audience) {
    body.audience = toBackendEventAudience(input.audience);
    body.selectedClasses = input.audience.includes("Selected Classes") ? input.selectedClasses ?? [] : [];
  } else if (input.selectedClasses) {
    body.selectedClasses = input.selectedClasses;
  }
  return body;
}
export async function getEvents(context?: { academicSessionId?: string; termId?: string }): Promise<SchoolEvent[]> {
  if (!hasSession()) return load();
  const query = context?.academicSessionId && context.termId
    ? `?sessionId=${encodeURIComponent(context.academicSessionId)}&termId=${encodeURIComponent(context.termId)}`
    : "";
  const data = await apiRequest<BackendEvent[] | { data?: BackendEvent[]; items?: BackendEvent[]; results?: BackendEvent[]; events?: BackendEvent[] }>(`/events${query}`);
  return unwrapList(data).map(mapEvent);
}
export async function createEvent(input: SchoolEventInput): Promise<SchoolEvent> {
  if (hasSession()) return mapEvent(unwrapEvent(await apiRequest<BackendEventResponse>("/events", { method: "POST", body: JSON.stringify(eventBody(input)) })));
  const now = new Date().toISOString(); const event: SchoolEvent = { ...input, id: globalThis.crypto?.randomUUID?.() ?? `evt-${Date.now()}`, schoolId:"greenfield-college", createdAt:now, updatedAt:now }; store([...load(), event]); return event;
}
export async function updateEvent(id: string, updates: Partial<SchoolEventInput>): Promise<SchoolEvent | undefined> {
  if (hasSession()) return mapEvent(unwrapEvent(await apiRequest<BackendEventResponse>(`/events/${id}`, { method: "PATCH", body: JSON.stringify(eventBody(updates)) })));
  let changed: SchoolEvent | undefined; store(load().map((event) => event.id === id ? (changed = { ...event, ...updates, updatedAt:new Date().toISOString() }) : event)); return changed;
}
export async function deleteEvent(id: string): Promise<void> {
  if (hasSession()) { await apiRequest<void>(`/events/${id}`, { method: "DELETE" }); return; }
  store(load().filter((event) => event.id !== id));
}
export async function publishEvent(id: string, isPublished: boolean): Promise<SchoolEvent | undefined> { return updateEvent(id, { isPublished }); }
export function filterEventsForAudience(events: SchoolEvent[], role: PortalAudience, selectedClass?: string | string[]): SchoolEvent[] { if (role === "admin") return events; const selectedClasses = Array.isArray(selectedClass) ? selectedClass : selectedClass ? [selectedClass] : []; const allowed = role === "teacher" ? ["Everyone","Teachers","Staff"] : role === "student" ? ["Everyone","Students"] : ["Everyone","Parents"]; return events.filter((event) => event.isPublished && (event.audience.some((audience) => allowed.includes(audience)) || (event.audience.includes("Selected Classes") && selectedClasses.some((classId) => event.selectedClasses?.includes(classId))))); }
export async function getUpcomingEvents(): Promise<SchoolEvent[]> { return (await getEvents()).filter((event) => event.isPublished && isUpcomingDate(event.startDate, event.endDate)).sort((a,b) => a.startDate.localeCompare(b.startDate)); }
export async function getEventsForAudience(role: PortalAudience, selectedClass?: string | string[]): Promise<SchoolEvent[]> { return filterEventsForAudience(await getEvents(), role, selectedClass); }
export async function getCalendarEvents(startDate: string, endDate: string): Promise<SchoolEvent[]> {
  if (!hasSession()) return (await getEvents()).filter((event) => event.startDate >= startDate && event.startDate <= endDate);
  const query = new URLSearchParams({ startDate, endDate });
  const data = await apiRequest<BackendEvent[] | { data?: BackendEvent[]; items?: BackendEvent[]; results?: BackendEvent[]; events?: BackendEvent[] }>(`/calendar/events?${query.toString()}`);
  return unwrapList(data).map(mapEvent);
}
