import { Inbox } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
export function EmptyState({ title = "Nothing here yet", description = "New information will appear here." }: { title?: string; description?: string }) {
  return <div className="flex flex-col items-center px-6 py-12 text-center"><BrandIcon tone="accent" className="mb-3 size-12 rounded-full"><Inbox size={20} /></BrandIcon><h3 className="font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted">{description}</p></div>;
}
