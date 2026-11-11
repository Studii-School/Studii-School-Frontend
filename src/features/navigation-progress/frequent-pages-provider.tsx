"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/types";
import { mostVisitedPages, pageVisitsKey, readPageVisits, recordPageVisit, visitedNavigationPage } from "./frequent-pages";

const VISITS_CHANGED = "schoolos:page-visits-changed";
const memoryVisits = new Map<string, string>();
const FrequentPagesContext = createContext<NavigationItem[]>([]);
const serverSnapshot = () => "{}";

function snapshot(key: string | null) {
  if (!key) return "{}";
  if (memoryVisits.has(key)) return memoryVisits.get(key)!;
  try {
    return window.localStorage.getItem(key) ?? memoryVisits.get(key) ?? "{}";
  } catch {
    return memoryVisits.get(key) ?? "{}";
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memoryVisits.delete(event.key);
    else memoryVisits.clear();
    onChange();
  };
  window.addEventListener(VISITS_CHANGED, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(VISITS_CHANGED, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function FrequentPagesProvider({ children, userId, schoolId, role, navigation }: {
  children: React.ReactNode;
  userId?: string;
  schoolId: string;
  role: string;
  navigation: NavigationItem[];
}) {
  const pathname = usePathname();
  const key = userId ? pageVisitsKey(schoolId, userId, role) : null;
  const getSnapshot = useCallback(() => snapshot(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const lastVisit = useRef<string | null>(null);

  useEffect(() => {
    const page = visitedNavigationPage(pathname, navigation);
    // Detail pages and filters belong to their module; rerenders do not add visits.
    const visit = JSON.stringify([key, page?.href ?? pathname]);
    if (lastVisit.current === visit) return;
    lastVisit.current = visit;
    if (!key || !page) return;
    const next = JSON.stringify(recordPageVisit(readPageVisits(snapshot(key)), page.href, Date.now()));
    try {
      window.localStorage.setItem(key, next);
      memoryVisits.delete(key);
    } catch {
      // Keep shortcuts working for this session when browser storage is blocked.
      memoryVisits.set(key, next);
    }
    window.dispatchEvent(new Event(VISITS_CHANGED));
  }, [key, navigation, pathname]);

  const pages = useMemo(() => mostVisitedPages(readPageVisits(raw), navigation), [navigation, raw]);
  return <FrequentPagesContext.Provider value={pages}>{children}</FrequentPagesContext.Provider>;
}

export function useFrequentPages() {
  return useContext(FrequentPagesContext);
}
