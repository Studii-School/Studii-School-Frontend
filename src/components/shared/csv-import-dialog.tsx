"use client";

import { useEffect, useId, useRef } from "react";
import { Download, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type CsvImportDialogProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onDownloadTemplate: () => void;
  onUpload: () => void;
  uploadLabel?: string;
  variant?: "dialog" | "drawer";
};

export function CsvImportDialog({
  open,
  title,
  description,
  onClose,
  onDownloadTemplate,
  onUpload,
  uploadLabel = "Upload ready CSV",
  variant = "dialog",
}: CsvImportDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href],input:not([disabled])',
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

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex bg-black/45 ${variant === "drawer" ? "justify-end" : "items-center justify-center p-4"}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`w-full border bg-surface p-5 shadow-2xl sm:p-6 ${variant === "drawer" ? "h-full max-w-2xl overflow-y-auto animate-[drawer-in_180ms_ease-out]" : "max-w-lg rounded-2xl"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold">{title}</h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">{description}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close import dialog"
            className="rounded-lg p-2 text-muted hover:bg-surface-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="rounded-xl border bg-surface p-4 text-left transition hover:border-[var(--school-primary)] hover:bg-surface-muted"
          >
            <Download className="text-[var(--school-primary)]" size={22} />
            <span className="mt-3 block font-semibold">Download CSV template</span>
            <span className="mt-1 block text-xs leading-5 text-muted">Use the correct columns and sample format.</span>
          </button>
          <button
            type="button"
            onClick={onUpload}
            className="rounded-xl border bg-surface p-4 text-left transition hover:border-[var(--school-primary)] hover:bg-surface-muted"
          >
            <Upload className="text-[var(--school-primary)]" size={22} />
            <span className="mt-3 block font-semibold">{uploadLabel}</span>
            <span className="mt-1 block text-xs leading-5 text-muted">Select a completed CSV file to import.</span>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
