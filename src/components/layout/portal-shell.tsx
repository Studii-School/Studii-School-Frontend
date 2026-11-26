"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { NavigationItem, User } from "@/types";
import { AppSidebar } from "./app-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { MobileNavigation } from "./mobile-navigation";

export function PortalShell({ children, navigation, user, historicalReadOnly = false }: { children: React.ReactNode; navigation: NavigationItem[]; user: User; historicalReadOnly?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const labelTableCells = () => {
      for (const table of main.querySelectorAll("table")) {
        const headerRow = table.tHead?.rows.item(table.tHead.rows.length - 1);
        if (!headerRow) continue;
        const labels = Array.from(headerRow.cells).flatMap((cell) =>
          Array.from({ length: cell.colSpan }, () => cell.textContent?.trim() ?? ""),
        );
        for (const body of table.tBodies) {
          for (const row of body.rows) {
            let column = 0;
            for (const cell of row.cells) {
              if (cell.tagName === "TD" && cell.colSpan === 1) {
                cell.dataset.columnLabel = labels[column] ?? "";
              }
              column += cell.colSpan;
            }
          }
        }
      }
    };

    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        labelTableCells();
      });
    });
    labelTableCells();
    observer.observe(main, { childList: true, characterData: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <AppSidebar navigation={navigation} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} user={user} />
      <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} navigation={navigation} user={user} />
      <div className={cn("min-h-screen transition-[padding]", collapsed ? "lg:pl-[76px]" : "lg:pl-60")}>
        <DashboardHeader user={user} navigation={navigation} onMenu={() => setMobileOpen(true)} historicalReadOnly={historicalReadOnly} />
        <main ref={mainRef} className="portal-main mx-auto w-full max-w-[1800px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
