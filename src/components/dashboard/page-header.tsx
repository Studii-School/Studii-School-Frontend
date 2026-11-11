"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { prepareAppHistoryBack, previousAppHistoryHref } from "@/features/navigation-progress/app-history";

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
  description: string;
  action?: React.ReactNode;
  showBack?: boolean;
  backFallback?: string;
  onBack?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const search = searchParams.toString();
  const currentHref = search ? `${pathname}?${search}` : pathname;
  // Role landing and module index pages have one or two segments. Anything
  // deeper was reached from a module and should offer history-aware navigation.
  const hasBack = showBack ?? pathname.split("/").filter(Boolean).length >= 3;

  return (
    <div className="mb-6">
      {hasBack && (
        <Button
          className="mb-3 -ml-3 px-3"
          variant="ghost"
          type="button"
          onClick={() => {
            if (onBack) {
              onBack();
              return;
            }
            const previousHref = previousAppHistoryHref(currentHref);
            if (previousHref) {
              prepareAppHistoryBack(currentHref, previousHref);
              router.push(previousHref);
            } else {
              router.replace(backFallback ?? fallbackFor(pathname));
            }
          }}
        >
          <ArrowLeft size={17} />
          Back
        </Button>
      )}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
