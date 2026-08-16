import type {
  DashboardBreakpoint,
  DashboardWidgetDisplayType,
  DashboardWidgetDefinition,
  PortalRole,
  WidgetGridSize,
} from "./dashboard-widget.types";

type WidgetKind = "metric" | "compact" | "medium" | "tall" | "full";

const dimensions: Record<
  WidgetKind,
  Record<DashboardBreakpoint, WidgetGridSize>
> = {
  metric: {
    xl: { w: 3, h: 4, minW: 3, minH: 4, maxH: 4 },
    lg: { w: 3, h: 4, minW: 3, minH: 4, maxH: 4 },
    md: { w: 4, h: 4, minW: 4, minH: 4, maxH: 4 },
    sm: { w: 2, h: 4, minW: 2, minH: 4, maxH: 4 },
    xs: { w: 1, h: 4, minW: 1, minH: 4, maxH: 4 },
  },
  compact: {
    xl: { w: 6, h: 6, minW: 4, minH: 5, maxH: 9 },
    lg: { w: 6, h: 6, minW: 4, minH: 5, maxH: 9 },
    md: { w: 4, h: 6, minW: 4, minH: 5, maxH: 9 },
    sm: { w: 4, h: 6, minW: 4, minH: 5, maxH: 9 },
    xs: { w: 1, h: 6, minW: 1, minH: 5, maxH: 9 },
  },
  medium: {
    xl: { w: 6, h: 8, minW: 4, minH: 6, maxH: 14 },
    lg: { w: 6, h: 8, minW: 4, minH: 6, maxH: 14 },
    md: { w: 4, h: 8, minW: 4, minH: 6, maxH: 14 },
    sm: { w: 4, h: 8, minW: 4, minH: 6, maxH: 14 },
    xs: { w: 1, h: 8, minW: 1, minH: 6, maxH: 14 },
  },
  tall: {
    xl: { w: 6, h: 10, minW: 4, minH: 7, maxH: 16 },
    lg: { w: 6, h: 10, minW: 4, minH: 7, maxH: 16 },
    md: { w: 4, h: 10, minW: 4, minH: 7, maxH: 16 },
    sm: { w: 4, h: 10, minW: 4, minH: 7, maxH: 16 },
    xs: { w: 1, h: 10, minW: 1, minH: 7, maxH: 16 },
  },
  full: {
    xl: { w: 12, h: 4, minW: 8, minH: 4, maxH: 6 },
    lg: { w: 12, h: 4, minW: 8, minH: 4, maxH: 6 },
    md: { w: 8, h: 4, minW: 8, minH: 4, maxH: 6 },
    sm: { w: 4, h: 4, minW: 4, minH: 4, maxH: 6 },
    xs: { w: 1, h: 4, minW: 1, minH: 4, maxH: 6 },
  },
};

const metricIds = new Set([
  "admin-students", "admin-staff", "admin-fees-collected",
  "admin-outstanding-fees", "admin-announcement-drafts",
  "teacher-attendance-pending", "teacher-results-pending",
  "teacher-assigned-classes", "teacher-active-assignments",
  "teacher-submissions-review", "student-current-class",
  "student-attendance", "student-latest-result", "student-fee-status",
  "student-fee-balance", "student-next-payment", "student-overdue-assignments",
  "parent-attendance", "parent-latest-result", "parent-outstanding",
  "parent-next-due", "parent-pending-assignments",
  "parent-completed-assignments",
]);

const compactIds = new Set([
  "admin-attendance", "admin-quick-actions", "teacher-quick-actions",
  "parent-payment-plan", "parent-children-fees",
]);

const tallIds = new Set([
  "admin-events", "admin-recent-payments", "admin-admissions",
  "teacher-classes", "teacher-events", "student-timetable",
  "student-assignments", "student-events", "parent-recent-payments",
  "parent-events",
]);

