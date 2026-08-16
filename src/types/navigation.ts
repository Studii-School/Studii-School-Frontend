export type IconName = "dashboard" | "students" | "admissions" | "staff" | "academics" | "attendance" | "finance" | "communications" | "reports" | "settings" | "classes" | "results" | "timetable" | "assignments" | "children" | "profile" | "events" | "schoolProfile" | "trash";

export type FeatureKey = "students" | "admissions" | "staff" | "academics" | "attendance" | "finance" | "communications" | "events" | "results" | "timetable" | "assignments";

export interface NavigationItem { label: string; href: string; icon: IconName; feature?: FeatureKey; }
