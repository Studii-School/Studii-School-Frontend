"use client";

import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardWidgetMenu } from "./dashboard-widget-menu";

interface DashboardWidgetShellProps {
  widgetId: string;
  title: string;
  isEditing: boolean;
  isDragging?: boolean;
  isPinned: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPin: () => void;
  onHide: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  children: React.ReactNode;
}

export function DashboardWidgetShell({
  widgetId,
  title,
  isEditing,
  isDragging,
  isPinned,
  canMoveUp,
  canMoveDown,
  onPin,
  onHide,
  onMoveUp,
  onMoveDown,
  children,
}: DashboardWidgetShellProps) {
  return (
    <article
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl",
        isEditing &&
          "border border-dashed border-[var(--school-primary)] bg-[color-mix(in_srgb,var(--school-primary)_4%,transparent)] p-1.5",
        isDragging && "opacity-70 shadow-lg",
      )}
      data-widget-id={widgetId}
      aria-label={`${title} widget`}
    >
      {isEditing && (
        <header className="mb-1.5 flex shrink-0 flex-wrap items-center justify-between gap-1">
          <button
            type="button"
            className="dashboard-drag-handle inline-flex min-h-9 touch-none items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-[var(--school-primary)]"
            aria-label={`Move ${title} widget`}
          >
            <GripVertical size={16} />
            <span className="max-w-44 truncate">{title}</span>
          </button>
          <DashboardWidgetMenu
            title={title}
            isPinned={isPinned}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onPin={onPin}
            onHide={onHide}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        </header>
      )}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
    </article>
  );
}
