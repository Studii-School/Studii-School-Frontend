export function PortalLoadingSkeleton() {
  return (
    <div aria-label="Loading page" aria-busy="true" className="animate-pulse space-y-6 motion-reduce:animate-none">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-surface-muted" />
        <div className="h-4 w-full max-w-md rounded bg-surface-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-xl border bg-surface" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-64 rounded-xl border bg-surface" />
        <div className="h-64 rounded-xl border bg-surface" />
      </div>
    </div>
  );
}
