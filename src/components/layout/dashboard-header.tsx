"use client";

import { Menu } from "lucide-react";
import type { NavigationItem, User } from "@/types";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { NotificationButton } from "./notification-button";
import { PortalRefreshButton } from "./portal-refresh-button";
import { UserMenu } from "./user-menu";
import { GlobalSearch } from "./global-search";

export function DashboardHeader({ user, navigation, onMenu }: { user: User; navigation: NavigationItem[]; onMenu: () => void }) {
  const { settings } = useSchoolSettings();
  const showSchoolContext = user.role !== "Super Administrator";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-surface/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} className="rounded-[10px] border p-2.5 text-muted lg:hidden" aria-label="Open navigation">
          <Menu size={19} />
        </button>
        {showSchoolContext && <div className="hidden min-w-0 sm:block lg:hidden xl:block">
          <p className="truncate text-sm font-semibold">{settings.name}</p>
          <p className="text-[11px] text-muted">{settings.currentTerm} · {settings.currentAcademicSession}</p>
        </div>}
        <GlobalSearch role={user.role} navigation={navigation} />
      </div>
      <div className="flex items-center gap-2">
        <PortalRefreshButton />
        <NotificationButton />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
