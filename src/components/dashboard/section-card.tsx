import { Card } from "@/components/ui/card";
import type { BrandTone } from "@/components/ui/brand-icon";

const markers: Record<BrandTone, string> = {
  primary: "bg-[var(--school-primary)]",
  secondary: "bg-[var(--school-secondary)]",
  accent: "bg-[var(--school-accent)]",
};

export function SectionCard({ title, description, children, action, tone = "secondary" }: { title: string; description?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; tone?: BrandTone }) { return <Card className="section-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden"><div className="section-card-header flex shrink-0 flex-col items-stretch gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex min-w-0 items-center gap-2.5"><span aria-hidden="true" className={`h-5 w-1 shrink-0 rounded-full ${markers[tone]}`} /><div className="min-w-0"><h2 className="break-words text-sm font-semibold">{title}</h2>{description && <p className="mt-0.5 break-words text-xs text-muted">{description}</p>}</div></div>{action && <div className="section-card-action min-w-0">{action}</div>}</div><div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div></Card>; }
