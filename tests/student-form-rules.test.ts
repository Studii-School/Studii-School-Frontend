import assert from "node:assert/strict";
import test from "node:test";
import { availableSchoolLevels, preferredSchoolLevel, studentRequiredIssues } from "../src/features/students/student-form-rules.ts";

const primary = { id: "p1", status: "ACTIVE", level: "PRIMARY" as const };
const secondary = { id: "s1", status: "ACTIVE", level: "SECONDARY" as const };
const base = {
  firstName: "Ada", lastName: "Okafor", dateOfBirth: "",
  schoolLevel: "PRIMARY" as const, classId: "p1",
  guardianMode: "existing" as const, selectedGuardianIds: ["parent-1"],
  guardianName: "", guardianPhone: "", guardianEmail: "",
};

test("selects the only school type with active classes", () => {
  assert.deepEqual(availableSchoolLevels([primary], ["SECONDARY", "PRIMARY"]), ["PRIMARY"]);
  assert.deepEqual(availableSchoolLevels([primary], ["SECONDARY"]), ["PRIMARY"]);
  assert.equal(preferredSchoolLevel(["PRIMARY"], ["SECONDARY", "PRIMARY"]), "PRIMARY");
  assert.deepEqual(availableSchoolLevels([secondary], ["PRIMARY", "SECONDARY"]), ["SECONDARY"]);
  assert.equal(preferredSchoolLevel(["SECONDARY"], ["PRIMARY", "SECONDARY"]), "SECONDARY");
});

test("uses configured default when both types have classes and leaves no-class schools unselected", () => {
  const levels = availableSchoolLevels([primary, secondary], ["SECONDARY", "PRIMARY"]);
  assert.equal(preferredSchoolLevel(levels, ["SECONDARY", "PRIMARY"]), "SECONDARY");
  assert.equal(preferredSchoolLevel(availableSchoolLevels([], ["SECONDARY", "PRIMARY"]), ["SECONDARY", "PRIMARY"]), "");
});

test("existing and new parent routes each reach three completed required sections", () => {
  assert.deepEqual(studentRequiredIssues(base, [primary], [{ id: "parent-1" }]), [[], [], []]);
  assert.deepEqual(studentRequiredIssues({ ...base, guardianMode: "new", selectedGuardianIds: [], guardianName: "Ngozi Okafor", guardianPhone: "08031234567", guardianEmail: "ngozi@example.test" }, [primary], []), [[], [], []]);
});

test("missing required details and inactive or mismatched classes remain incomplete", () => {
  const issues = studentRequiredIssues({ ...base, firstName: "", schoolLevel: "SECONDARY", guardianMode: "new", selectedGuardianIds: [] }, [primary], []);
  assert.match(issues[0][0], /First name/);
  assert.match(issues[1][0], /active class/);
  assert.match(issues[2][0], /Parent name/);
  assert.ok(studentRequiredIssues(base, [{ ...primary, status: "INACTIVE" }], [{ id: "parent-1" }])[1].length > 0);
});
