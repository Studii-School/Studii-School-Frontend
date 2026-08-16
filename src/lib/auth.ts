"use client";

import type { User, UserRole } from "@/types";
import type { AuthUser } from "./api";

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function normaliseRole(role?: string): UserRole {
  const compact = (role ?? "").toLowerCase().replace(/[\s_-]/g, "");
  if (compact.includes("superadmin") || compact === "superadministrator") return "Super Administrator";
  if (compact.includes("teacher")) return "Teacher";
  if (compact.includes("student")) return "Student";
  if (compact.includes("parent")) return "Parent";
  return "Administrator";
}

export function routeForRole(role?: string) {
  switch (normaliseRole(role)) {
    case "Super Administrator":
      return "/super-admin/dashboard";
    case "Teacher":
      return "/teacher/dashboard";
    case "Student":
      return "/student/dashboard";
    case "Parent":
      return "/parent/dashboard";
    default:
      return "/admin/dashboard";
  }
}

export function displayUser(user: AuthUser | null | undefined, fallback: User): User {
  if (!user) return fallback;
  const name = user.name ?? [user.firstName, user.lastName].filter(Boolean).join(" ") ?? fallback.name;
  const resolvedName = name.trim() || fallback.name;
  const initials = resolvedName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    name: resolvedName,
    email: user.email ?? fallback.email,
    role: normaliseRole(user.role),
    initials: initials || fallback.initials,
    schoolId: user.schoolId ?? fallback.schoolId,
    status: user.status ?? fallback.status,
    features: user.features ?? fallback.features,
  };
}

export function readStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function readableBackendRole(role?: string) {
  return role ? titleCase(role) : "User";
}
