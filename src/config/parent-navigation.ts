import type { NavigationItem } from "@/types";
export const parentNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/parent/dashboard", icon: "dashboard" }, { label: "My Children", href: "/parent/children", icon: "children", feature: "students" },
  { label: "Payments", href: "/parent/payments", icon: "finance", feature: "finance" }, { label: "Results", href: "/parent/results", icon: "results", feature: "results" },
  { label: "Attendance", href: "/parent/attendance", icon: "attendance", feature: "attendance" }, { label: "Timetable", href: "/parent/timetable", icon: "timetable", feature: "timetable" }, { label: "Announcements", href: "/parent/announcements", icon: "communications", feature: "communications" },
  { label: "Assignments", href: "/parent/assignments", icon: "assignments", feature: "assignments" },
  { label: "Profile", href: "/parent/profile", icon: "profile" }, { label: "Events", href: "/parent/events", icon: "events", feature: "events" },
  { label: "Trash", href: "/parent/trash", icon: "trash" },
];
