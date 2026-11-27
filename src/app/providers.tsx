"use client";

import { usePathname } from "next/navigation";
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
import { AcademicPeriodProvider } from "@/features/academic-period/academic-period-provider";

const authRoutes = new Set(["/login", "/forgot-password", "/reset-password", "/first-time-login"]);
const publicRoutes = new Set(["/", "/schedule-demo", "/school-onboarding"]);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (publicRoutes.has(pathname)) return children;

  if (authRoutes.has(pathname)) {
    return (
      <ActionFeedbackProvider>
        <NavigationProgressProvider>{children}</NavigationProgressProvider>
      </ActionFeedbackProvider>
    );
  }

  return (
    <SchoolSettingsProvider>
      <ActionFeedbackProvider>
        <AcademicPeriodProvider>
          <NavigationProgressProvider>
            <AcademicsProvider>
              <AdmissionsProvider>
                <AssignmentsProvider>
                  <AnnouncementsProvider>
                    <AttendanceProvider>
                      <EventsProvider>
                        <FinanceProvider>
                          <DashboardLayoutProvider>{children}</DashboardLayoutProvider>
                        </FinanceProvider>
                      </EventsProvider>
                    </AttendanceProvider>
                  </AnnouncementsProvider>
                </AssignmentsProvider>
              </AdmissionsProvider>
            </AcademicsProvider>
          </NavigationProgressProvider>
        </AcademicPeriodProvider>
      </ActionFeedbackProvider>
    </SchoolSettingsProvider>
  );
}
