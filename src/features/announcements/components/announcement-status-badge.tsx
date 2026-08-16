import { Badge } from "@/components/ui/badge";
import type { AnnouncementStatus } from "../announcements.types";
export function AnnouncementStatusBadge({ status }: { status: AnnouncementStatus }) { return <Badge tone={status === "PUBLISHED" ? "success" : status === "DRAFT" ? "warning" : "neutral"}>{status[0] + status.slice(1).toLowerCase()}</Badge>; }