const fixedIds = new Set([
  ...metricIds,
  "parent-child-selector",
]);

const tableIds = new Set([
  "admin-recent-payments",
  "admin-admissions",
  "teacher-classes",
  "student-timetable",
  "student-assignments",
  "parent-recent-payments",
  "student-payment-history",
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
  if (tableIds.has(id)) return "TABLE";
  if (listIds.has(id)) return "LIST";
  if (id.includes("activity")) return "TIMELINE";
  if (id.includes("progress") || id.includes("attendance")) return "CHART";
  return "SUMMARY";
}

function sizesFor(
  id: string,
): Record<DashboardBreakpoint, WidgetGridSize> {
  const base = dimensions[kindFor(id)];
  const override = (
    desktop: WidgetGridSize,
    tablet: WidgetGridSize = base.md,
  ): Record<DashboardBreakpoint, WidgetGridSize> => ({
    xl: desktop,
    lg: desktop,
    md: tablet,
    sm: base.sm,
    xs: base.xs,
  });

  switch (id) {
    case "admin-attendance":
      return override({ w: 5, h: 5, minW: 4, minH: 5, maxW: 7, maxH: 8 });
    case "admin-events":
      return override({ w: 7, h: 10, minW: 5, minH: 8, maxW: 9, maxH: 16 });
    case "admin-recent-payments":
      return override(
        { w: 7, h: 10, minW: 6, minH: 8, maxW: 12, maxH: 16 },
        { w: 8, h: 10, minW: 8, minH: 8, maxW: 8, maxH: 16 },
      );
    case "admin-admissions":
      return override(
        { w: 5, h: 10, minW: 5, minH: 8, maxW: 8, maxH: 16 },
        { w: 8, h: 10, minW: 8, minH: 8, maxW: 8, maxH: 16 },
      );
    case "admin-announcements":
      return override({ w: 5, h: 8, minW: 4, minH: 6, maxW: 8, maxH: 14 });
    case "teacher-classes":
    case "student-timetable":
    case "student-assignments":
    case "parent-recent-payments":
      return override(
        { w: 7, h: 10, minW: 6, minH: 8, maxW: 12, maxH: 16 },
        { w: 8, h: 10, minW: 8, minH: 8, maxW: 8, maxH: 16 },
      );
    default:
      return base;
  }
}

function kindFor(id: string): WidgetKind {
  if (id === "parent-child-selector") return "full";
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
  widget("admin", "admin-staff", "Staff statistics", 1),
  widget("admin", "admin-fees-collected", "Fees collected", 2, true, "/admin/finance"),
  widget("admin", "admin-outstanding-fees", "Outstanding fees", 3, true, "/admin/finance"),
  widget("admin", "admin-attendance", "Attendance summary", 4, true, "/admin/attendance"),
  widget("admin", "admin-events", "Upcoming events", 5, true, "/admin/events"),
  widget("admin", "admin-admissions", "Admissions awaiting review", 6, true, "/admin/admissions"),
  widget("admin", "admin-recent-payments", "Recent payments", 7, true, "/admin/finance/payments"),
  widget("admin", "admin-announcements", "Recent announcements", 8, true, "/admin/communications/announcements"),
  widget("admin", "admin-quick-actions", "Quick actions", 9),
  widget("admin", "admin-activity", "Recent activity", 10, false),
  widget("admin", "admin-collection-progress", "Fee collection progress", 11, false, "/admin/finance"),
  widget("admin", "admin-balances-class", "Outstanding balances by class", 12, false, "/admin/finance/debtors"),
  widget("admin", "admin-reconciliation", "Payment reconciliation alerts", 13, false, "/admin/finance/reconciliation"),
  widget("admin", "admin-overdue-invoices", "Overdue invoices", 14, false, "/admin/finance/invoices"),
  widget("admin", "admin-payment-methods", "Payment method breakdown", 15, false, "/admin/finance"),
  widget("admin", "admin-announcement-drafts", "Draft announcements", 16, false, "/admin/communications/announcements"),
  widget("admin", "admin-active-assignments", "Active assignments", 17, false, "/admin/academics"),

  widget("teacher", "teacher-attendance-pending", "Attendance pending", 0, true, "/teacher/attendance"),
  widget("teacher", "teacher-results-pending", "Submitted today", 1, true, "/teacher/results"),
  widget("teacher", "teacher-assigned-classes", "Assigned classes", 2),
  widget("teacher", "teacher-active-assignments", "Active assignments", 3, true, "/teacher/assignments"),
  widget("teacher", "teacher-classes", "Today's classes", 4),
  widget("teacher", "teacher-announcements", "Latest announcements", 5),
  widget("teacher", "teacher-events", "Upcoming events", 6, true, "/teacher/events"),
  widget("teacher", "teacher-submissions-review", "Recent submissions", 7, true, "/teacher/assignments"),
  widget("teacher", "teacher-class-attendance", "Class attendance summary", 8, true, "/teacher/attendance"),
  widget("teacher", "teacher-student-attention", "Students requiring attention", 9, false),
  widget("teacher", "teacher-quick-actions", "Quick actions", 10, true),
  widget("teacher", "teacher-activity-fees", "Class activity fee completion", 11, false, "/teacher/finance"),
  widget("teacher", "teacher-clearance", "Student clearance summary", 12, false, "/teacher/finance"),

  widget("student", "student-current-class", "Current class", 0),
  widget("student", "student-attendance", "Today's attendance", 1),
  widget("student", "student-fee-status", "Outstanding fees", 2, true, "/student/payments"),
  widget("student", "student-latest-result", "Latest result summary", 3, true, "/student/results"),
  widget("student", "student-assignments", "Assignments due", 4),
  widget("student", "student-announcements", "Announcements", 5),
  widget("student", "student-events", "Upcoming events", 6, true, "/student/events"),
  widget("student", "student-timetable", "Recent activity", 7),
  widget("student", "student-payment-history", "Payment history summary", 8, false, "/student/payments"),
  widget("student", "student-fee-balance", "Fee balance", 9, false, "/student/payments"),
  widget("student", "student-next-payment", "Next payment deadline", 10, false, "/student/payments"),
  widget("student", "student-recent-receipt", "Recent receipt", 11, false, "/student/payments"),
  widget("student", "student-overdue-assignments", "Overdue assignments", 12, true, "/student/assignments"),

  widget("parent", "parent-child-selector", "Selected child overview", 0),
  widget("parent", "parent-attendance", "Attendance summary", 1),
  widget("parent", "parent-outstanding", "Outstanding balance", 2, true, "/parent/payments"),
  widget("parent", "parent-latest-result", "Latest result", 3),
  widget("parent", "parent-pending-assignments", "Assignments due", 4, true, "/parent/assignments"),
  widget("parent", "parent-announcements", "Latest announcements", 5),
  widget("parent", "parent-events", "Upcoming events", 6, true, "/parent/events"),
  widget("parent", "parent-recent-payments", "Recent payments", 7, true, "/parent/payments"),
  widget("parent", "parent-payment-plan", "Payment plan summary", 8, false, "/parent/payments"),
  widget("parent", "parent-children-fees", "Children fee overview", 9, false, "/parent/payments"),
  widget("parent", "parent-next-due", "Next due date", 10, false, "/parent/payments"),
  widget("parent", "parent-completed-assignments", "Completed assignments", 11, false, "/parent/assignments"),
];

export const getWidgetsForRole = (role: PortalRole) =>
  dashboardWidgetRegistry
    .filter((item) => item.role === role)
    .sort((a, b) => a.defaultOrder - b.defaultOrder);

export const getWidgetDefinition = (role: PortalRole, id: string) =>
  dashboardWidgetRegistry.find((item) => item.role === role && item.id === id);
