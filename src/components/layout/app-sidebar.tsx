"use client";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SchoolIdentity } from "@/components/shared/school-identity";
import { cn } from "@/lib/utils";
import type { NavigationItem, User } from "@/types";
import { NavIcon } from "./icon";
import { SchoolSwitcher } from "./school-switcher";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
export function AppSidebar({ navigation, collapsed, onToggle, user }: { navigation: NavigationItem[]; collapsed: boolean; onToggle: () => void; user: User }) {
  const pathname = usePathname();
  const { settings } = useSchoolSettings();
  const showSchoolContext = user.role !== "Super Administrator";
  return <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r bg-surface transition-[width] lg:flex lg:flex-col", collapsed ? "w-[76px]" : "w-60")}>
    <div className={cn("flex h-16 items-center border-b", collapsed ? "justify-center px-2" : "justify-between px-4", !showSchoolContext && "justify-end")}>{showSchoolContext && <SchoolIdentity compact={collapsed} />}<button onClick={onToggle} className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-foreground" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div>
    {showSchoolContext && <div className="px-3 pt-4"><SchoolSwitcher compact={collapsed} /></div>}
    <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation"><ul className="space-y-1">{navigation.map((item) => { const active = pathname === item.href; return <li key={item.href}><Link href={item.href} title={collapsed ? item.label : undefined} className={cn("flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium", active ? "bg-[color-mix(in_srgb,var(--school-primary)_12%,white)] text-[var(--school-primary)]" : "text-muted hover:bg-surface-muted hover:text-foreground", collapsed && "justify-center px-0")}><NavIcon name={item.icon} size={18} />{!collapsed && <span>{item.label}</span>}</Link></li>; })}</ul></nav>
    {!collapsed && <div className="border-t px-4 py-3">{showSchoolContext && <p className="truncate text-[11px] font-medium text-foreground">{settings.slogan}</p>}<p className="mt-0.5 text-[10px] text-muted">Powered by <span className="font-semibold">TTechnologies</span></p></div>}
  </aside>;
}
