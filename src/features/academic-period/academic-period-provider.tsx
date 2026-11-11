"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AUTH_SESSION_EVENT } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { AcademicPeriodContext } from "./academic-period-context";
import { academicPeriodRepository, isUuid } from "./academic-period.repository";
import { academicTermLabel, academicTermNameFromLabel, type AcademicSessionRecord, type HistoricalSessionInput, type UpsertAcademicTermInput } from "./academic-period.types";

const selectionKey = () => {
  const user = readStoredUser();
  return `studii.academic-period.${user?.schoolId ?? "school"}.${user?.id ?? user?.email ?? "user"}`;
};

function savedSelection() {
  try { return JSON.parse(localStorage.getItem(selectionKey()) ?? "{}") as { sessionId?: string; termId?: string }; }
  catch { return {}; }
}

export function AcademicPeriodProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSchoolSettings();
  const [sessions, setSessions] = useState<AcademicSessionRecord[]>([]);
  const [sessionId, setSessionIdState] = useState("");
  const [termId, setTermIdState] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const currentTermName = academicTermNameFromLabel(settings.currentTerm);

  const normalizeActivePeriod = useCallback(
    (items: AcademicSessionRecord[]) => {
      if (!settings.currentAcademicSession) return items;
      const currentSessionName = settings.currentAcademicSession.trim().toLowerCase();
      return items.map((session) => {
        const isCurrentSession = session.name.trim().toLowerCase() === currentSessionName;
        return {
          ...session,
          status: isCurrentSession ? "ACTIVE" : session.status === "ACTIVE" ? "CLOSED" : session.status,
          terms: session.terms.map((term) => ({
            ...term,
            status: isCurrentSession && term.name === currentTermName
              ? "ACTIVE"
              : term.status === "ACTIVE" ? "CLOSED" : term.status,
          })),
        };
      });
    },
    [currentTermName, settings.currentAcademicSession],
  );

  const selectCurrentPeriod = useCallback(
    (items: AcademicSessionRecord[]) => {
      const session = items.find(
        (item) => item.name.trim().toLowerCase() === settings.currentAcademicSession.trim().toLowerCase(),
      );
      const term = session?.terms.find((item) => item.name === currentTermName);
      if (!session || !term) return false;
      setSessionIdState(session.id);
      setTermIdState(term.id);
      persist(session.id, term.id);
      return true;
    },
    [currentTermName, settings.currentAcademicSession],
  );

  const selectDefaults = useCallback((items: AcademicSessionRecord[]) => {
    const saved = savedSelection();
    const session = items.find((item) => item.id === saved.sessionId)
      ?? items.find((item) => item.status === "ACTIVE")
      ?? items[0];
    const orderedTerms = [...(session?.terms ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const term = orderedTerms.find((item) => item.id === saved.termId)
      ?? orderedTerms.find((item) => item.status === "ACTIVE")
      ?? orderedTerms.at(-1);
    setSessionIdState(session?.id ?? "");
    setTermIdState(term?.id ?? "");
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const items = normalizeActivePeriod(await academicPeriodRepository.listSessions());
      setSessions(items);
      selectDefaults(items);
    } catch (caught) {
      setSessions([]);
      setSessionIdState("");
      setTermIdState("");
      setError(caught instanceof Error ? caught.message : "Academic periods could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [normalizeActivePeriod, selectDefaults]);

  useEffect(() => {
    let active = true;
    void academicPeriodRepository.listSessions()
      .then((items) => {
        if (!active) return;
        const normalized = normalizeActivePeriod(items);
        setSessions(normalized);
        selectDefaults(normalized);
        setError("");
      })
      .catch((caught) => { if (active) { setSessions([]); setError(caught instanceof Error ? caught.message : "Academic periods could not be loaded."); } })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [normalizeActivePeriod, selectDefaults]);
  useEffect(() => {
    const reload = () => void refresh();
    window.addEventListener(AUTH_SESSION_EVENT, reload);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, reload);
  }, [refresh]);

  const selectedSession = sessions.find((item) => item.id === sessionId);
  const terms = useMemo(() => [...(selectedSession?.terms ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate)), [selectedSession]);
  const selectedTerm = terms.find((item) => item.id === termId);
  const scope = useMemo(() => ({
    key: `${selectedSession?.id ?? "no-session"}:${selectedTerm?.id ?? "no-term"}`,
    schoolId: settings.id,
    academicSessionId: selectedSession?.id ?? "",
    sessionId: selectedSession?.id ?? "",
    termId: selectedTerm?.id ?? "",
    academicSession: selectedSession?.name,
    term: selectedTerm ? academicTermLabel(selectedTerm.name) : undefined,
    startDate: selectedTerm?.startDate,
    endDate: selectedTerm?.endDate,
    requireStartDate: Boolean(selectedTerm),
    isReady: !isLoading && Boolean(selectedSession && selectedTerm),
    hasBackendIds: isUuid(selectedSession?.id) && isUuid(selectedTerm?.id),
    isCurrentPeriod: selectedSession?.status === "ACTIVE" && selectedTerm?.status === "ACTIVE",
  }), [isLoading, selectedSession, selectedTerm, settings.id]);

  const persist = (nextSessionId: string, nextTermId: string) => {
    localStorage.setItem(selectionKey(), JSON.stringify({ sessionId: nextSessionId, termId: nextTermId }));
  };
  const setSessionId = (value: string) => {
    const session = sessions.find((item) => item.id === value);
    const ordered = [...(session?.terms ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const nextTerm = ordered.find((item) => item.status === "ACTIVE") ?? ordered.at(-1);
    setSessionIdState(value);
    setTermIdState(nextTerm?.id ?? "");
    persist(value, nextTerm?.id ?? "");
  };
  const setTermId = (value: string) => {
    if (!terms.some((item) => item.id === value)) return;
    setTermIdState(value);
    persist(sessionId, value);
  };
  const importHistory = async (input: HistoricalSessionInput[]) => {
    const result = await academicPeriodRepository.importHistory(input);
    await refresh();
    return result;
  };
  const upsertTerm = async (input: UpsertAcademicTermInput) => {
    const result = await academicPeriodRepository.upsertTerm(input);
    const items = normalizeActivePeriod(await academicPeriodRepository.listSessions());
    setSessions(items);
    if (!selectCurrentPeriod(items)) {
      setSessionIdState(result.session.id);
      setTermIdState(result.term.id);
      persist(result.session.id, result.term.id);
    }
    return result;
  };
  const markTermEnded = async (nextSessionId: string, nextTermId: string, endDate: string) => {
    await academicPeriodRepository.markTermEnded(nextSessionId, nextTermId, endDate);
    const items = normalizeActivePeriod(await academicPeriodRepository.listSessions());
    setSessions(items);
    persist(nextSessionId, nextTermId);
  };

  const value = { sessions, terms, sessionId, termId, selectedSession, selectedTerm, scope, setSessionId, setTermId, refresh, importHistory, upsertTerm, markTermEnded, isLoading, error };
  return <AcademicPeriodContext.Provider value={value}>{children}</AcademicPeriodContext.Provider>;
}
