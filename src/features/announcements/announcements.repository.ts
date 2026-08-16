import { apiRequest, readStoredToken } from "@/lib/api";
import { getStoredAnnouncements, resetStoredAnnouncements, saveStoredAnnouncements } from "./announcements.storage";
import type { Announcement, AnnouncementInput } from "./announcements.types";

export interface AnnouncementsRepository {
  getAll(): Promise<Announcement[]>;
  create(input: AnnouncementInput): Promise<Announcement>;
  update(id: string, input: Partial<AnnouncementInput>): Promise<Announcement>;
  remove(id: string): Promise<void>;
  setPublished(id: string, published: boolean): Promise<Announcement>;
  archive(id: string): Promise<Announcement>;
  reset(): Promise<Announcement[]>;
}

export class LocalAnnouncementsRepository implements AnnouncementsRepository {
  async getAll() { return getStoredAnnouncements(); }
  async create(input: AnnouncementInput) {
    const items = await this.getAll();
    const now = new Date().toISOString();
    const created: Announcement = { ...input, id: `ann-${Date.now()}`, schoolId: "school-001", createdAt: now, updatedAt: now };
    items.unshift(created); await saveStoredAnnouncements(items); return created;
  }
  async update(id: string, input: Partial<AnnouncementInput>) {
    const items = await this.getAll(); let updated: Announcement | undefined;
    const next = items.map((item) => item.id === id ? (updated = { ...item, ...input, updatedAt: new Date().toISOString() }) : item);
    if (!updated) throw new Error("Announcement not found."); await saveStoredAnnouncements(next); return updated;
  }
  async remove(id: string) { await saveStoredAnnouncements((await this.getAll()).filter((item) => item.id !== id)); }
  async setPublished(id: string, published: boolean) { return this.update(id, { status: published ? "PUBLISHED" : "DRAFT", publishAt: published ? new Date().toISOString().slice(0, 10) : undefined }); }
  async archive(id: string) { return this.update(id, { status: "ARCHIVED" }); }
  async reset() { return resetStoredAnnouncements(); }
}

type BackendAnnouncement = Partial<Announcement> & {
  body?: string;
  message?: string;
  selectedClasses?: string[];
};

type BackendAnnouncementResponse = BackendAnnouncement | {
  data?: BackendAnnouncement;
  item?: BackendAnnouncement;
  announcement?: BackendAnnouncement;
};

type BackendAnnouncementPayload = Partial<Pick<AnnouncementInput,
  "title" |
  "summary" |
  "content" |
  "audiences" |
  "selectedClassIds" |
  "status" |
  "isPinned" |
  "publishAt" |
  "expiresAt" |
  "attachmentName" |
  "ctaLabel" |
  "ctaUrl"
>>;

function unwrapList<T>(value: T[] | { data?: T[]; items?: T[]; results?: T[]; announcements?: T[] }) {
  return Array.isArray(value) ? value : value.data ?? value.items ?? value.results ?? value.announcements ?? [];
}

function unwrapAnnouncement(value: BackendAnnouncementResponse): BackendAnnouncement {
  const wrapped = value as {
    data?: BackendAnnouncement;
    item?: BackendAnnouncement;
    announcement?: BackendAnnouncement;
  };
  return wrapped.announcement ?? wrapped.data ?? wrapped.item ?? (value as BackendAnnouncement);
}

function optionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function announcementBody(input: Partial<AnnouncementInput>): BackendAnnouncementPayload {
  const audiences = input.audiences ?? [];
  return {
    title: optionalString(input.title),
    summary: optionalString(input.summary),
    content: optionalString(input.content),
    audiences,
    selectedClassIds: audiences.includes("SELECTED_CLASSES")
      ? input.selectedClassIds ?? []
      : [],
    status: input.status,
    isPinned: input.isPinned,
    publishAt: input.status === "PUBLISHED" ? optionalString(input.publishAt) : undefined,
    expiresAt: optionalString(input.expiresAt),
    attachmentName: optionalString(input.attachmentName),
    ctaLabel: optionalString(input.ctaLabel),
    ctaUrl: optionalString(input.ctaUrl),
  };
}

function mapAnnouncement(item: BackendAnnouncement): Announcement {
  const now = new Date().toISOString();
  return {
    id: item.id ?? `ann-${Date.now()}`,
    schoolId: item.schoolId ?? "school-001",
    title: item.title ?? "Untitled announcement",
    summary: item.summary ?? item.body ?? item.content ?? item.message ?? "",
    content: item.content ?? item.body ?? item.message ?? item.summary ?? "",
    body: item.body ?? item.content ?? item.message ?? item.summary,
    audiences: item.audiences ?? ["EVERYONE"],
    selectedClassIds: item.selectedClassIds ?? item.selectedClasses ?? [],
    status: item.status ?? "DRAFT",
    isPinned: item.isPinned ?? false,
    publishAt: item.publishAt,
    expiresAt: item.expiresAt,
    attachmentName: item.attachmentName,
    ctaLabel: item.ctaLabel,
    ctaUrl: item.ctaUrl,
    createdByUserId: item.createdByUserId ?? "",
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now,
  };
}

class BackendAnnouncementsRepository extends LocalAnnouncementsRepository {
  private hasSession() {
    return Boolean(readStoredToken());
  }

  async getAll() {
    if (!this.hasSession()) return super.getAll();
    const data = await apiRequest<BackendAnnouncement[] | { data?: BackendAnnouncement[]; items?: BackendAnnouncement[]; results?: BackendAnnouncement[]; announcements?: BackendAnnouncement[] }>("/announcements");
    return unwrapList(data).map(mapAnnouncement);
  }

  async create(input: AnnouncementInput) {
    if (!this.hasSession()) return super.create(input);
    return mapAnnouncement(unwrapAnnouncement(await apiRequest<BackendAnnouncementResponse>("/announcements", {
      method: "POST",
      body: JSON.stringify(announcementBody(input)),
    })));
  }

  async update(id: string, input: Partial<AnnouncementInput>) {
    if (!this.hasSession()) return super.update(id, input);
    if (input.status === "ARCHIVED") return this.archive(id);
    return mapAnnouncement(unwrapAnnouncement(await apiRequest<BackendAnnouncementResponse>(`/announcements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(announcementBody(input)),
    })));
  }

  async remove(id: string) {
    if (!this.hasSession()) return super.remove(id);
    await apiRequest<void>(`/announcements/${id}`, { method: "DELETE" });
  }

  async setPublished(id: string, published: boolean) {
    if (!this.hasSession()) return super.setPublished(id, published);
    if (published) return mapAnnouncement(unwrapAnnouncement(await apiRequest<BackendAnnouncementResponse>(`/announcements/${id}/publish`, { method: "POST" })));
    return this.update(id, { status: "DRAFT", publishAt: undefined });
  }

  async archive(id: string) {
    if (!this.hasSession()) return super.archive(id);
    return mapAnnouncement(unwrapAnnouncement(await apiRequest<BackendAnnouncementResponse>(`/announcements/${id}/archive`, { method: "POST" })));
  }
}

export const announcementsRepository: AnnouncementsRepository = new BackendAnnouncementsRepository();
