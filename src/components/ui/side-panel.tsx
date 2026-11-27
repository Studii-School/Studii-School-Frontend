"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export function SidePanel({
  open,
  title,
  description,
  children,
  onClose,
  maxWidth = "lg",
  presentation = "panel",
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: "md" | "lg" | "xl" | "2xl";
  presentation?: "panel" | "modal";
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      const modals = document.querySelectorAll('[aria-modal="true"]');
      if (modals[modals.length - 1] !== panelRef.current) return;
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-[90] flex bg-black/45 ${presentation === "modal" ? "items-center justify-center p-2 sm:p-4" : "justify-end"}`} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
        className={`flex w-full min-w-0 flex-col bg-surface shadow-2xl ${presentation === "modal" ? "max-h-[min(calc(100dvh-1rem),900px)] rounded-xl border" : "h-screen h-dvh border-l animate-[drawer-in_180ms_ease-out]"} ${maxWidth === "md" ? "max-w-md" : maxWidth === "lg" ? "max-w-xl" : maxWidth === "xl" ? "max-w-3xl" : "max-w-4xl"}`}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold">{title}</h2>
            {description && <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted">{description}</p>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close panel" className="shrink-0 rounded-lg p-2 text-muted hover:bg-surface-muted"><X size={18} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </section>
    </div>
  );
}
