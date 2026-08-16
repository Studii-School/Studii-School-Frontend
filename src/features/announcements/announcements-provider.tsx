"use client";
/* eslint-disable react-hooks/set-state-in-effect -- repository hydration resolves asynchronously and storage events reuse the same refresh path. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { announcementsRepository } from "./announcements.repository";
import { ANNOUNCEMENTS_STORAGE_KEY } from "./announcements.storage";
import { AnnouncementsContext } from "./announcements-context";
import type { Announcement, AnnouncementInput } from "./announcements.types";

export function AnnouncementsProvider({ children }: { children: React.ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState<string>();
  const refresh = useCallback(async () => { try { setAnnouncements(await announcementsRepository.getAll()); setError(undefined); } catch { setError("Announcements could not be loaded."); } finally { setIsLoading(false); } }, []);
  useEffect(() => { void refresh(); const sync = (event: StorageEvent) => { if (event.key === ANNOUNCEMENTS_STORAGE_KEY) void refresh(); }; window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, [refresh]);
  const createAnnouncement = useCallback(async (input: AnnouncementInput) => { await announcementsRepository.create(input); await refresh(); }, [refresh]);
  const updateAnnouncement = useCallback(async (id: string, input: Partial<AnnouncementInput>) => { await announcementsRepository.update(id, input); await refresh(); }, [refresh]);
  const deleteAnnouncement = useCallback(async (id: string) => { await announcementsRepository.remove(id); await refresh(); }, [refresh]);
  const setPublished = useCallback(async (id: string, published: boolean) => { await announcementsRepository.setPublished(id, published); await refresh(); }, [refresh]);
  const value = useMemo(() => ({ announcements, isLoading, error, createAnnouncement, updateAnnouncement, deleteAnnouncement, setPublished, refresh }), [announcements, isLoading, error, createAnnouncement, updateAnnouncement, deleteAnnouncement, setPublished, refresh]);
  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
}
