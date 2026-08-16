"use client";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { SchoolIdentity } from "@/components/shared/school-identity";
import { cn } from "@/lib/utils";
import type { NavigationItem, User } from "@/types";
import { NavIcon } from "./icon";
export function MobileNavigation({ open, onClose, navigation, user }: { open: boolean; onClose: () => void; navigation: NavigationItem[]; user: User }) { const pathname = usePathname(); const showSchoolContext = user.role !== "Super Administrator"; if (!open) return null; return <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-foreground/30" onClick={onClose} aria-label="Close navigation" /><aside className="relative flex h-full w-[min(85vw,300px)] flex-col bg-surface shadow-xl"><div className="flex h-16 items-center justify-between border-b px-4">{showSchoolContext ? <SchoolIdentity /> : <span />}<button onClick={onClose} className="rounded-lg p-2 text-muted" aria-label="Close menu"><X size={20} /></button></div><nav className="overflow-y-auto p-3"><ul className="space-y-1">{navigation.map((item) => <li key={item.href}><Link onClick={onClose} href={item.href} className={cn("flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium", pathname === item.href ? "bg-[color-mix(in_srgb,var(--school-primary)_12%,white)] text-[var(--school-primary)]" : "text-muted hover:bg-surface-muted")}><NavIcon name={item.icon} size={18} />{item.label}</Link></li>)}</ul></nav><p className="mt-auto border-t p-4 text-xs text-muted">Powered by TTechnologies</p></aside></div>; }
