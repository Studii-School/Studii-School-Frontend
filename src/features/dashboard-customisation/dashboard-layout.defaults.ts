import { defaultSchoolSettings } from "@/features/school-settings/school-settings.defaults";
import { getWidgetsForRole } from "./dashboard-widget-registry";
import {
  DASHBOARD_COLUMNS,
  type DashboardBreakpoint,
  type DashboardGridItem,
  type DashboardResponsiveLayouts,
  type PortalRole,
  type UserDashboardLayout,
  type WidgetGridSize,
} from "./dashboard-widget.types";

export const DASHBOARD_LAYOUT_VERSION = 3;
export const DASHBOARD_SCHOOL_ID = defaultSchoolSettings.id;

export const dashboardUsers: Record<PortalRole, string> = {
  admin: "admin-user-001",
  teacher: "teacher-user-001",
  student: "student-user-001",
  parent: "parent-user-001",
};

const breakpoints: DashboardBreakpoint[] = ["xl", "lg", "md", "sm", "xs"];

function overlaps(a: DashboardGridItem, b: DashboardGridItem) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

export function findFirstPosition(
  layout: DashboardGridItem[],
  id: string,
  size: WidgetGridSize,
  columns: number,
): DashboardGridItem {
  const w = Math.min(columns, Math.max(1, size.w));
  for (let y = 0; y < 10_000; y += 1) {
    for (let x = 0; x <= columns - w; x += 1) {
      const candidate: DashboardGridItem = {
        i: id,
        x,
        y,
        w,
        h: size.h,
        minW: size.minW,
        minH: size.minH,
        maxW: size.maxW,
        maxH: size.maxH,
      };
      if (!layout.some((item) => overlaps(candidate, item))) return candidate;
    }
  }
  return {
    i: id,
    x: 0,
    y: 10_000,
    w,
    h: size.h,
    minW: size.minW,
    minH: size.minH,
    maxW: size.maxW,
    maxH: size.maxH,
  };
}

export function createDefaultResponsiveLayouts(
  role: PortalRole,
): DashboardResponsiveLayouts {
  const definitions = getWidgetsForRole(role).filter(
    (definition) => definition.defaultVisible,
  );
  return Object.fromEntries(
    breakpoints.map((breakpoint) => {
      const layout: DashboardGridItem[] = [];
      for (const definition of definitions) {
        layout.push(
          findFirstPosition(
            layout,
            definition.id,
            definition.defaultSizes[breakpoint],
            DASHBOARD_COLUMNS[breakpoint],
          ),
        );
      }
      return [breakpoint, layout];
    }),
  ) as DashboardResponsiveLayouts;
}

export function getDefaultDashboardLayout(
  userId: string,
  role: PortalRole,
): UserDashboardLayout {
  return {
    version: DASHBOARD_LAYOUT_VERSION,
    schoolId: DASHBOARD_SCHOOL_ID,
    userId,
    role,
    layouts: createDefaultResponsiveLayouts(role),
    widgets: getWidgetsForRole(role).map((definition) => ({
      widgetId: definition.id,
      order: definition.defaultOrder,
      isVisible: definition.defaultVisible,
      isPinned: definition.defaultPinned,
    })),
    updatedAt: new Date(0).toISOString(),
  };
}
