"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAcademics } from "@/features/academics/academics-context";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAdmissions } from "@/features/admissions/admissions-context";
import { useAnnouncements } from "@/features/announcements/announcements-context";
import { useAssignments } from "@/features/assignments/assignments-context";
import { useAttendance } from "@/features/attendance/attendance-context";
import { useEvents } from "@/features/events/events-context";
import { useFinance } from "@/features/finance/finance-context";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { cn } from "@/lib/utils";

export function PortalRefreshButton() {
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useActionFeedback();
  const academics = useAcademics();
  const admissions = useAdmissions();
  const announcements = useAnnouncements();
  const assignments = useAssignments();
  const attendance = useAttendance();
  const events = useEvents();
  const finance = useFinance();
  const schoolSettings = useSchoolSettings();

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const results = await Promise.allSettled([
      schoolSettings.refresh(),
      academics.refresh(),
      admissions.refresh(),
      assignments.refresh(),
      announcements.refresh(),
      attendance.refresh(),
      events.refresh(),
      finance.refresh(),
    ]);
    setRefreshing(false);
    if (results.some((result) => result.status === "rejected")) {
      toast("Some portal data could not be refreshed.", "warning");
      return;
    }
    toast("Portal data refreshed.", "success");
  };

  return (
    <button
      type="button"
      title="Refresh portal data"
      aria-label="Refresh portal data"
      aria-busy={refreshing}
      disabled={refreshing}
      onClick={() => void refresh()}
      className="inline-flex size-10 items-center justify-center rounded-[10px] border bg-surface text-muted transition hover:bg-surface-muted hover:text-foreground disabled:cursor-wait disabled:opacity-70"
    >
      <RefreshCw className={cn(refreshing && "animate-spin")} size={17} />
    </button>
  );
}
