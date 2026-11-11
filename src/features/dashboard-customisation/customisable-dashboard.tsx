"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
  type ResponsiveLayouts,
} from "react-grid-layout";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { AssignmentDashboardWidget } from "@/features/assignments/assignment-dashboard-widget";
import {
  DASHBOARD_BREAKPOINTS,
  DASHBOARD_COLUMNS,
  type DashboardBreakpoint,
  type DashboardGridItem,
  type DashboardResponsiveLayouts,
  type PortalRole,
} from "./dashboard-widget.types";
import {
  getWidgetDefinition,
} from "./dashboard-widget-registry";
import { useDashboardLayouts } from "./dashboard-layout-context";
import { DashboardEditToolbar } from "./dashboard-edit-toolbar";
import { DashboardQuickLinks } from "./dashboard-quick-links";
import { DashboardWidgetContent } from "./dashboard-widget-content";
import { DashboardWidgetShell } from "./dashboard-widget-shell";

const breakpointNames: DashboardBreakpoint[] = ["xl", "lg", "md", "sm", "xs"];
const assignmentWidget = (id: string) =>
  id.includes("assignments") || id.includes("submissions-review");

function copyLayouts(
  source: ResponsiveLayouts<DashboardBreakpoint>,
  fallback: DashboardResponsiveLayouts,
): DashboardResponsiveLayouts {
  return Object.fromEntries(
    breakpointNames.map((breakpoint) => [
      breakpoint,
      (source[breakpoint] ?? fallback[breakpoint]).map(
        (item): DashboardGridItem => ({
          i: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: item.minW,
          minH: item.minH,
          maxW: item.maxW,
          maxH: item.maxH,
        }),
      ),
    ]),
  ) as DashboardResponsiveLayouts;
}

