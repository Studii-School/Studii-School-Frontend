import type { UserRole } from "@/types";
export const roleRoutes: Record<UserRole, string> = { "Super Administrator": "/super-admin/dashboard", Administrator: "/admin/dashboard", Teacher: "/teacher/dashboard", Student: "/student/dashboard", Parent: "/parent/dashboard" };
