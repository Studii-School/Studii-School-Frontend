"use client";
import { useEffect, useState } from "react";
import { financeApi } from "./finance.api";

type FeeStatus = "No invoice" | "Paid in full" | "Part payment" | "Not paid";

export function useTeacherStudentFees() {
  const [statuses, setStatuses] = useState<Map<string, FeeStatus>>(new Map());
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await financeApi.getTeacherStudentStatus();
        if (active) {
          setStatuses(new Map(result.students.map((student: { studentId: string; status: FeeStatus }) => [student.studentId, student.status])));
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally { pending = false; }
    };
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    void load();
    const interval = window.setInterval(visible, 30000);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, []);
  return { statuses, error };
}
