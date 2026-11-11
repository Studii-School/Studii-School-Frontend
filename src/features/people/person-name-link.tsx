"use client";

import { usePathname } from "next/navigation";
import Link from "@/features/navigation-progress/navigation-progress-link";
import type { ReactNode } from "react";

type PersonKind = "student" | "staff" | "guardian";

export function PersonNameLink({ kind, id, children, className = "" }: {
  kind: PersonKind;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const role = pathname.split("/")[1];
  if (!id || !["admin", "teacher", "parent", "student"].includes(role)) return <span className={className}>{children}</span>;
  if (kind === "guardian" && role !== "admin") return <span className={className}>{children}</span>;
  const encodedId = encodeURIComponent(id);
  const href = role === "admin" && kind === "student"
    ? `/admin/students/${encodedId}`
    : role === "admin" && kind === "staff"
      ? `/admin/staff/${encodedId}`
      : `/${role}/people/${kind}/${encodedId}`;
  return <Link href={href} className={`rounded-sm text-[var(--school-primary)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--school-primary)] ${className}`}>{children}</Link>;
}
