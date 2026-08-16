import type { NavigationItem } from "@/types";
export const adminNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" }, { label: "Students", href: "/admin/students", icon: "students", feature: "students" },
  { label: "Admissions", href: "/admin/admissions", icon: "admissions", feature: "admissions" }, { label: "Staff & HR", href: "/admin/staff", icon: "staff", feature: "staff" },
  { label: "Academics", href: "/admin/academics", icon: "academics", feature: "academics" }, { label: "Attendance", href: "/admin/attendance", icon: "attendance", feature: "attendance" },
  { label: "Finance", href: "/admin/finance", icon: "finance", feature: "finance" }, { label: "Communications", href: "/admin/communications", icon: "communications", feature: "communications" },
  { label: "Events & Calendar", href: "/admin/events", icon: "events", feature: "events" }, { label: "Results", href: "/admin/results", icon: "results", feature: "results" },
  { label: "Trash", href: "/admin/trash", icon: "trash" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
];
