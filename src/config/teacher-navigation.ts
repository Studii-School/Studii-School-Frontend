import type { NavigationItem } from "@/types";
export const teacherNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/teacher/dashboard", icon: "dashboard" }, { label: "My Classes", href: "/teacher/classes", icon: "classes", feature: "academics" },
  { label: "Attendance", href: "/teacher/attendance", icon: "attendance", feature: "attendance" }, { label: "Results", href: "/teacher/results", icon: "results", feature: "results" },
  { label: "Insights", href: "/teacher/insights", icon: "reports", feature: "results" },
  { label: "Timetable", href: "/teacher/timetable", icon: "timetable", feature: "timetable" }, { label: "Students", href: "/teacher/students", icon: "students", feature: "students" },
  { label: "Assignments", href: "/teacher/assignments", icon: "assignments", feature: "assignments" },
  { label: "My Salary", href: "/teacher/finance", icon: "finance", feature: "finance" },
  // { label: "Library", href: "/teacher/library", icon: "library", feature: "library" },
  // { label: "Transport", href: "/teacher/transport", icon: "transport", feature: "transport" },
  { label: "Health & Safety", href: "/teacher/health", icon: "health", feature: "health" },
  // { label: "Inventory", href: "/teacher/inventory", icon: "inventory", feature: "inventory" },
  { label: "Announcements", href: "/teacher/announcements", icon: "communications", feature: "communications" }, { label: "Events", href: "/teacher/events", icon: "events", feature: "events" },
  { label: "Trash", href: "/teacher/trash", icon: "trash" },
];
