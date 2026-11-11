import assert from "node:assert/strict";
import test from "node:test";
import { announcementBelongsToPeriod } from "../src/features/announcements/announcements-period-utils.ts";
import { eventBelongsToPeriod } from "../src/features/events/events-period-utils.ts";
import { fromBackendEventAudience, toBackendEventAudience } from "../src/features/events/events-audience.ts";
import type { Announcement } from "../src/features/announcements/announcements.types.ts";
import type { SchoolEvent } from "../src/features/events/events.types.ts";

const scope = { academicSessionId: "2027-session", termId: "first-term", academicSession: "2027/2028", term: "First Term" };

test("school-wide backend announcements are visible without term fields", () => {
  const announcement = { id: "announcement", title: "School update" } as Announcement;
  assert.equal(announcementBelongsToPeriod(announcement, scope), true);
  assert.equal(announcementBelongsToPeriod(announcement, { ...scope, academicSessionId: "2028-session" }), true);
});

test("locally scoped announcements stay in their own term", () => {
  const announcement = { academicSessionId: scope.academicSessionId, termId: scope.termId } as Announcement;
  assert.equal(announcementBelongsToPeriod(announcement, scope), true);
  assert.equal(announcementBelongsToPeriod(announcement, { ...scope, termId: "second-term" }), false);
});

test("backend events use session and term IDs even when labels differ", () => {
  const event = { academicSessionId: scope.academicSessionId, termId: scope.termId, startDate: "2026-10-21" } as SchoolEvent;
  assert.equal(eventBelongsToPeriod(event, scope), true);
  assert.equal(eventBelongsToPeriod(event, { ...scope, academicSessionId: "2028-session" }), false);
});

test("an event returned by the scoped backend request stays visible without period fields", () => {
  const event = { startDate: "2026-10-21", isPublished: true } as SchoolEvent;
  assert.equal(eventBelongsToPeriod(event, scope, true), true);
  assert.equal(eventBelongsToPeriod(event, scope), false);
  assert.equal(eventBelongsToPeriod(event, { ...scope, termId: "" }, true), false);
});

test("explicit event period IDs still prevent cross-term visibility", () => {
  const event = { academicSessionId: scope.academicSessionId, termId: "second-term" } as SchoolEvent;
  assert.equal(eventBelongsToPeriod(event, scope, true), false);
});

test("selected-class event audiences match the backend enum in both directions", () => {
  assert.deepEqual(toBackendEventAudience(["Everyone", "Selected Classes"]), ["Everyone", "Selected_Classes"]);
  assert.deepEqual(fromBackendEventAudience(["Parents", "Selected_Classes"]), ["Parents", "Selected Classes"]);
});
