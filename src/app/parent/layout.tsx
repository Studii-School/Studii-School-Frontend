import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { parentNavigation } from "@/config/parent-navigation";
import { fallbackUserForRole } from "@/lib/role-fallbacks";
export default function ParentLayout({ children }: { children: React.ReactNode }) { return <AuthenticatedPortalShell navigation={parentNavigation} fallbackUser={fallbackUserForRole("Parent")}>{children}</AuthenticatedPortalShell>; }
