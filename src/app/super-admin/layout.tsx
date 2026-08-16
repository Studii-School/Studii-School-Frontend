import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { superAdminNavigation } from "@/config/super-admin-navigation";
import { fallbackUserForRole } from "@/lib/role-fallbacks";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedPortalShell navigation={superAdminNavigation} fallbackUser={fallbackUserForRole("Super Administrator")}>{children}</AuthenticatedPortalShell>;
}
