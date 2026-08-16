import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Stat } from "@/types";
import { NavIcon } from "@/components/layout/icon";
export function StatCard({ stat }: { stat: Stat }) { return <Card className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-muted">{stat.label}</p><p className="mt-2 text-2xl font-bold tracking-tight">{stat.value}</p></div><span className={cn("rounded-[10px] bg-surface-muted p-2.5 text-muted", stat.tone === "primary" && "bg-primary-light text-primary", stat.tone === "success" && "bg-green-50 text-success", stat.tone === "warning" && "bg-amber-50 text-warning")}><NavIcon name={stat.icon} size={19} /></span></div><p className="mt-3 flex items-center gap-1 text-xs text-muted"><ArrowUpRight size={13} />{stat.note}</p></Card>; }
export function StatGrid({ stats }: { stats: Stat[] }) { return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}</div>; }
