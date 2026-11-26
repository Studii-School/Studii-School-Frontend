"use client";
import { GraduationCap } from "lucide-react";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { SchoolBrandImage } from "./school-brand-image";

export function SchoolIdentity({ compact = false }: { compact?: boolean }) {
  const { settings } = useSchoolSettings();
  return <div className="flex min-w-0 items-center gap-2.5">
    <SchoolBrandImage
      logoUrl={settings.logoUrl}
      crestUrl={settings.crestUrl}
      width={36}
      height={36}
      alt={`${settings.name} logo`}
      className="size-9 shrink-0 rounded-[10px] border bg-white object-contain p-1"
      fallback={<span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--school-primary)] text-[var(--school-primary-foreground)]"><GraduationCap size={19} /></span>}
    />
    {!compact && <div className="min-w-0"><p className="truncate text-sm font-bold">{settings.shortName || settings.name}</p><p className="truncate text-[10px] text-muted">{settings.motto}</p></div>}
  </div>;
}
