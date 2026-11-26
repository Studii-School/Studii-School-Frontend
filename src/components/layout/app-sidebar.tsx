"use client";
import { useState } from "react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SchoolIdentity } from "@/components/shared/school-identity";
import { isActiveRoute } from "@/lib/navigation-active";
import { cn } from "@/lib/utils";
import { BrandIcon, type BrandTone } from "@/components/ui/brand-icon";
import type { NavigationItem, User } from "@/types";
import { NavIcon } from "./icon";
import { SchoolSwitcher } from "./school-switcher";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
export function AppSidebar({ navigation, collapsed, onToggle, user }: { navigation: NavigationItem[]; collapsed: boolean; onToggle: () => void; user: User }) {
  const pathname = usePathname();
  const { settings } = useSchoolSettings();
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const expanded = !collapsed || hoverExpanded;
  const showSchoolContext = user.role !== "Super Administrator";
  const previewOnHover = () => { if (collapsed) setHoverExpanded(true); };
  const toggleButton = <button type="button" onMouseEnter={previewOnHover} onClick={() => { setHoverExpanded(false); onToggle(); }} className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-foreground" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>;

  return <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r bg-surface transition-[width] duration-200 ease-out lg:flex lg:flex-col", expanded ? "w-60" : "w-[76px]")} onMouseLeave={() => setHoverExpanded(false)}>
    {collapsed ? <div className="flex h-16 items-center border-b">
      <div className="flex w-[76px] shrink-0 items-center justify-center px-2">{showSchoolContext && <SchoolIdentity compact />}{toggleButton}</div>
      {hoverExpanded && showSchoolContext && <div className="min-w-0 pr-3"><p className="truncate text-sm font-bold">{settings.shortName || settings.name}</p><p className="truncate text-[10px] text-muted">{settings.motto}</p></div>}
    </div> : <div className={cn("flex h-16 items-center justify-between border-b px-4", !showSchoolContext && "justify-end")}>{showSchoolContext && <SchoolIdentity />}{toggleButton}</div>}
    {showSchoolContext && <div className="px-3 pt-4"><SchoolSwitcher compact={!expanded} role={user.role} /></div>}
    <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation"><ul className="space-y-1">{navigation.filter((item) => !item.hideFromMenu).map((item, index) => { const active = isActiveRoute(pathname, item.href); const tone = (["primary", "secondary", "accent"] as BrandTone[])[index % 3]; return <li key={item.href}><Link href={item.href} onMouseEnter={previewOnHover} title={expanded ? undefined : item.label} className={cn("relative flex h-10 items-center gap-2 rounded-[10px] px-2 text-sm font-medium", active ? "bg-[var(--school-primary-soft)] text-[var(--school-primary-ink)] after:absolute after:right-2 after:top-3 after:h-4 after:w-1 after:rounded-full after:bg-[var(--school-accent)]" : "text-muted hover:bg-surface-muted hover:text-foreground", !expanded && "justify-center px-0")}><BrandIcon tone={active ? "primary" : tone} solid={active} className="size-8"><NavIcon name={item.icon} size={18} /></BrandIcon>{expanded && <span>{item.label}</span>}</Link></li>; })}</ul></nav>
    {expanded && <div className="border-t px-4 py-3">{showSchoolContext && <p className="truncate text-[11px] font-medium text-foreground">{settings.slogan}</p>}<p className="mt-0.5 text-[10px] text-muted">Powered by <span className="font-semibold">TTechnologies</span></p></div>}
  </aside>;
}
