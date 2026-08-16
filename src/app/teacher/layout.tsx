import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { teacherNavigation } from "@/config/teacher-navigation";
import { fallbackUserForRole } from "@/lib/role-fallbacks";
export default function TeacherLayout({ children }: { children: React.ReactNode }) { return <AuthenticatedPortalShell navigation={teacherNavigation} fallbackUser={fallbackUserForRole("Teacher")}>{children}</AuthenticatedPortalShell>; }
