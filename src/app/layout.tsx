import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "react-grid-layout/css/styles.css";
import "./globals.css";
import { SchoolSettingsProvider } from "@/features/school-settings/school-settings-provider";
import { EventsProvider } from "@/features/events/events-provider";
import { DashboardLayoutProvider } from "@/features/dashboard-customisation/dashboard-layout-provider";
import { FinanceProvider } from "@/features/finance/finance-provider";
import { NavigationProgressProvider } from "@/features/navigation-progress/navigation-progress-provider";
import { AnnouncementsProvider } from "@/features/announcements/announcements-provider";
import { AttendanceProvider } from "@/features/attendance/attendance-provider";
import { AcademicsProvider } from "@/features/academics/academics-provider";
import { AssignmentsProvider } from "@/features/assignments/assignments-provider";
import { ActionFeedbackProvider } from "@/features/action-feedback/action-feedback-provider";
import { AdmissionsProvider } from "@/features/admissions/admissions-provider";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "SchoolOS", template: "%s | SchoolOS" },
  description: "A simple school operating system by TTechnologies.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geist.variable} font-sans antialiased`}><SchoolSettingsProvider><ActionFeedbackProvider><NavigationProgressProvider><AcademicsProvider><AdmissionsProvider><AssignmentsProvider><AnnouncementsProvider><AttendanceProvider><EventsProvider><FinanceProvider><DashboardLayoutProvider>{children}</DashboardLayoutProvider></FinanceProvider></EventsProvider></AttendanceProvider></AnnouncementsProvider></AssignmentsProvider></AdmissionsProvider></AcademicsProvider></NavigationProgressProvider></ActionFeedbackProvider></SchoolSettingsProvider></body></html>;
}
