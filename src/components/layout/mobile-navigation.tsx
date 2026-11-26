"use client";
import { useEffect, useRef } from "react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { SchoolIdentity } from "@/components/shared/school-identity";
import { isActiveRoute } from "@/lib/navigation-active";
import { cn } from "@/lib/utils";
import { BrandIcon, type BrandTone } from "@/components/ui/brand-icon";
import type { NavigationItem, User } from "@/types";
import { NavIcon } from "./icon";
import { SchoolSwitcher } from "./school-switcher";
export function MobileNavigation({ open, onClose, navigation, user }: { open: boolean; onClose: () => void; navigation: NavigationItem[]; user: User }) {
  const pathname = usePathname();
  const closeButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const showSchoolContext = user.role !== "Super Administrator";

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = drawer.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
    <button type="button" className="absolute inset-0 bg-foreground/30" onClick={onClose} aria-label="Close navigation" />
    <aside ref={drawer} role="dialog" aria-modal="true" aria-label="Navigation" className="relative flex h-screen h-dvh w-[min(85vw,300px)] max-w-full flex-col bg-surface shadow-xl">
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">{showSchoolContext ? <SchoolIdentity /> : <span />}<button ref={closeButton} type="button" onClick={onClose} className="rounded-lg p-2 text-muted" aria-label="Close menu"><X size={20} /></button></div>
      {showSchoolContext && <div className="shrink-0 px-3 pt-3"><SchoolSwitcher role={user.role} /></div>}
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3" aria-label="Portal navigation"><ul className="space-y-1">{navigation.filter((item) => !item.hideFromMenu).map((item, index) => { const active = isActiveRoute(pathname, item.href); const tone = (["primary", "secondary", "accent"] as BrandTone[])[index % 3]; return <li key={item.href}><Link onClick={onClose} href={item.href} className={cn("relative flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-sm font-medium", active ? "bg-[var(--school-primary-soft)] text-[var(--school-primary-ink)] after:absolute after:right-2 after:top-3 after:h-4 after:w-1 after:rounded-full after:bg-[var(--school-accent)]" : "text-muted hover:bg-surface-muted")}><BrandIcon tone={active ? "primary" : tone} solid={active} className="size-8"><NavIcon name={item.icon} size={18} /></BrandIcon><span className="min-w-0 break-words">{item.label}</span></Link></li>; })}</ul></nav>
      <p className="shrink-0 border-t p-4 text-xs text-muted">Powered by TTechnologies</p>
    </aside>
  </div>;
}
