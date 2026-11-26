import type { NavigationItem } from "@/types";
export const adminNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" }, { label: "Students", href: "/admin/students", icon: "students", feature: "students" },
  { label: "Admissions", href: "/admin/admissions", icon: "admissions", feature: "admissions" }, { label: "Staff & HR", href: "/admin/staff", icon: "staff", feature: "staff" },
  { label: "Academics", href: "/admin/academics", icon: "academics", feature: "academics", hideFromMenu: true }, { label: "Attendance", href: "/admin/attendance", icon: "attendance", feature: "attendance" },
  { label: "Finance", href: "/admin/finance", icon: "finance", feature: "finance" }, { label: "Announcements", href: "/admin/announcements", icon: "communications", feature: "communications" },
  { label: "Events", href: "/admin/events", icon: "events", feature: "events" }, { label: "Results", href: "/admin/results", icon: "results", feature: "results" },
  { label: "Insights", href: "/admin/insights", icon: "reports", feature: "results" },
  // { label: "Library", href: "/admin/library", icon: "library", feature: "library" },
  // { label: "Transport", href: "/admin/transport", icon: "transport", feature: "transport" },
  { label: "Health & Safety", href: "/admin/health", icon: "health", feature: "health" },
  // { label: "Inventory", href: "/admin/inventory", icon: "inventory", feature: "inventory" },
  { label: "Trash", href: "/admin/trash", icon: "trash" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
];
