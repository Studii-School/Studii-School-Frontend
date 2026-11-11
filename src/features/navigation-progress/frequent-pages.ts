import type { NavigationItem } from "../../types/navigation";

export type PageVisits = Record<string, { count: number; lastOpened: number }>;

export function pageVisitsKey(schoolId: string, userId: string, role: string) {
  return `schoolos:page-visits:v1:${JSON.stringify([schoolId, userId, role])}`;
}

export function readPageVisits(raw: string): PageVisits {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([href, entry]) =>
      href.startsWith("/") && !href.startsWith("//") &&
      entry && typeof entry === "object" &&
      Number.isSafeInteger(entry.count) && entry.count > 0 &&
      Number.isSafeInteger(entry.lastOpened) && entry.lastOpened >= 0,
    ).slice(0, 100));
  } catch {
    return {};
  }
}

export function visitedNavigationPage(pathname: string, navigation: NavigationItem[]) {
  return navigation
    .filter((item) => item.icon !== "dashboard" &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function recordPageVisit(visits: PageVisits, href: string, now: number): PageVisits {
  return {
    ...visits,
    [href]: { count: Math.min((visits[href]?.count ?? 0) + 1, Number.MAX_SAFE_INTEGER), lastOpened: now },
  };
}

export function mostVisitedPages(visits: PageVisits, navigation: NavigationItem[], limit = 3) {
  return navigation
    .filter((item) => item.icon !== "dashboard" && visits[item.href]?.count > 0)
    .sort((a, b) => visits[b.href].count - visits[a.href].count ||
      visits[b.href].lastOpened - visits[a.href].lastOpened || a.href.localeCompare(b.href))
    .slice(0, limit);
}
