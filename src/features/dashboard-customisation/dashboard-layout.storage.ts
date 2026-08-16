import { verticalCompactor, type LayoutItem } from "react-grid-layout/core";
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from "@/lib/storage";
import {
  DASHBOARD_LAYOUT_VERSION,
  DASHBOARD_SCHOOL_ID,
  findFirstPosition,
  getDefaultDashboardLayout,
} from "./dashboard-layout.defaults";
import {
  getWidgetDefinition,
  getWidgetsForRole,
} from "./dashboard-widget-registry";
import {
  DASHBOARD_COLUMNS,
  type DashboardBreakpoint,
  type DashboardGridItem,
  type DashboardResponsiveLayouts,
  type PortalRole,
  type UserDashboardLayout,
  type UserDashboardWidget,
} from "./dashboard-widget.types";

const breakpoints: DashboardBreakpoint[] = ["xl", "lg", "md", "sm", "xs"];

const keyFor = (schoolId: string, userId: string, role: PortalRole) =>
  `schoolos:dashboard-layout:${schoolId}:${userId}:${role}`;

const legacyKeyFor = (userId: string, role: PortalRole) =>
  `schoolos.dashboard-layout.${role}.${userId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const finiteInt = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback;

function collides(a: DashboardGridItem, b: DashboardGridItem) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function compact(
  layout: DashboardGridItem[],
  columns: number,
): DashboardGridItem[] {
  return verticalCompactor
    .compact(layout as LayoutItem[], columns)
    .map((item) => ({ ...item })) as DashboardGridItem[];
}

function normalizeWidgets(
  role: PortalRole,
  value: unknown,
): UserDashboardWidget[] {
  const defaults = getWidgetsForRole(role);
  const stored = Array.isArray(value) ? value.filter(isRecord) : [];
  return defaults.map((definition) => {
    const match = stored.find((item) => item.widgetId === definition.id);
    return {
      widgetId: definition.id,
      order: finiteInt(match?.order, definition.defaultOrder),
      isVisible:
        typeof match?.isVisible === "boolean"
          ? match.isVisible
          : definition.defaultVisible,
      isPinned:
        typeof match?.isPinned === "boolean"
          ? match.isPinned
          : definition.defaultPinned,
    };
  });
}

function normalizeBreakpoint(
  role: PortalRole,
  breakpoint: DashboardBreakpoint,
  value: unknown,
  widgets: UserDashboardWidget[],
): DashboardGridItem[] {
  const columns = DASHBOARD_COLUMNS[breakpoint];
  const visibleIds = new Set(
    widgets.filter((widget) => widget.isVisible).map((widget) => widget.widgetId),
  );
  const source = Array.isArray(value) ? value.filter(isRecord) : [];
  const layout: DashboardGridItem[] = [];

  for (const widget of [...widgets].sort((a, b) => a.order - b.order)) {
    if (!visibleIds.has(widget.widgetId)) continue;
    const definition = getWidgetDefinition(role, widget.widgetId);
    if (!definition) continue;
    const size = definition.defaultSizes[breakpoint];
    const saved = source.find((item) => item.i === widget.widgetId);
    const minW = Math.min(columns, Math.max(1, size.minW ?? 1));
    const maxW = Math.min(columns, Math.max(minW, size.maxW ?? columns));
    const minH = Math.max(1, size.minH ?? 1);
    const maxH = Math.max(minH, size.maxH ?? 100);
    const w = Math.min(
      maxW,
      Math.max(minW, finiteInt(saved?.w, size.w)),
    );
    const h = Math.min(
      maxH,
      Math.max(minH, finiteInt(saved?.h, size.h)),
    );
    const candidate: DashboardGridItem = {
      i: widget.widgetId,
      x: Math.min(columns - w, finiteInt(saved?.x, 0)),
      y: finiteInt(saved?.y, 0),
      w,
      h,
      minW,
      minH,
      maxW,
      maxH,
    };
    layout.push(
      layout.some((item) => collides(candidate, item))
        ? findFirstPosition(layout, widget.widgetId, candidate, columns)
        : candidate,
    );
  }

  return compact(layout, columns);
}

export function validateDashboardLayout(
  userId: string,
  role: PortalRole,
  value: unknown,
): UserDashboardLayout {
  const record = isRecord(value) ? value : {};
  const widgets = normalizeWidgets(role, record.widgets);
  const storedLayouts = isRecord(record.layouts) ? record.layouts : {};
  const defaults = getDefaultDashboardLayout(userId, role);

  const layouts = Object.fromEntries(
    breakpoints.map((breakpoint) => [
      breakpoint,
      normalizeBreakpoint(
        role,
        breakpoint,
        storedLayouts[breakpoint] ?? defaults.layouts[breakpoint],
        widgets,
      ),
    ]),
  ) as DashboardResponsiveLayouts;

  return {
    version: DASHBOARD_LAYOUT_VERSION,
    schoolId: DASHBOARD_SCHOOL_ID,
    userId,
    role,
    layouts,
    widgets,
    updatedAt:
      typeof record.updatedAt === "string"
        ? record.updatedAt
        : new Date().toISOString(),
  };
}

export async function getDashboardLayout(
  userId: string,
  role: PortalRole,
): Promise<UserDashboardLayout> {
  const key = keyFor(DASHBOARD_SCHOOL_ID, userId, role);
  const stored = readStoredJson<unknown>(key, null);
  const legacy = stored ?? readStoredJson<unknown>(legacyKeyFor(userId, role), null);
  const migrated = validateDashboardLayout(userId, role, legacy);
  if (legacy !== null) writeStoredJson(key, migrated);
  return migrated;
}

export async function saveDashboardLayout(
  layout: UserDashboardLayout,
): Promise<UserDashboardLayout> {
  const saved = validateDashboardLayout(layout.userId, layout.role, {
    ...layout,
    updatedAt: new Date().toISOString(),
  });
  writeStoredJson(
    keyFor(saved.schoolId, saved.userId, saved.role),
    saved,
  );
  return saved;
}

export async function resetDashboardLayout(
  userId: string,
  role: PortalRole,
) {
  removeStoredValue(keyFor(DASHBOARD_SCHOOL_ID, userId, role));
  removeStoredValue(legacyKeyFor(userId, role));
  return getDefaultDashboardLayout(userId, role);
}

async function mutate(
  userId: string,
  role: PortalRole,
  change: (layout: UserDashboardLayout) => UserDashboardLayout,
) {
  return saveDashboardLayout(change(await getDashboardLayout(userId, role)));
}

function withVisibility(
  layout: UserDashboardLayout,
  widgetId: string,
  visible: boolean,
  pinned: boolean,
): UserDashboardLayout {
  const widgets = layout.widgets.map((item) =>
    item.widgetId === widgetId
      ? { ...item, isVisible: visible, isPinned: pinned }
      : item,
  );
  const layouts = Object.fromEntries(
    breakpoints.map((breakpoint) => {
      const existing = layout.layouts[breakpoint].filter(
        (item) => item.i !== widgetId,
      );
      if (!visible) {
        return [
          breakpoint,
          compact(existing, DASHBOARD_COLUMNS[breakpoint]),
        ];
      }
      const definition = getWidgetDefinition(layout.role, widgetId);
      if (!definition) return [breakpoint, existing];
      const placed = findFirstPosition(
        existing,
        widgetId,
        definition.defaultSizes[breakpoint],
        DASHBOARD_COLUMNS[breakpoint],
      );
      return [
        breakpoint,
        compact([...existing, placed], DASHBOARD_COLUMNS[breakpoint]),
      ];
    }),
  ) as DashboardResponsiveLayouts;
  return { ...layout, widgets, layouts };
}

export const pinWidget = (
  userId: string,
  role: PortalRole,
  widgetId: string,
) =>
  mutate(userId, role, (layout) =>
    withVisibility(layout, widgetId, true, true),
  );

export const unpinWidget = (
  userId: string,
  role: PortalRole,
  widgetId: string,
) =>
  mutate(userId, role, (layout) =>
    withVisibility(layout, widgetId, false, false),
  );

export const setWidgetVisibility = (
  userId: string,
  role: PortalRole,
  widgetId: string,
  isVisible: boolean,
) =>
  mutate(userId, role, (layout) =>
    withVisibility(
      layout,
      widgetId,
      isVisible,
      isVisible
        ? layout.widgets.find((item) => item.widgetId === widgetId)?.isPinned ??
            false
        : false,
    ),
  );

export const reorderWidgets = (
  userId: string,
  role: PortalRole,
  orderedWidgetIds: string[],
) =>
  mutate(userId, role, (layout) => {
    const unique = [...new Set(orderedWidgetIds)];
    const remaining = layout.widgets
      .filter((item) => !unique.includes(item.widgetId))
      .sort((a, b) => a.order - b.order)
      .map((item) => item.widgetId);
    const all = [...unique, ...remaining];
    const widgets = layout.widgets.map((item) => ({
      ...item,
      order: all.indexOf(item.widgetId),
    }));
    const responsiveLayouts = Object.fromEntries(
      breakpoints.map((breakpoint) => {
        const placed: DashboardGridItem[] = [];
        for (const id of all) {
          const widget = widgets.find((item) => item.widgetId === id);
          if (!widget?.isVisible) continue;
          const definition = getWidgetDefinition(role, id);
          if (!definition) continue;
          const saved = layout.layouts[breakpoint].find((item) => item.i === id);
          placed.push(
            findFirstPosition(
              placed,
              id,
              saved ?? definition.defaultSizes[breakpoint],
              DASHBOARD_COLUMNS[breakpoint],
            ),
          );
        }
        return [breakpoint, placed];
      }),
    ) as DashboardResponsiveLayouts;
    return {
      ...layout,
      widgets,
      layouts: responsiveLayouts,
    };
  });

export const saveResponsiveLayouts = (
  userId: string,
  role: PortalRole,
  layouts: DashboardResponsiveLayouts,
) =>
  mutate(userId, role, (current) => {
    const order = [...layouts.xl]
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((item) => item.i);
    return {
      ...current,
      layouts,
      widgets: current.widgets.map((widget) => ({
        ...widget,
        order:
          order.indexOf(widget.widgetId) >= 0
            ? order.indexOf(widget.widgetId)
            : widget.order,
      })),
    };
  });
