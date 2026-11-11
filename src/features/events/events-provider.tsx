"use client";
/* eslint-disable react-hooks/set-state-in-effect -- repository hydration resolves asynchronously and focus/auth events reuse the same refresh path. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AUTH_SESSION_EVENT, readStoredToken } from "@/lib/api";
import * as storage from "./events.storage";
import { EventsContext } from "./events-context";
import type { SchoolEvent, SchoolEventInput } from "./events.types";
import { useAcademicPeriodScope } from "@/features/academic-period/academic-period-context";
import { filterEventsByPeriod } from "./events-period-utils";

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const period = useAcademicPeriodScope();
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    try {
      const items = await storage.getEvents(period);
      if (version !== refreshVersion.current) return;
      setEvents(items);
      setError(undefined);
    } catch {
      if (version === refreshVersion.current) setError("Events could not be loaded.");
    } finally {
      if (version === refreshVersion.current) setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void refresh();
    const sessionChanged = () => {
      setEvents([]);
      setIsLoading(true);
      void refresh();
    };
    const sync = (event: StorageEvent) => {
      if (event.key === "accessToken" || event.key === "user") sessionChanged();
      else if (event.key === storage.EVENTS_STORAGE_KEY) void refresh();
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

  const createEvent = useCallback(async (input: SchoolEventInput) => {
    await storage.createEvent({ ...input, academicSessionId: period.academicSessionId, termId: period.termId });
    await refresh();
  }, [period.academicSessionId, period.termId, refresh]);
  const updateEvent = useCallback(async (id: string, input: Partial<SchoolEventInput>) => {
    await storage.updateEvent(id, input);
    await refresh();
  }, [refresh]);
  const deleteEvent = useCallback(async (id: string) => {
    await storage.deleteEvent(id);
    await refresh();
  }, [refresh]);
  const publishEvent = useCallback(async (id: string, published: boolean) => {
    await storage.publishEvent(id, published);
    await refresh();
  }, [refresh]);
  const scopedEvents = useMemo(
    () => filterEventsByPeriod(events, period, Boolean(readStoredToken())),
    [events, period],
  );
  const value = useMemo(
    () => ({ events: scopedEvents, isLoading, error, createEvent, updateEvent, deleteEvent, publishEvent, refresh }),
    [scopedEvents, isLoading, error, createEvent, updateEvent, deleteEvent, publishEvent, refresh],
  );
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}
