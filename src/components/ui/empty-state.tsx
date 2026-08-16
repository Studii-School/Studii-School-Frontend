import { Inbox } from "lucide-react";
export function EmptyState({ title = "Nothing here yet", description = "New information will appear here." }: { title?: string; description?: string }) {
  return <div className="flex flex-col items-center px-6 py-12 text-center"><span className="mb-3 rounded-full bg-surface-muted p-3 text-muted"><Inbox size={20} /></span><h3 className="font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted">{description}</p></div>;
}
