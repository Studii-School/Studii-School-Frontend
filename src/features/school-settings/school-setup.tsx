"use client";

import { ArrowRight, Check, Circle, GraduationCap, Upload } from "lucide-react";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { useAcademics } from "@/features/academics/academics-context";
import { useSchoolSettings } from "./school-settings-context";
import { useSchoolUnderReview } from "@/features/school-review/school-review-context";

export function SchoolSetup({ compact = false }: { compact?: boolean }) {
  const period = useAcademicPeriod();
  const academics = useAcademics();
  const { settings, isLoading: settingsLoading } = useSchoolSettings();
  const underReview = useSchoolUnderReview();
  const activeSession = period.sessions.find((session) => session.status === "ACTIVE");
  const activeTerm = activeSession?.terms.find((term) => term.status === "ACTIVE");
  const hasPeriod = Boolean(activeSession && activeTerm);
  const viewingActivePeriod = hasPeriod && period.scope.isCurrentPeriod;
  const hasClasses = academics.state.classes.some((item) =>
    item.status === "ACTIVE" && settings.schoolLevels.includes(item.level),
  );
  const hasStudents = academics.state.students.some((student) => student.schoolId === period.scope.schoolId);
  const complete = viewingActivePeriod && hasClasses && hasStudents;
  const loading = period.isLoading || settingsLoading || (hasPeriod && academics.isLoading);
  const loadError = period.error || (viewingActivePeriod ? academics.error : undefined);

  if (compact && (underReview || loading || loadError || (hasPeriod && (!viewingActivePeriod || (hasClasses && hasStudents))))) return null;

  if (underReview) return <Card className="max-w-3xl p-5 sm:p-7"><h1 className="text-lg font-semibold">Your school profile is under review</h1><p className="mt-2 text-sm text-muted">You can edit your school details while you wait. Student and staff setup will become available after approval.</p><Link className={buttonStyles("outline") + " mt-4"} href="/admin/settings?section=profile">Edit school profile</Link></Card>;

  const nextAction = complete
    ? { href: "/admin/dashboard", label: "Go to dashboard" }
    : !hasPeriod
    ? { href: "/admin/settings?section=academics", label: "Set up academic period" }
    : !viewingActivePeriod
      ? { href: "/admin/settings?section=academics", label: "Open academic settings" }
      : !hasClasses
        ? { href: "/admin/settings?section=classes", label: "Set up classes" }
        : { href: "/admin/students/new", label: "Add a student" };

  return (
    <>
      {!compact && (
        <PageHeader
          title="Set up your school"
          description="Set the current term and create classes before bringing in your roster."
          showBack={false}
          action={!complete && <Link className={buttonStyles("outline")} href="/admin/dashboard">Go to dashboard</Link>}
        />
      )}
      <Card className={compact ? "mb-5 p-5 sm:p-6" : "max-w-3xl p-5 sm:p-7"}>
        {compact ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <GraduationCap size={23} className="mt-1 shrink-0 text-primary" />
              <div>
                <h2 className="font-semibold">Finish setting up your school</h2>
                <p className="mt-1 text-sm text-muted">Next step · {nextAction.label}</p>
              </div>
            </div>
            <Link className={buttonStyles("outline")} href="/admin/setup">Continue setup <ArrowRight size={16} /></Link>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Setup checklist</h2>
            {loading ? <p className="mt-3 text-sm text-muted" role="status">Checking your setup…</p> : loadError ? (
              <p className="mt-3 text-sm text-danger" role="alert">{loadError}</p>
            ) : (
              <>
                {hasPeriod && !viewingActivePeriod && (
                  <p className="mt-3 rounded-lg border bg-surface-muted p-3 text-sm">
                    You’re viewing a different term. Select the current session and term in the sidebar to continue.
                  </p>
                )}
                <ol className="mt-4 divide-y">
                  {[
                    { label: "School workspace created", description: settings.name, done: true },
                    { label: "Set your academic session and term", description: hasPeriod ? activeSession?.name : "Choose the current academic year, term and dates.", done: hasPeriod },
                    { label: "Create your classes", description: "Set up the classes your students will join.", done: viewingActivePeriod && hasClasses },
                    { label: "Add your students", description: "Enter one student or upload an existing class list.", done: viewingActivePeriod && hasStudents },
                  ].map(({ label, description, done }) => (
                    <li key={label} className="flex items-start gap-3 py-4">
                      {done ? <Check className="mt-0.5 shrink-0 text-success" size={19} /> : <Circle className="mt-0.5 shrink-0 text-muted" size={19} />}
                      <div>
                        <p className="text-sm font-semibold">{label}<span className="sr-only"> · {done ? "Complete" : "To do"}</span></p>
                        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link className={buttonStyles()} href={nextAction.href}>{nextAction.label}<ArrowRight size={16} /></Link>
                  {viewingActivePeriod && hasClasses && !complete && (
                    <Link className={buttonStyles("outline")} href="/admin/students/import"><Upload size={16} />Import a class list</Link>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </Card>
    </>
  );
}
