import type { User, UserRole } from "@/types";

const initialsFor = (role: UserRole) =>
  role
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function fallbackUserForRole(role: UserRole): User {
  return {
    name: role,
    role,
    email: "",
    initials: initialsFor(role),
    schoolId: role === "Super Administrator" ? "platform" : undefined,
  };
}
