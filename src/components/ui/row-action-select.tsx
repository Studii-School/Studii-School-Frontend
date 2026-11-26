"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, MoreHorizontal } from "lucide-react";

type RowAction = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

export function RowActionSelect({ label, actions }: { label: string; actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 160 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(160, rect.width);
    const height = Math.min(actions.length * 42 + 16, 300);
    setPosition({
      top: rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 8) : rect.bottom + 8,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      width,
    });
  }, [actions.length]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, place]);

  return <>
    <button ref={triggerRef} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => { if (!open) place(); setOpen((value) => !value); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-surface px-2.5 text-sm font-medium shadow-sm hover:border-[var(--school-primary)] hover:bg-[var(--school-secondary-soft)]"><MoreHorizontal size={17} className="text-[var(--school-secondary-ink)]"/><span>Actions</span><ChevronDown size={14} className={`text-[var(--school-accent-ink)] ${open ? "rotate-180" : ""}`}/></button>
    {open && createPortal(<div ref={menuRef} role="menu" aria-label={label} style={{ position: "fixed", ...position }} className="z-[100] rounded-xl border bg-surface p-1.5 shadow-xl">{actions.map((action, index) => <button key={`${action.label}-${index}`} type="button" role="menuitem" disabled={action.disabled} onClick={() => { setOpen(false); action.onSelect(); }} className="block min-h-10 w-full rounded-lg px-3 text-left text-sm hover:bg-surface-muted disabled:opacity-50">{action.label}</button>)}</div>, document.body)}
  </>;
}
