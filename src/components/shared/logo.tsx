import Link from "@/features/navigation-progress/navigation-progress-link";
import { GraduationCap } from "lucide-react";
export function Logo({ compact = false, href = "/login" }: { compact?: boolean; href?: string }) {
  return <Link href={href} className="inline-flex items-center gap-2.5 rounded-lg"><span className="flex size-9 items-center justify-center rounded-[10px] bg-primary text-white"><GraduationCap size={20} /></span>{!compact && <span><span className="block text-base font-bold leading-none">School<span className="text-primary">OS</span></span><span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-muted">TTechnologies</span></span>}</Link>;
}
