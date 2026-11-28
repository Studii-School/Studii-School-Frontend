"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut, LockKeyhole } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { PortalShell } from "@/components/layout/portal-shell";
import { FrequentPagesProvider } from "@/features/navigation-progress/frequent-pages-provider";
import { useAcademicPeriod } from "@/features/academic-period/academic-period-context";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { Button } from "@/components/ui/button";
import { AUTH_SESSION_EVENT, getProfile, getTokenExpiryMs, logout, readStoredToken, type AuthUser } from "@/lib/api";
import { displayUser, readStoredUser, routeForRole } from "@/lib/auth";
import { isSuperAdminPreview } from "@/lib/super-admin-preview";
import { isSchoolSetupRoute, isSchoolUnderReview } from "@/lib/school-review";
import { SchoolReviewContext } from "@/features/school-review/school-review-context";
import { cacheSchoolFeatureSettings, disabledFeatureForPath, featureLabel, filterNavigationByFeatures, loadSchoolFeatureSettings, normaliseFeatureSettings, resolveUserSchoolId, SCHOOL_FEATURES_EVENT } from "@/lib/school-features";
import type { NavigationItem, User } from "@/types";

const MAX_TIMEOUT_MS = 2_147_483_647;
type PortalSession = { ready: boolean; token: string | null; user: AuthUser | null };
const INITIAL_SESSION: PortalSession = { ready: false, token: null, user: null };

function readSession(): PortalSession {
  if (typeof window === "undefined") return { ready: false, token: null, user: null };
  return { ready: true, token: readStoredToken(), user: readStoredUser() };
}

