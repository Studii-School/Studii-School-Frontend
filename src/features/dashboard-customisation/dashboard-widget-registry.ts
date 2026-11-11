import type {
  DashboardBreakpoint,
  DashboardWidgetDisplayType,
  DashboardWidgetDefinition,
  PortalRole,
  WidgetGridSize,
} from "./dashboard-widget.types";

type WidgetKind = "metric" | "compact" | "medium" | "tall";

const dimensions: Record<
  WidgetKind,
  Record<DashboardBreakpoint, WidgetGridSize>
> = {
  metric: {
    xl: { w: 3, h: 4, minW: 3, minH: 4, maxH: 4 },
    lg: { w: 4, h: 4, minW: 4, minH: 4, maxH: 4 },
    md: { w: 4, h: 4, minW: 4, minH: 4, maxH: 4 },
    sm: { w: 2, h: 4, minW: 2, minH: 4, maxH: 4 },
    xs: { w: 1, h: 4, minW: 1, minH: 4, maxH: 4 },
  },
  compact: {
    xl: { w: 3, h: 6, minW: 3, minH: 5, maxH: 9 },
    lg: { w: 4, h: 6, minW: 4, minH: 5, maxH: 9 },
    md: { w: 4, h: 6, minW: 4, minH: 5, maxH: 9 },
    sm: { w: 2, h: 6, minW: 2, minH: 5, maxH: 9 },
    xs: { w: 1, h: 6, minW: 1, minH: 5, maxH: 9 },
  },
  medium: {
    xl: { w: 4, h: 7, minW: 3, minH: 6, maxH: 14 },
    lg: { w: 4, h: 7, minW: 4, minH: 6, maxH: 14 },
    md: { w: 4, h: 7, minW: 4, minH: 6, maxH: 14 },
    sm: { w: 2, h: 7, minW: 2, minH: 6, maxH: 14 },
    xs: { w: 1, h: 7, minW: 1, minH: 6, maxH: 14 },
  },
  tall: {
    xl: { w: 4, h: 8, minW: 4, minH: 7, maxH: 16 },
    lg: { w: 4, h: 8, minW: 4, minH: 7, maxH: 16 },
    md: { w: 4, h: 8, minW: 4, minH: 7, maxH: 16 },
    sm: { w: 2, h: 8, minW: 2, minH: 7, maxH: 16 },
    xs: { w: 1, h: 8, minW: 1, minH: 7, maxH: 16 },
  },
};

const metricIds = new Set([
  "admin-students", "admin-fees-collected",
  "admin-outstanding-fees", "admin-announcement-drafts",
  "admin-reconciliation", "admin-overdue-invoices",
  "teacher-attendance-pending",
  "teacher-assigned-classes", "teacher-active-assignments",
  "teacher-submissions-review", "student-assignments",
  "student-attendance", "student-latest-result", "student-fee-status",
  "student-overdue-assignments",
  "parent-attendance", "parent-latest-result", "parent-outstanding",
  "parent-pending-assignments",
]);

const compactIds = new Set([
  "admin-attendance",
]);

const tallIds = new Set([
  "admin-events", "teacher-events", "student-events", "parent-events",
]);

const fixedIds = new Set([
  ...metricIds,
]);

const listIds = new Set([
  "admin-events",
  "admin-announcements",
  "teacher-events",
  "teacher-announcements",
  "student-events",
  "student-announcements",
  "parent-events",
  "parent-announcements",
]);

function displayTypeFor(id: string): DashboardWidgetDisplayType {
  if (metricIds.has(id)) return "METRIC";
  if (listIds.has(id)) return "LIST";
  if (id.includes("activity")) return "TIMELINE";
  if (id.includes("progress") || id.includes("attendance")) return "CHART";
  return "SUMMARY";
}

function sizesFor(
  id: string,
): Record<DashboardBreakpoint, WidgetGridSize> {
  return dimensions[kindFor(id)];
}

