"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function fallbackFor(pathname: string) {
  if (pathname.endsWith("/edit")) return pathname.slice(0, -5);
  if (/\/(?:new|import)$/.test(pathname)) return pathname.replace(/\/(?:new|import)$/, "");
  return pathname.slice(0, pathname.lastIndexOf("/")) || "/";
}

export function PageHeader({
  title,
  description,
  action,
  showBack,
  backFallback,
  onBack,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  showBack?: boolean;
  backFallback?: string;
  onBack?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // Role landing and module index pages have one or two segments. Anything
  // deeper was reached from a module and should offer Back navigation.
  const hasBack = showBack ?? pathname.split("/").filter(Boolean).length >= 3;

  return (
    <div className="page-header mb-6">
      {hasBack && (
        <Button
          className="page-header-back mb-2 min-h-9"
          variant="ghost"
          type="button"
          onClick={() => {
            if (onBack) {
              onBack();
              return;
            }
            if (window.history.length > 1) {
              router.back();
              return;
            }
            router.replace(backFallback ?? fallbackFor(pathname));
          }}
        >
          <ArrowLeft size={17} className="text-[var(--school-primary-ink)]" />
          Back
        </Button>
      )}
      <div className="page-header-body flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="page-header-description mt-1 text-sm text-muted">{description}</p>}
          <span aria-hidden="true" className="mt-3 flex h-1 w-24 overflow-hidden rounded-full">
            <span className="w-1/2 bg-[var(--school-primary)]" />
            <span className="w-1/3 bg-[var(--school-secondary)]" />
            <span className="flex-1 bg-[var(--school-accent)]" />
          </span>
        </div>
        {action && <div className="page-header-actions min-w-0 max-w-full sm:ml-auto">{action}</div>}
      </div>
    </div>
  );
}
