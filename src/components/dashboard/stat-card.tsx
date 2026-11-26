import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Stat } from "@/types";
import { NavIcon } from "@/components/layout/icon";
import type { BrandTone } from "@/components/ui/brand-icon";

const brandStyles: Record<BrandTone, string> = {
  primary: "bg-[var(--school-primary-soft)] text-[var(--school-primary-ink)]",
  secondary: "bg-[var(--school-secondary-soft)] text-[var(--school-secondary-ink)]",
  accent: "bg-[var(--school-accent-soft)] text-[var(--school-accent-ink)]",
};

export function StatCard({ stat, brandTone = "secondary" }: { stat: Stat; brandTone?: BrandTone }) { const iconStyle = stat.tone === "success" ? "bg-green-50 text-success" : stat.tone === "warning" ? "bg-amber-50 text-warning" : stat.tone === "danger" ? "bg-red-50 text-danger" : brandStyles[stat.tone === "primary" ? "primary" : brandTone]; return <Card className="p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-muted">{stat.label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{stat.value}</p></div><span className={cn("rounded-xl p-2.5", iconStyle)}><NavIcon name={stat.icon} size={19} /></span></div><p className="mt-3 flex items-center gap-1 text-xs text-muted"><ArrowUpRight size={13} className="text-[var(--school-secondary-ink)]" />{stat.note}</p></Card>; }
export function StatGrid({ stats }: { stats: Stat[] }) { const tones: BrandTone[] = ["primary", "secondary", "accent"]; return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat, index) => <StatCard key={stat.label} stat={stat} brandTone={tones[index % tones.length]} />)}</div>; }
