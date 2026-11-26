"use client";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { ArrowRight } from "lucide-react";
import { SectionCard } from "@/components/dashboard/section-card";
import { useEvents } from "./events-context";
import { UpcomingEvents } from "./upcoming-events";
import type { PortalAudience } from "./events.types";
export function DashboardEvents({ role, selectedClass }: { role:PortalAudience; selectedClass?:string }) { const {events} = useEvents(); const href = role === "admin" ? "/admin/events" : `/${role}/events`; return <SectionCard tone="accent" title="Upcoming events" description={role === "admin" ? `${events.filter((event) => !event.isPublished).length} draft event(s)` : "Published events relevant to you"} action={<Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--school-primary-ink)]">{role === "admin" ? "Manage events" : "View all"}<ArrowRight size={13} /></Link>}><UpcomingEvents role={role} selectedClass={selectedClass} compact /></SectionCard>; }
