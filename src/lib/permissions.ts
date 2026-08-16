import type { UserRole } from "@/types";
export const canManageSchool = (role: UserRole) => role === "Super Administrator" || role === "Administrator";
export const canEnterResults = (role: UserRole) => role === "Administrator" || role === "Teacher";
