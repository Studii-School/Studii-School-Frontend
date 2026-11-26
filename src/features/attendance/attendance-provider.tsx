"use client";
/* eslint-disable react-hooks/set-state-in-effect -- repository hydration resolves asynchronously and storage events reuse the same refresh path. */
import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import { attendanceRepository } from "./attendance.repository";
import { ATTENDANCE_STORAGE_KEY } from "./attendance.storage";
import { AttendanceContext } from "./attendance-context";
import type { AdminAttendanceEntryInput,AttendanceRegister,SaveAttendanceInput } from "./attendance.types";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { filterAttendanceByPeriod, filterAttendanceBySession } from "./attendance.utils";
export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const { scope: period } = useAcademicPeriod();
  const [registers, setRegisters] = useState<AttendanceRegister[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    if (!period.isReady) return;
    const sequence = ++refreshSequence.current;
    setLoading(true);
    try {
      const next = await attendanceRepository.getAll(period);
      if (sequence !== refreshSequence.current) return;
      setRegisters(next);
      setError(undefined);
    } catch (caught) {
      if (sequence !== refreshSequence.current) return;
      setError(caught instanceof Error ? caught.message : "Attendance data could not be loaded.");
    } finally {
      if (sequence === refreshSequence.current) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void refresh();
    const sync = (event: StorageEvent) => {
      if (event.key === ATTENDANCE_STORAGE_KEY) void refresh();
    };
    const revalidate = () => void refresh();
    const revalidateWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("storage", sync);
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidateWhenVisible);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidateWhenVisible);
    };
  }, [refresh]);

  const saveDraft = useCallback(async (input: SaveAttendanceInput) => {
    const saved = await attendanceRepository.saveAttendanceDraft({ ...input, schoolId: period.schoolId, academicSessionId: period.academicSessionId, sessionId: period.academicSessionId, termId: period.termId });
    ++refreshSequence.current;
    setRegisters((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    await refresh();
  }, [period.academicSessionId, period.schoolId, period.termId, refresh]);
  const submit = useCallback(async (input: SaveAttendanceInput) => {
    const saved = await attendanceRepository.submitAttendance({ ...input, schoolId: period.schoolId, academicSessionId: period.academicSessionId, sessionId: period.academicSessionId, termId: period.termId });
    ++refreshSequence.current;
    setRegisters((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    await refresh();
  }, [period.academicSessionId, period.schoolId, period.termId, refresh]);
  const reopen = useCallback(async (id: string, reason: string) => {
    await attendanceRepository.reopenAttendanceRegister(id, "admin-user-001", reason);
    await refresh();
  }, [refresh]);
  const correctEntry = useCallback(async (input: AdminAttendanceEntryInput) => {
    await attendanceRepository.updateAttendanceEntryAsAdmin(input);
    await refresh();
  }, [refresh]);

  const scopedRegisters = useMemo(() => filterAttendanceByPeriod(registers, period), [period, registers]);
  // Both repositories already scope records to the signed-in school.
  const sessionRegisters = useMemo(() => filterAttendanceBySession(registers, {
    academicSessionId: period.academicSessionId,
  }), [period.academicSessionId, registers]);
  const value = useMemo(() => ({ registers: scopedRegisters, sessionRegisters, isLoading, error, saveDraft, submit, reopen, correctEntry, refresh }), [scopedRegisters, sessionRegisters, isLoading, error, saveDraft, submit, reopen, correctEntry, refresh]);
  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}
