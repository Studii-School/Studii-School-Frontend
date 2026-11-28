import assert from "node:assert/strict";
import test from "node:test";
import { schoolClassSummaries } from "../src/features/super-admin/school-class-summaries.ts";

test("school class summaries include only the selected school's aggregate data", () => {
  const response = { data: { classes: [
    { id: "a", schoolId: "school-a", name: "JSS 1", section: "Gold", studentCount: 0, students: [{ id: "student-private", name: "Private Student" }] },
    { id: "b", schoolId: "school-b", name: "JSS 2", studentCount: 9 },
    { id: "c", schoolId: "school-a", name: "JSS 3", _count: { students: 12 } },
    { id: "d", schoolId: "school-a", name: "SS 1" },
  ] } };

  const summaries = schoolClassSummaries(response, "school-a");
  assert.deepEqual(summaries.map((item) => [item.name, item.studentCount]), [
    ["JSS 1 Gold", 0], ["JSS 3", 12], ["SS 1", null],
  ]);
  assert.equal(JSON.stringify(summaries).includes("Private Student"), false);
  assert.equal(JSON.stringify(summaries).includes("student-private"), false);
});
