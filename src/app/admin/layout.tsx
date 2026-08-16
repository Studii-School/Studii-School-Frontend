import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { adminNavigation } from "@/config/admin-navigation";
import { fallbackUserForRole } from "@/lib/role-fallbacks";

const fallbackUser = fallbackUserForRole("Administrator");

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedPortalShell
      navigation={adminNavigation}
      fallbackUser={fallbackUser}
    >
      {children}
    </AuthenticatedPortalShell>
  );
}
