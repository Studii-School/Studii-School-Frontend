import type { NavigationItem } from "@/types";

export const superAdminNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/super-admin/dashboard", icon: "dashboard" },
  { label: "Schools", href: "/super-admin/schools", icon: "schoolProfile" },
  { label: "Demo requests", href: "/super-admin/demo-requests", icon: "events" },
  { label: "Features", href: "/super-admin/features", icon: "settings" },
  { label: "Trash", href: "/super-admin/trash", icon: "trash" },
];
