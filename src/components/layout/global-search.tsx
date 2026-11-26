"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { useAcademics } from "@/features/academics/academics-context";
import type { NavigationItem, User } from "@/types";
import { matchesSearch } from "@/lib/search";

export function GlobalSearch({ role, navigation }: { role: User["role"]; navigation: NavigationItem[] }) {
  const { state } = useAcademics();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        setTimeout(() => input.current?.focus());
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const pages = navigation.filter((item) => matchesSearch(query, item.label)).map((item) => ({ label: item.label, meta: "Page", href: item.href }));
    const hasAcademics = navigation.some((item) => item.href === "/admin/academics" || item.href === "/teacher/classes");
    const hasStudents = navigation.some((item) => item.href === "/admin/students");
    const classes = (hasAcademics && role === "Administrator" ? state.classes : hasAcademics && role === "Teacher" ? state.classes.filter((item) => item.assignedTeacherUserIds.includes("teacher-user-001")) : [])
      .filter((item) => matchesSearch(query, item.displayName, item.arm))
      .map((item) => ({ label: item.displayName, meta: "Class", href: role === "Administrator" ? `/admin/academics/classes/${item.id}` : `/teacher/classes/${item.id}` }));
    const people = hasStudents && role === "Administrator" ? state.students.filter((item) => matchesSearch(query, item.firstName, item.lastName, item.admissionNumber)).map((item) => ({ label: `${item.firstName} ${item.lastName}`, meta: item.admissionNumber, href: "/admin/students" })) : [];
    return [...pages, ...classes, ...people].slice(0, 8);
  }, [query, navigation, role, state]);

  return (
    <div className="relative block min-w-0 xl:ml-5">
      <button onClick={() => { setOpen(true); setTimeout(() => input.current?.focus()); }} className="flex size-10 items-center justify-center gap-2 rounded-[10px] bg-surface-muted text-sm text-muted md:w-auto md:justify-start md:px-3 md:py-2" aria-label="Search SchoolOS">
        <Search size={16} /><span className="hidden md:inline">Search</span><kbd className="ml-8 hidden text-xs md:inline">Ctrl K</kbd>
      </button>
      {open && <div className="fixed inset-x-4 top-[4.5rem] z-50 rounded-xl border bg-surface p-2 shadow-xl md:absolute md:inset-x-auto md:left-0 md:top-12 md:w-[min(28rem,calc(100vw-2rem))]">
        <div className="flex items-center gap-2 px-2">
          <Search size={16} />
          <input ref={input} aria-label="Search pages and records" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pages, classes or records" />
          <button aria-label="Close search" onClick={() => setOpen(false)}><X size={17} /></button>
        </div>
        <div className="max-h-80 overflow-y-auto border-t pt-1">
          {results.map((item) => <Link key={`${item.meta}-${item.label}`} href={item.href} onClick={() => { setOpen(false); setQuery(""); }} className="flex items-center justify-between rounded-lg px-3 py-3 text-sm hover:bg-surface-muted"><span className="font-medium">{item.label}</span><span className="text-xs text-muted">{item.meta}</span></Link>)}
          {query.trim() && !results.length && <p className="p-4 text-center text-sm text-muted">No navigation or records match &quot;{query.trim()}&quot;.</p>}
          {!query.trim() && <p className="p-4 text-center text-sm text-muted">Search the pages and records available to your role.</p>}
        </div>
      </div>}
    </div>
  );
}