export function CustomisableDashboard({
  role,
  title,
  description,
}: {
  role: PortalRole;
  title: string;
  description: string;
}) {
  const {
    layouts,
    isLoading,
    pin,
    unpin,
    setVisible,
    reorder,
    saveLayouts,
    reset,
  } = useDashboardLayouts();
  const { confirm, toast } = useActionFeedback();
  const [editMode, setEditMode] = useState(false);
  const [activeBreakpoint, setActiveBreakpoint] =
    useState<DashboardBreakpoint>("lg");
  const pendingLayouts = useRef<DashboardResponsiveLayouts>(
    layouts[role].layouts,
  );
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  });

  useEffect(() => {
    pendingLayouts.current = layouts[role].layouts;
  }, [layouts, role]);

  const ordered = useMemo(
    () => [...layouts[role].widgets].sort((a, b) => a.order - b.order),
    [layouts, role],
  );
  const shown = ordered.filter((item) => item.isVisible);
  const hidden = ordered.filter((item) => !item.isVisible);
  const shownIds = shown.map((item) => item.widgetId);

  const renderedLayouts = useMemo(
    () =>
      Object.fromEntries(
        breakpointNames.map((breakpoint) => [
          breakpoint,
          layouts[role].layouts[breakpoint].map((item) => {
            const definition = getWidgetDefinition(role, item.i);
            return {
              ...item,
              isDraggable: editMode && breakpoint !== "xs",
              isResizable:
                editMode &&
                breakpoint !== "xs" &&
                Boolean(definition?.resizable),
              resizeHandles: ["se"] as const,
            };
          }),
        ]),
      ) as ResponsiveLayouts<DashboardBreakpoint>,
    [editMode, layouts, role],
  );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= shown.length) return;
    const ids = [...shownIds];
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void reorder(role, ids);
  };

  const commit = () => saveLayouts(role, pendingLayouts.current);
  const commitCurrent = (current: Layout) => {
    const next = copyLayouts(
      { ...pendingLayouts.current, [activeBreakpoint]: current },
      layouts[role].layouts,
    );
    pendingLayouts.current = next;
    saveLayouts(role, next);
  };

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
            <DashboardQuickLinks />
            <DashboardEditToolbar
              editing={editMode}
              onEdit={() => setEditMode(true)}
              onDone={() => {
                commit();
                setEditMode(false);
              }}
              onRestore={() =>
                confirm({
                  title: "Restore default dashboard?",
                  description:
                    "Widget positions, sizes, visibility and pinning will return to the role defaults. Records are not affected.",
                  confirmLabel: "Restore Default",
                  destructive: true,
                  onConfirm: async () => {
                    await reset(role);
                    toast(
                      "Dashboard layout restored successfully.",
                      "success",
                    );
                  },
                })
              }
            />
          </div>
        }
      />
      {editMode && (
        <div className="mb-4 rounded-xl border bg-primary-light/40 p-3 text-sm text-primary">
          Dashboard editing is on. Move widgets by their handles, resize eligible
          cards from the lower-right corner, or use the accessible arrow controls.
        </div>
      )}
      {editMode && hidden.length > 0 && (
        <section className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-surface p-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Hidden widgets
          </span>
          {hidden.map((widget) => {
            const definition = getWidgetDefinition(role, widget.widgetId);
            return (
              <Button
                key={widget.widgetId}
                type="button"
                variant="outline"
                onClick={() => void pin(role, widget.widgetId)}
                aria-label={`Restore ${definition?.title ?? widget.widgetId} widget`}
              >
                Restore {definition?.title ?? widget.widgetId}
              </Button>
            );
          })}
        </section>
      )}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-xl bg-surface-muted"
            />
          ))}
        </div>
      ) : (
        <div ref={containerRef} className="dashboard-grid min-w-0 w-full">
          {mounted && (
            <ResponsiveGridLayout<DashboardBreakpoint>
              width={width}
              layouts={renderedLayouts}
              breakpoints={DASHBOARD_BREAKPOINTS}
              cols={DASHBOARD_COLUMNS}
              rowHeight={24}
              margin={{
                xl: [12, 12],
                lg: [12, 12],
                md: [12, 12],
                sm: [12, 12],
                xs: [12, 12],
              }}
              containerPadding={{
                xl: [0, 0],
                lg: [0, 0],
                md: [0, 0],
                sm: [0, 0],
                xs: [0, 0],
              }}
              compactor={verticalCompactor}
              dragConfig={{
                enabled: editMode && activeBreakpoint !== "xs",
                bounded: true,
                handle: ".dashboard-drag-handle",
                cancel: "a,button:not(.dashboard-drag-handle),input,select,textarea",
                threshold: 4,
              }}
              resizeConfig={{
                enabled: editMode && activeBreakpoint !== "xs",
                handles: ["se"],
              }}
              onBreakpointChange={(breakpoint) => {
                setActiveBreakpoint(breakpoint);
                setTimeout(commit, 0);
              }}
              onLayoutChange={(_current: Layout, responsive) => {
                pendingLayouts.current = copyLayouts(
                  responsive,
                  layouts[role].layouts,
                );
              }}
              onDragStop={(current) => commitCurrent(current)}
              onResizeStop={(current) => commitCurrent(current)}
            >
              {shown.map((widget, index) => {
                const definition = getWidgetDefinition(role, widget.widgetId);
                if (!definition) return null;
                return (
                  <div key={widget.widgetId} className="min-h-0 min-w-0">
                    <DashboardWidgetShell
                      widgetId={widget.widgetId}
                      title={definition.title}
                      isEditing={editMode}
                      isPinned={widget.isPinned}
                      canMoveUp={index > 0}
                      canMoveDown={index < shown.length - 1}
                      onPin={() =>
                        void (widget.isPinned
                          ? unpin(role, widget.widgetId)
                          : pin(role, widget.widgetId))
                      }
                      onHide={() =>
                        void setVisible(role, widget.widgetId, false)
                      }
                      onMoveUp={() => move(index, -1)}
                      onMoveDown={() => move(index, 1)}
                    >
                      {assignmentWidget(widget.widgetId) ? (
                        <AssignmentDashboardWidget
                          role={role}
                          widgetId={widget.widgetId}
                          title={definition.title}
                        />
                      ) : (
                        <DashboardWidgetContent
                          role={role}
                          widgetId={widget.widgetId}
                          title={definition.title}
                        />
                      )}
                    </DashboardWidgetShell>
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          )}
        </div>
      )}
    </>
  );
}
