"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { NavigationProgressBar } from "./navigation-progress-bar";
import { NavigationProgressContext } from "./navigation-progress-context";
import { useNavigationProgress } from "./use-navigation-progress";
import { recordAppHistory } from "./app-history";

const INITIAL_PROGRESS = 10;
const MAX_WAITING_PROGRESS = 90;
const FAILSAFE_DELAY = 12_000;

function NavigationCompletionListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const { complete } = useNavigationProgress();

  useEffect(() => {
    recordAppHistory(search ? `${pathname}?${search}` : pathname);
    complete();
  }, [pathname, search, complete]);

  return null;
}

export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgressState] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const activeRef = useRef(false);
  const incrementRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quickStartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRunningTimers = useCallback(() => {
    if (incrementRef.current) clearInterval(incrementRef.current);
    if (quickStartRef.current) clearTimeout(quickStartRef.current);
    if (failsafeRef.current) clearTimeout(failsafeRef.current);
    incrementRef.current = null;
    quickStartRef.current = null;
    failsafeRef.current = null;
  }, []);

  const clearCompletionTimers = useCallback(() => {
    if (fadeRef.current) clearTimeout(fadeRef.current);
    if (resetRef.current) clearTimeout(resetRef.current);
    fadeRef.current = null;
    resetRef.current = null;
  }, []);

  const complete = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearRunningTimers();
    clearCompletionTimers();
    setProgressState(100);

    fadeRef.current = setTimeout(() => setIsVisible(false), 180);
    resetRef.current = setTimeout(() => {
      setProgressState(0);
      setIsLoading(false);
    }, 380);
  }, [clearCompletionTimers, clearRunningTimers]);

  const start = useCallback(() => {
    clearRunningTimers();
    clearCompletionTimers();
    activeRef.current = true;
    setIsLoading(true);
    setIsVisible(true);
    setProgressState((current) => Math.max(current > 0 && current < 100 ? current : 0, INITIAL_PROGRESS));
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    quickStartRef.current = setTimeout(() => {
      setProgressState((current) => Math.max(current, prefersReducedMotion ? 60 : 35));
    }, 120);

    if (!prefersReducedMotion) {
      incrementRef.current = setInterval(() => {
        setProgressState((current) => {
          if (current >= MAX_WAITING_PROGRESS) return MAX_WAITING_PROGRESS;
          return Math.min(MAX_WAITING_PROGRESS, current + Math.max(1, (MAX_WAITING_PROGRESS - current) * 0.08));
        });
      }, 240);
    }

    failsafeRef.current = setTimeout(complete, FAILSAFE_DELAY);
  }, [clearCompletionTimers, clearRunningTimers, complete]);

  const setProgress = useCallback((value: number) => {
    setProgressState(Math.max(0, Math.min(100, value)));
  }, []);

  useEffect(() => () => {
    clearRunningTimers();
    clearCompletionTimers();
  }, [clearCompletionTimers, clearRunningTimers]);

  const value = useMemo(
    () => ({ start, complete, setProgress, isLoading, isVisible, progress }),
    [start, complete, setProgress, isLoading, isVisible, progress],
  );

  return (
    <NavigationProgressContext.Provider value={value}>
      <NavigationProgressBar />
      <Suspense fallback={null}>
        <NavigationCompletionListener />
      </Suspense>
      {children}
    </NavigationProgressContext.Provider>
  );
}
