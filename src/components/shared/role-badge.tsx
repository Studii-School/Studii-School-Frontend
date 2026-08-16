import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types";
export function RoleBadge({ role }: { role: UserRole }) { return <Badge tone="primary">{role}</Badge>; }
