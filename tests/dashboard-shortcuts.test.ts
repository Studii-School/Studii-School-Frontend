import assert from "node:assert/strict";
import test from "node:test";
import { mostVisitedPages, pageVisitsKey, readPageVisits, recordPageVisit, visitedNavigationPage } from "../src/features/navigation-progress/frequent-pages.ts";
import { getWidgetDefinition, getWidgetsForRole } from "../src/features/dashboard-customisation/dashboard-widget-registry.ts";
import type { NavigationItem } from "../src/types/navigation.ts";

const navigation: NavigationItem[] = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/teacher/classes", label: "My classes", icon: "classes" },
  { href: "/teacher/attendance", label: "Attendance", icon: "attendance" },
  { href: "/teacher/results", label: "Results", icon: "results" },
  { href: "/teacher/assignments", label: "Assignments", icon: "assignments" },
];

test("shortcuts rank actual visits, use recency for ties, and stop at three", () => {
  let visits = {};
  for (const [href, time] of [
    ["/teacher/classes", 1], ["/teacher/classes", 2],
    ["/teacher/attendance", 3], ["/teacher/results", 4], ["/teacher/assignments", 5],
  ] as const) visits = recordPageVisit(visits, href, time);
  assert.deepEqual(mostVisitedPages(visits, navigation).map((page) => page.href), [
    "/teacher/classes", "/teacher/assignments", "/teacher/results",
  ]);
});

test("a fresh account has no invented frequently visited pages", () => {
  assert.deepEqual(mostVisitedPages({}, navigation), []);
});

test("history survives serialization and continues counting", () => {
  const saved = JSON.stringify(recordPageVisit({}, "/teacher/classes", 1));
  const restored = recordPageVisit(readPageVisits(saved), "/teacher/classes", 2);
  assert.deepEqual(restored["/teacher/classes"], { count: 2, lastOpened: 2 });
});

test("accounts, schools, and roles have separate history keys", () => {
  const keys = [
    pageVisitsKey("school-a", "user-a", "Teacher"),
    pageVisitsKey("school-a", "user-b", "Teacher"),
    pageVisitsKey("school-b", "user-a", "Teacher"),
    pageVisitsKey("school-a", "user-a", "Parent"),
  ];
  assert.equal(new Set(keys).size, 4);
  assert.notEqual(pageVisitsKey("a:b", "c", "Teacher"), pageVisitsKey("a", "b:c", "Teacher"));
});

test("dashboard, disabled modules, and other roles never become shortcuts", () => {
  const visits = Object.fromEntries([
    "/teacher/dashboard", "/teacher/results", "/admin/students", "/teacher/classes",
  ].map((href) => [href, { count: 20, lastOpened: 1 }]));
  const allowed = navigation.filter((item) => item.href !== "/teacher/results");
  assert.deepEqual(mostVisitedPages(visits, allowed).map((page) => page.href), ["/teacher/classes"]);
});

test("detail routes resolve to an available module without exposing record URLs", () => {
  assert.equal(visitedNavigationPage("/teacher/classes/class-123", navigation)?.href, "/teacher/classes");
  assert.equal(visitedNavigationPage("/teacher/dashboard", navigation), undefined);
  assert.equal(visitedNavigationPage("/teacher/classes-other", navigation), undefined);
  assert.equal(visitedNavigationPage("/admin/classes", navigation), undefined);
  assert.equal(visitedNavigationPage("/teacher/results", navigation.filter((page) => page.icon !== "results")), undefined);
});

test("the most specific available page wins when navigation paths are nested", () => {
  assert.equal(visitedNavigationPage("/teacher/classes/reports/weekly", [
    ...navigation, { href: "/teacher/classes/reports", label: "Reports", icon: "reports" },
  ])?.href, "/teacher/classes/reports");
});

test("malformed or corrupt browser history is ignored", () => {
  for (const raw of ["broken", "null", "[]", "42"]) assert.deepEqual(readPageVisits(raw), {});
  assert.deepEqual(readPageVisits(JSON.stringify({
    "/teacher/classes": { count: 3, lastOpened: 2 },
    "/teacher/results": { count: -1, lastOpened: 2 },
    "/teacher/attendance": { count: "9", lastOpened: 2 },
    "https://example.com": { count: 10, lastOpened: 2 },
    "//example.com": { count: 10, lastOpened: 2 },
  })), { "/teacher/classes": { count: 3, lastOpened: 2 } });
});

test("all school roles retain useful widgets without tables or placeholder cards", () => {
  for (const role of ["admin", "teacher", "student", "parent"] as const) {
    const widgets = getWidgetsForRole(role);
    assert(widgets.filter((widget) => widget.defaultVisible).length >= 4);
    assert(widgets.every((widget) => widget.displayType !== "TABLE"));
    assert(widgets.some((widget) => widget.id === `${role}-announcements`));
    assert(widgets.some((widget) => widget.id === `${role}-events`));
  }
  for (const [role, id] of [
    ["admin", "admin-recent-payments"], ["admin", "admin-admissions"],
    ["admin", "admin-quick-actions"], ["admin", "admin-insights"],
    ["teacher", "teacher-classes"], ["teacher", "teacher-student-attention"],
    ["student", "student-timetable"], ["student", "student-payment-history"],
    ["parent", "parent-recent-payments"], ["parent", "parent-payment-plan"],
  ] as const) assert.equal(getWidgetDefinition(role, id), undefined);
  assert.equal(getWidgetDefinition("student", "student-assignments")?.displayType, "METRIC");
});
