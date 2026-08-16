"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { NavigationItem, User } from "@/types";
import { AppSidebar } from "./app-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { MobileNavigation } from "./mobile-navigation";

export function PortalShell({ children, navigation, user }: { children: React.ReactNode; navigation: NavigationItem[]; user: User }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <AppSidebar navigation={navigation} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} user={user} />
      <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} navigation={navigation} user={user} />
      <div className={cn("min-h-screen transition-[padding]", collapsed ? "lg:pl-[76px]" : "lg:pl-60")}>
        <DashboardHeader user={user} navigation={navigation} onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1800px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
