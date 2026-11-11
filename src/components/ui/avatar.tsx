import { cn } from "@/lib/utils";
export function Avatar({ initials, src, alt = "Profile image", className }: { initials: string; src?: string; alt?: string; className?: string }) {
  return <img
    src={src || "/default-profile.svg"}
    alt={alt}
    onError={(event) => {
      event.currentTarget.onerror = null;
      event.currentTarget.src = "/default-profile.svg";
    }}
    className={cn("inline-flex size-9 shrink-0 rounded-full border bg-surface object-cover", className)}
  />;
}
