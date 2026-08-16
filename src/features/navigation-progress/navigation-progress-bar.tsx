"use client";

import { useNavigationProgress } from "./use-navigation-progress";

export function NavigationProgressBar() {
  const { progress, isLoading, isVisible } = useNavigationProgress();
  if (!isLoading && progress === 0) return null;

  return (
    <div
      role={isVisible ? "progressbar" : undefined}
      aria-label={isVisible ? "Loading page" : undefined}
      aria-valuemin={isVisible ? 0 : undefined}
      aria-valuemax={isVisible ? 100 : undefined}
      aria-valuenow={isVisible ? Math.round(progress) : undefined}
      aria-hidden={isVisible ? undefined : true}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5 transition-opacity duration-200 motion-reduce:transition-none ${isVisible ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className="h-full transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{
          width: `${progress}%`,
          backgroundColor: "var(--school-primary, var(--primary, #075985))",
        }}
      />
    </div>
  );
}
