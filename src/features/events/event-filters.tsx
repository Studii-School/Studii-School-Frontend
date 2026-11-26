"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { eventCategories } from "./events.defaults";
import type { EventCategory } from "./events.types";

type EventView = "all" | "upcoming" | "past";

export function EventFilters({ search, category, view, onSearch, onCategory, onView }: {
  search: string;
  category: EventCategory | "All";
  view: EventView;
  onSearch: (value: string) => void;
  onCategory: (value: EventCategory | "All") => void;
  onView: (value: EventView) => void;
}) {
  return <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_190px_auto]">
    <label className="relative"><span className="sr-only">Search events</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} /><Input className="pl-9" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search events" /></label>
    <Select label="Filter event category" value={category} onChange={(value) => onCategory(value as EventCategory | "All")} options={["All", ...eventCategories].map((value) => ({ value, label: value }))}/>
    <div className="flex rounded-[10px] bg-surface-muted p-1">
      {(["all", "upcoming", "past"] as const).map((option) => <button key={option} type="button" className={`min-h-9 rounded-lg px-3 text-sm font-medium ${view === option ? "bg-surface shadow-sm" : "text-muted"}`} onClick={() => onView(option)}>{option === "all" ? "All" : option === "upcoming" ? "Upcoming" : "Past"}</button>)}
    </div>
  </div>;
}
