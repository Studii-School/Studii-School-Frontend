import type { NavigationItem } from "@/types";
export const studentNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/student/dashboard", icon: "dashboard" }, { label: "Results", href: "/student/results", icon: "results", feature: "results" },
  { label: "Attendance", href: "/student/attendance", icon: "attendance", feature: "attendance" }, { label: "Timetable", href: "/student/timetable", icon: "timetable", feature: "timetable" },
  { label: "Assignments", href: "/student/assignments", icon: "assignments", feature: "assignments" }, { label: "Payments", href: "/student/payments", icon: "finance", feature: "finance" },
  { label: "Announcements", href: "/student/announcements", icon: "communications", feature: "communications" }, { label: "Events", href: "/student/events", icon: "events", feature: "events" },
  { label: "Trash", href: "/student/trash", icon: "trash" },
];
