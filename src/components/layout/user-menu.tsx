"use client";
import { useState } from "react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { ChevronDown, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { logout } from "@/lib/api";
import type { User } from "@/types";
export function UserMenu({ user }: { user: User }) { const [open, setOpen] = useState(false); return <div className="relative"><button onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex items-center gap-2 rounded-[10px] p-1.5 hover:bg-surface-muted"><Avatar initials={user.initials} /><span className="hidden text-left sm:block"><span className="block text-sm font-semibold leading-tight">{user.name}</span><span className="block text-xs text-muted">{user.role}</span></span><ChevronDown className="hidden text-muted sm:block" size={15} /></button>{open && <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-surface p-2 shadow-lg"><div className="border-b px-2 py-2"><p className="truncate text-sm font-medium">{user.email}</p></div><Link href="/login" onClick={() => logout({ reason: "manual" })} className="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted hover:bg-surface-muted hover:text-foreground"><LogOut size={16} />Sign out</Link></div>}</div>; }
