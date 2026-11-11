export type PortalRole = "admin" | "teacher" | "student" | "parent";

export type DashboardBreakpoint = "xl" | "lg" | "md" | "sm" | "xs";

export const DASHBOARD_BREAKPOINTS: Record<DashboardBreakpoint, number> = {
  xl: 1200,
  lg: 900,
  md: 640,
  sm: 480,
  xs: 0,
};

export const DASHBOARD_COLUMNS: Record<DashboardBreakpoint, number> = {
  xl: 12,
  lg: 12,
  md: 8,
  sm: 4,
  xs: 1,
};

export interface WidgetGridSize {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export type DashboardWidgetDisplayType =
  | "METRIC"
  | "SUMMARY"
  | "LIST"
  | "TABLE"
  | "CHART"
  | "TIMELINE";

export interface DashboardGridItem extends WidgetGridSize {
  i: string;
  x: number;
  y: number;
}

export type DashboardResponsiveLayouts = Record<
  DashboardBreakpoint,
  DashboardGridItem[]
>;

export interface DashboardWidgetDefinition {
  id: string;
  role: PortalRole;
  title: string;
  description?: string;
  category: string;
  defaultOrder: number;
  defaultVisible: boolean;
  defaultPinned: boolean;
  displayType: DashboardWidgetDisplayType;
  defaultSizes: Record<DashboardBreakpoint, WidgetGridSize>;
  resizable?: boolean;
  removable?: boolean;
  pinnable?: boolean;
  sourceRoute?: string;
  permissions?: string[];
}

export interface UserDashboardWidget {
  widgetId: string;
  order: number;
  isVisible: boolean;
  isPinned: boolean;
}

export interface UserDashboardLayout {
  version: 3;
  schoolId: string;
  userId: string;
  role: PortalRole;
  layouts: DashboardResponsiveLayouts;
  widgets: UserDashboardWidget[];
  updatedAt: string;
}

export interface LegacyDashboardWidget {
  widgetId?: unknown;
  order?: unknown;
  isVisible?: unknown;
  isPinned?: unknown;
  size?: unknown;
}

export interface LegacyDashboardLayout {
  userId?: unknown;
  role?: unknown;
  widgets?: unknown;
  updatedAt?: unknown;
}