export function AuthenticatedPortalShell({ children, navigation, fallbackUser, allowedRoles = [fallbackUser.role], allowLocalPreview = false }: { children: React.ReactNode; navigation: NavigationItem[]; fallbackUser: User; allowedRoles?: User["role"][]; allowLocalPreview?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(INITIAL_SESSION);
  const [profileUser, setProfileUser] = useState<AuthUser | null>(null);
  const [reviewActionMessage, setReviewActionMessage] = useState("");
  const preview = allowLocalPreview && session.ready && isSuperAdminPreview();
  const user = useMemo(() => displayUser(preview ? null : profileUser ?? session.user, fallbackUser), [fallbackUser, preview, profileUser, session.user]);
  const schoolId = resolveUserSchoolId(user);
  const period = useAcademicPeriod();
  const { settings } = useSchoolSettings();
  const isAdmin = user.role === "Administrator";
  const reviewPending = isAdmin && isSchoolUnderReview(profileUser?.school?.status ?? session.user?.school?.status);
  const hasSelectedTerm = Boolean(period.selectedSession && period.selectedTerm);
  const isHistoricalReadOnly = user.role !== "Super Administrator" && hasSelectedTerm && !period.scope.isCurrentPeriod && !(isAdmin && settings.historicalEditingEnabled);
  const [featureSettings, setFeatureSettings] = useState(() => normaliseFeatureSettings(user.features));

  useEffect(() => {
    const refreshSession = () => setSession(readSession());
    const refreshFromStorage = (event: StorageEvent) => {
      if (event.key === "accessToken" || event.key === "user") refreshSession();
    };

    refreshSession();
    window.addEventListener(AUTH_SESSION_EVENT, refreshSession);
    window.addEventListener("storage", refreshFromStorage);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, refreshSession);
      window.removeEventListener("storage", refreshFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!session.token) return;
    const expiresAt = getTokenExpiryMs(session.token);
    if (expiresAt === null) return;

    let timeout: number;
    const expireWhenDue = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        logout({ reason: "expired" });
        router.replace("/login");
        return;
      }
      timeout = window.setTimeout(expireWhenDue, Math.min(remaining, MAX_TIMEOUT_MS));
    };

    expireWhenDue();
    return () => window.clearTimeout(timeout);
  }, [router, session.token]);

  useEffect(() => {
    if (!session.ready) return;
    if (preview) return;
    if (!session.token || !session.user || session.token === "development-token") {
      if (session.token || session.user) logout({ reason: "invalid" });
      router.replace("/login");
      return;
    }
    const role = displayUser(session.user, fallbackUser).role;
    if (!allowedRoles.includes(role)) router.replace(routeForRole(role));
  }, [allowedRoles, fallbackUser, preview, router, session]);

  useEffect(() => {
    if (!session.ready || !session.token || !session.user || session.token === "development-token") return;
    let mounted = true;
    const refreshProfile = () => getProfile()
      .then((freshUser) => {
        if (!mounted) return;
        setProfileUser(freshUser);
        localStorage.setItem("user", JSON.stringify(freshUser));
        const freshSchoolId = resolveUserSchoolId(freshUser);
        if (freshUser.features && freshSchoolId !== "platform") {
          const settings = normaliseFeatureSettings(freshUser.features);
          cacheSchoolFeatureSettings(freshSchoolId, settings);
          setFeatureSettings(settings);
        }
      })
      .catch(() => {
        if (!mounted) return;
        if (session.user?.features) setFeatureSettings(normaliseFeatureSettings(session.user.features));
      });
    void refreshProfile();
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void refreshProfile(); }, 30000);
    window.addEventListener("focus", refreshProfile);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshProfile);
    };
  }, [session.ready, session.token, session.user]);

  useEffect(() => {
    const refresh = () => setFeatureSettings(loadSchoolFeatureSettings(schoolId));
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(SCHOOL_FEATURES_EVENT, refresh as EventListener);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(SCHOOL_FEATURES_EVENT, refresh as EventListener);
    };
  }, [schoolId]);

  const canRender = session.ready && (preview || (session.token && session.user && session.token !== "development-token" && allowedRoles.includes(user.role)));
  const visibleNavigation = useMemo(() => user.role === "Super Administrator" ? navigation : filterNavigationByFeatures(navigation, featureSettings), [featureSettings, navigation, user.role]);
  const disabledFeature = user.role === "Super Administrator" ? null : disabledFeatureForPath(pathname, navigation, featureSettings);
  const blockHistoricalWrite = isHistoricalReadOnly;
  const preventHistoricalSubmit = (event: React.FormEvent<HTMLDivElement>) => {
    if (!blockHistoricalWrite) return;
    const target = event.target;
    if (target instanceof HTMLFormElement) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const preventHistoricalFormChange = (event: React.ChangeEvent<HTMLDivElement>) => {
    if (!blockHistoricalWrite || !(event.target instanceof Element) || !event.target.closest("form")) return;
    if (event.target.closest("[data-historical-editing-toggle]")) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const preventHistoricalAction = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!blockHistoricalWrite || !(event.target instanceof Element)) return;
    const action = event.target.closest("button, [role='button'], input[type='submit']");
    if (!action) return;
    const label = [
      action.textContent,
      action.getAttribute("aria-label"),
      action.getAttribute("title"),
      action.getAttribute("data-action"),
    ].filter(Boolean).join(" ").toLowerCase();
    const isFilterControl = /\b(filter|search)\b/.test(label) && !/\b(approve|archive|assign|correct|create|deactivate|delete|disable|edit|enable|import|lock|mark|move|pay|publish|record|reassign|reopen|restore|save|send|submit|suspend|unarchive|unpublish|update|upload)\b/.test(label);
    if (!isFilterControl && /\b(activate|add|approve|archive|assign|correct|create|deactivate|delete|disable|edit|enable|import|lock|mark|move|pay|publish|record|reassign|remove|reopen|restore|save|send|submit|suspend|unarchive|unpublish|update|upload)\b/.test(label)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const preventReviewAction = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!reviewPending || !(event.target instanceof Element)) return;
    const link = event.target.closest("a[href]");
    const href = link?.getAttribute("href")?.split("?")[0] ?? "";
    const action = event.target.closest("button, [role='button'], input[type='submit']");
    const label = [action?.textContent, action?.getAttribute("aria-label")].filter(Boolean).join(" ");
    const onPeoplePage = /^\/admin\/(students|staff|admissions)(\/|$)/.test(pathname);
    if (isSchoolSetupRoute(href) || (onPeoplePage && /\b(add|create|import|enrol|enroll|new)(?:\s+as)?\s+(student|staff|teacher)|student record/i.test(label))) {
      event.preventDefault();
      event.stopPropagation();
      setReviewActionMessage("Student and staff setup becomes available after SchoolOS approves your profile.");
    }
  };

  if (!canRender) return <div className="flex min-h-screen items-center justify-center text-sm text-muted">Loading portal...</div>;

  return (
    <FrequentPagesProvider
      userId={preview ? "local-preview" : session.user?.id ?? session.user?.email}
      schoolId={schoolId}
      role={user.role}
      navigation={visibleNavigation}
    >
      <SchoolReviewContext.Provider value={reviewPending}><PortalShell navigation={visibleNavigation} user={user} historicalReadOnly={isHistoricalReadOnly}>
        {preview && <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm" role="status"><strong>Local Super Administrator preview.</strong> This screen shows sample data. Changes are disabled and nothing is sent to the backend.</div>}
        {reviewPending && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="status"><div><strong>School profile under review</strong><p className="mt-1">You can edit your school profile. Student and staff setup will open after approval.</p>{reviewActionMessage && <p className="mt-1 font-medium">{reviewActionMessage}</p>}</div><Link href="/admin/settings?section=profile" className="font-semibold underline">Edit school profile</Link></div>}
        <div
          onClickCapture={(event) => { preventReviewAction(event); if (!event.isPropagationStopped()) preventHistoricalAction(event); }}
          onChangeCapture={preventHistoricalFormChange}
          onSubmitCapture={preventHistoricalSubmit}
        >
          {reviewPending && isSchoolSetupRoute(pathname) ? <div className="rounded-xl border bg-surface p-6"><h1 className="text-xl font-semibold">School profile under review</h1><p className="mt-2 text-sm text-muted">Student and staff setup opens after your profile is approved. You can update your school details while you wait.</p><Link href="/admin/settings?section=profile" className="mt-4 inline-block font-semibold text-primary underline">Edit school profile</Link></div> : disabledFeature ? <FeatureUnavailable feature={disabledFeature} /> : children}
        </div>
        {user.status === "SUSPENDED" && <SuspendedAccount />}
      </PortalShell></SchoolReviewContext.Provider>
    </FrequentPagesProvider>
  );
}

function SuspendedAccount() {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[8px] border bg-surface p-6 text-center shadow-xl">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
          <LockKeyhole size={22} />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Account suspended</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your school administrator has suspended this account. You can still sign out from here.
        </p>
        <Button
          className="mt-5"
          onClick={() => {
            logout({ reason: "manual" });
            router.replace("/login");
          }}
        >
          <LogOut size={16} />
          Logout
        </Button>
      </div>
    </div>
  );
}

function FeatureUnavailable({ feature }: { feature: NonNullable<ReturnType<typeof disabledFeatureForPath>> }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-[8px] border bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-muted text-muted">
          <LockKeyhole size={22} />
        </span>
        <h1 className="mt-5 text-xl font-semibold">{featureLabel(feature)} is not available</h1>
        <p className="mt-2 text-sm leading-6 text-muted">This module is currently unavailable.</p>
      </div>
    </div>
  );
}
