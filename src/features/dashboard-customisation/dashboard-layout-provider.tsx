"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  dashboardUsers,
  getDefaultDashboardLayout,
} from "./dashboard-layout.defaults";
import * as storage from "./dashboard-layout.storage";
import { DashboardLayoutContext } from "./dashboard-layout-context";
import type {
  DashboardResponsiveLayouts,
  PortalRole,
  UserDashboardLayout,
} from "./dashboard-widget.types";

const roles: PortalRole[] = ["admin", "teacher", "student", "parent"];
const initial = Object.fromEntries(
  roles.map((role) => [
    role,
    getDefaultDashboardLayout(dashboardUsers[role], role),
  ]),
) as Record<PortalRole, UserDashboardLayout>;

export function DashboardLayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [layouts, setLayouts] = useState(initial);
  const [isLoading, setIsLoading] = useState(true);
  const timers = useRef<Partial<Record<PortalRole, ReturnType<typeof setTimeout>>>>(
    {},
  );

  useEffect(() => {
    const activeTimers = timers.current;
    void Promise.all(
      roles.map(
        async (role) =>
          [
            role,
            await storage.getDashboardLayout(dashboardUsers[role], role),
          ] as const,
      ),
    )
      .then((entries) =>
        setLayouts(
          Object.fromEntries(entries) as Record<PortalRole, UserDashboardLayout>,
        ),
      )
      .finally(() => setIsLoading(false));
    return () => {
      for (const timer of Object.values(activeTimers)) clearTimeout(timer);
    };
  }, []);

  const update = useCallback(
    (role: PortalRole, layout: UserDashboardLayout) =>
      setLayouts((current) => ({ ...current, [role]: layout })),
    [],
  );
  const cancelPending = useCallback((role: PortalRole) => {
    const timer = timers.current[role];
    if (timer) clearTimeout(timer);
    delete timers.current[role];
  }, []);

  const pin = useCallback(
    async (role: PortalRole, id: string) => {
      cancelPending(role);
      update(role, await storage.pinWidget(dashboardUsers[role], role, id));
    },
    [cancelPending, update],
  );
  const unpin = useCallback(
    async (role: PortalRole, id: string) => {
      cancelPending(role);
      update(role, await storage.unpinWidget(dashboardUsers[role], role, id));
    },
    [cancelPending, update],
  );
  const setVisible = useCallback(
    async (role: PortalRole, id: string, visible: boolean) => {
      cancelPending(role);
      update(
        role,
        await storage.setWidgetVisibility(
          dashboardUsers[role],
          role,
          id,
          visible,
        ),
      );
    },
    [cancelPending, update],
  );
  const reorder = useCallback(
    async (role: PortalRole, ids: string[]) =>
      update(
        role,
        await storage.reorderWidgets(dashboardUsers[role], role, ids),
      ),
    [update],
  );
  const saveLayouts = useCallback(
    (role: PortalRole, responsiveLayouts: DashboardResponsiveLayouts) => {
      setLayouts((current) => ({
        ...current,
        [role]: { ...current[role], layouts: responsiveLayouts },
      }));
      const existing = timers.current[role];
      if (existing) clearTimeout(existing);
      timers.current[role] = setTimeout(() => {
        void storage
          .saveResponsiveLayouts(
            dashboardUsers[role],
            role,
            responsiveLayouts,
          )
          .then((saved) => update(role, saved));
      }, 400);
    },
    [update],
  );
  const reset = useCallback(
    async (role: PortalRole) => {
      cancelPending(role);
      update(
        role,
        await storage.resetDashboardLayout(dashboardUsers[role], role),
      );
    },
    [cancelPending, update],
  );

  const value = useMemo(
    () => ({
      layouts,
      isLoading,
      pin,
      unpin,
      setVisible,
      reorder,
      saveLayouts,
      reset,
    }),
    [
      layouts,
      isLoading,
      pin,
      unpin,
      setVisible,
      reorder,
      saveLayouts,
      reset,
    ],
  );

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}
