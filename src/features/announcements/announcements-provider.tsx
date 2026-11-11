"use client";
/* eslint-disable react-hooks/set-state-in-effect -- repository hydration resolves asynchronously and storage events reuse the same refresh path. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AUTH_SESSION_EVENT } from "@/lib/api";
import { announcementsRepository } from "./announcements.repository";
import { ANNOUNCEMENTS_STORAGE_KEY } from "./announcements.storage";
import { AnnouncementsContext } from "./announcements-context";
import { useAcademicPeriodScope } from "@/features/academic-period/academic-period-context";
import { filterAnnouncementsByPeriod } from "./announcements-period-utils";
import type { Announcement, AnnouncementInput } from "./announcements.types";

export function AnnouncementsProvider({ children }: { children: React.ReactNode }) {
  const period = useAcademicPeriodScope();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]); const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState<string>();
  const refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    try {
      const items = await announcementsRepository.getAll();
      if (version !== refreshVersion.current) return;
      setAnnouncements(items);
      setError(undefined);
    } catch {
      if (version === refreshVersion.current) setError("Announcements could not be loaded.");
    } finally {
      if (version === refreshVersion.current) setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const sessionChanged = () => {
      setAnnouncements([]);
      setIsLoading(true);
      void refresh();
    };
    const sync = (event: StorageEvent) => {
      if (event.key === "accessToken" || event.key === "user") sessionChanged();
      else if (event.key === ANNOUNCEMENTS_STORAGE_KEY) void refresh();
    };
    const revalidate = () => void refresh();
    const revalidateWhenVisible = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_SESSION_EVENT, sessionChanged);
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidateWhenVisible);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_SESSION_EVENT, sessionChanged);
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidateWhenVisible);
    };
  }, [refresh]);
  const createAnnouncement = useCallback(async (input: AnnouncementInput) => { await announcementsRepository.create({ ...input, academicSessionId: period.academicSessionId, sessionId: period.academicSessionId, termId: period.termId }); await refresh(); }, [period.academicSessionId, period.termId, refresh]);
  const updateAnnouncement = useCallback(async (id: string, input: Partial<AnnouncementInput>) => { await announcementsRepository.update(id, input); await refresh(); }, [refresh]);
  const deleteAnnouncement = useCallback(async (id: string) => { await announcementsRepository.remove(id); await refresh(); }, [refresh]);
  const setPublished = useCallback(async (id: string, published: boolean) => { await announcementsRepository.setPublished(id, published); await refresh(); }, [refresh]);
  const scopedAnnouncements = useMemo(() => filterAnnouncementsByPeriod(announcements, period), [announcements, period]);
  const value = useMemo(() => ({ announcements: scopedAnnouncements, isLoading, error, createAnnouncement, updateAnnouncement, deleteAnnouncement, setPublished, refresh }), [scopedAnnouncements, isLoading, error, createAnnouncement, updateAnnouncement, deleteAnnouncement, setPublished, refresh]);
  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
}
