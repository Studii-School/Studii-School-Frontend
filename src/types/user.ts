import type { FeatureKey } from "./navigation";

export type UserRole = "Super Administrator" | "Administrator" | "Teacher" | "Student" | "Parent";
export interface User { name: string; role: UserRole; email: string; initials: string; schoolId?: string; status?: string; features?: Partial<Record<FeatureKey, boolean>>; }