function kindFor(id: string): WidgetKind {
  if (metricIds.has(id)) return "metric";
  if (compactIds.has(id)) return "compact";
  if (tallIds.has(id)) return "tall";
  return "medium";
}

const widget = (
  role: PortalRole,
  id: string,
  title: string,
  order: number,
  visible = true,
  sourceRoute?: string,
): DashboardWidgetDefinition => ({
  id,
  role,
  title,
  category:
    id.includes("fee") ||
    id.includes("payment") ||
    id.includes("balance") ||
    id.includes("collection") ||
    id.includes("reconciliation") ||
    id.includes("invoice")
      ? "Finance"
      : "General",
  defaultOrder: order,
  defaultVisible: visible,
  defaultPinned: visible,
  displayType: displayTypeFor(id),
  defaultSizes: sizesFor(id),
  resizable: !fixedIds.has(id),
  removable: true,
  pinnable: true,
  sourceRoute,
});

export const dashboardWidgetRegistry: DashboardWidgetDefinition[] = [
  widget("admin", "admin-students", "Student statistics", 0, true, "/admin/students"),
  widget("admin", "admin-fees-collected", "Fees collected", 2, true, "/admin/finance"),
  widget("admin", "admin-outstanding-fees", "Outstanding fees", 3, true, "/admin/finance"),
  widget("admin", "admin-attendance", "Attendance summary", 4, true, "/admin/attendance"),
  widget("admin", "admin-events", "Upcoming events", 5, true, "/admin/events"),
  widget("admin", "admin-announcements", "Recent announcements", 8, true, "/admin/announcements"),
  widget("admin", "admin-reconciliation", "Payment reconciliation alerts", 13, false, "/admin/finance/reconciliation"),
  widget("admin", "admin-overdue-invoices", "Overdue invoices", 14, false, "/admin/finance/invoices"),
  widget("admin", "admin-announcement-drafts", "Draft announcements", 16, false, "/admin/announcements"),

  widget("teacher", "teacher-attendance-pending", "Attendance pending", 0, true, "/teacher/attendance"),
  widget("teacher", "teacher-assigned-classes", "Assigned classes", 2),
  widget("teacher", "teacher-active-assignments", "Active assignments", 3, true, "/teacher/assignments"),
  widget("teacher", "teacher-announcements", "Latest announcements", 5),
  widget("teacher", "teacher-events", "Upcoming events", 6, true, "/teacher/events"),
  widget("teacher", "teacher-submissions-review", "Recent submissions", 7, true, "/teacher/assignments"),

  widget("student", "student-attendance", "Today's attendance", 1),
  widget("student", "student-fee-status", "Outstanding fees", 2, true, "/student/payments"),
  widget("student", "student-latest-result", "Latest result summary", 3, true, "/student/results"),
  widget("student", "student-assignments", "Assignments due", 4),
  widget("student", "student-announcements", "Announcements", 5),
  widget("student", "student-events", "Upcoming events", 6, true, "/student/events"),
  widget("student", "student-overdue-assignments", "Overdue assignments", 12, true, "/student/assignments"),

  widget("parent", "parent-attendance", "Attendance summary", 1),
  widget("parent", "parent-outstanding", "Outstanding balance", 2, true, "/parent/payments"),
  widget("parent", "parent-latest-result", "Latest result", 3),
  widget("parent", "parent-pending-assignments", "Assignments due", 4, true, "/parent/assignments"),
  widget("parent", "parent-announcements", "Latest announcements", 5),
  widget("parent", "parent-events", "Upcoming events", 6, true, "/parent/events"),
];

export const getWidgetsForRole = (role: PortalRole) =>
  dashboardWidgetRegistry
    .filter((item) => item.role === role)
    .sort((a, b) => a.defaultOrder - b.defaultOrder);

export const getWidgetDefinition = (role: PortalRole, id: string) =>
  dashboardWidgetRegistry.find((item) => item.role === role && item.id === id);
