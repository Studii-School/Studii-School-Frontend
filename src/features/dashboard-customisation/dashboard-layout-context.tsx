"use client";

import { createContext, useContext } from "react";
import type {
  DashboardResponsiveLayouts,
  PortalRole,
  UserDashboardLayout,
} from "./dashboard-widget.types";

export interface DashboardLayoutContextValue {
  layouts: Record<PortalRole, UserDashboardLayout>;
  isLoading: boolean;
  pin: (role: PortalRole, widgetId: string) => Promise<void>;
  unpin: (role: PortalRole, widgetId: string) => Promise<void>;
  setVisible: (
    role: PortalRole,
    widgetId: string,
    visible: boolean,
  ) => Promise<void>;
  reorder: (role: PortalRole, ids: string[]) => Promise<void>;
  saveLayouts: (
    role: PortalRole,
    layouts: DashboardResponsiveLayouts,
  ) => void;
  reset: (role: PortalRole) => Promise<void>;
}

export const DashboardLayoutContext =
  createContext<DashboardLayoutContextValue | null>(null);

export function useDashboardLayouts() {
  const value = useContext(DashboardLayoutContext);
  if (!value) {
    throw new Error(
      "useDashboardLayouts must be used within DashboardLayoutProvider",
    );
  }
  return value;
}
