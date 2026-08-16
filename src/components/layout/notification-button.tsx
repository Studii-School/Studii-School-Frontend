import { Bell } from "lucide-react";
export function NotificationButton() { return <button className="relative rounded-[10px] border bg-surface p-2.5 text-muted hover:bg-surface-muted hover:text-foreground" aria-label="Notifications"><Bell size={18} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-danger" /></button>; }
