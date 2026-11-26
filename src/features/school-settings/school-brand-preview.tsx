"use client";

import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SchoolBrandImage } from "@/components/shared/school-brand-image";
import { useSchoolSettings } from "./school-settings-context";

export function SchoolBrandPreview() {
  const { settings } = useSchoolSettings();
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border bg-surface">
      <div className="border-b bg-[var(--school-primary)] p-5 text-[var(--school-primary-foreground)]">
        <div className="flex min-w-0 items-center gap-3">
          <SchoolBrandImage
            logoUrl={settings.logoUrl}
            crestUrl={settings.crestUrl}
            width={48}
            height={48}
            alt="School logo"
            className="size-12 shrink-0 rounded-[10px] bg-white object-contain p-1"
            fallback={<span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-white/15"><GraduationCap size={24} /></span>}
          />
          <div className="min-w-0">
            <p className="break-words font-bold">
              {settings.name || "Your school name"}
            </p>
            <p className="mt-0.5 break-words text-xs opacity-80">
              {settings.motto || "Your school motto"}
            </p>
          </div>
        </div>
      </div>
      <div className="min-w-0 p-5">
        <p className="break-words text-sm text-muted">
          {settings.slogan || "Your school slogan will appear here."}
        </p>
        <div className="mt-5 flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="min-h-10 rounded-[10px] bg-[var(--school-primary)] px-4 text-sm font-semibold text-[var(--school-primary-foreground)]"
          >
            Primary action
          </button>
          <button
            type="button"
            className="min-h-10 rounded-[10px] bg-[var(--school-secondary)] px-4 text-sm font-semibold text-[var(--school-secondary-foreground)]"
          >
            Secondary action
          </button>
          <Badge className="bg-[var(--school-accent)] text-[var(--school-accent-foreground)]">
            Accent badge
          </Badge>
        </div>
      </div>
    </div>
  );
}
