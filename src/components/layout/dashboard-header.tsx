"use client";

import { LockKeyhole, Menu } from "lucide-react";
import type { NavigationItem, User } from "@/types";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { PortalRefreshButton } from "./portal-refresh-button";
import { ThemeSwitcher } from "./theme-switcher";
import { UserMenu } from "./user-menu";
import { GlobalSearch } from "./global-search";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { academicTermLabel } from "@/features/academic-period/academic-period.types";

export function DashboardHeader({ user, navigation, onMenu, historicalReadOnly = false }: { user: User; navigation: NavigationItem[]; onMenu: () => void; historicalReadOnly?: boolean }) {
  const { settings } = useSchoolSettings();
  const period = useAcademicPeriod();
  const showSchoolContext = user.role !== "Super Administrator";
  const periodLabel = period.selectedTerm && period.selectedSession
    ? `${academicTermLabel(period.selectedTerm.name)} · ${period.selectedSession.name}`
    : settings.currentAcademicSession
      ? `${settings.currentTerm} · ${settings.currentAcademicSession}`
      : "No academic period selected";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-surface/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} className="rounded-[10px] border p-2.5 text-muted lg:hidden" aria-label="Open navigation">
          <Menu size={19} />
        </button>
        {showSchoolContext && <div className="hidden min-w-0 xl:block">
          <p className="truncate text-sm font-semibold">{settings.name}</p>
          <p className="text-[11px] text-muted">{periodLabel}</p>
        </div>}
        <GlobalSearch role={user.role} navigation={navigation} />
      </div>
      <div className="flex items-center gap-2">
        {historicalReadOnly && <div role="status" aria-label="Past session or term. Changes are disabled." title="Viewing a past session or term. Changes are disabled." className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-950 sm:gap-1.5 sm:px-2.5 sm:text-xs">
          <LockKeyhole size={12} aria-hidden="true" />
          <span className="hidden sm:inline">Past · Read only</span>
        </div>}
        <PortalRefreshButton />
        <ThemeSwitcher />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
