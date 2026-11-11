export type IconName = "dashboard" | "students" | "admissions" | "staff" | "academics" | "attendance" | "finance" | "communications" | "reports" | "settings" | "classes" | "results" | "timetable" | "assignments" | "children" | "profile" | "events" | "schoolProfile" | "trash" | "library" | "transport" | "health" | "inventory";

export type FeatureKey = "students" | "admissions" | "staff" | "academics" | "attendance" | "finance" | "communications" | "events" | "results" | "timetable" | "assignments" | "library" | "transport" | "health" | "inventory";

export interface NavigationItem { label: string; href: string; icon: IconName; feature?: FeatureKey; }
