import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { studentNavigation } from "@/config/student-navigation";
import { fallbackUserForRole } from "@/lib/role-fallbacks";
export default function StudentLayout({ children }: { children: React.ReactNode }) { return <AuthenticatedPortalShell navigation={studentNavigation} fallbackUser={fallbackUserForRole("Student")}>{children}</AuthenticatedPortalShell>; }
