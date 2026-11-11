import assert from "node:assert/strict";
import test from "node:test";
import { audienceIsChecked, toggleAudience } from "../src/lib/audience-selection.ts";

const roles = ["Students", "Teachers", "Parents", "Staff"] as const;
type Audience = "Everyone" | typeof roles[number] | "Selected Classes";
const toggle = (values: Audience[], value: Audience) => toggleAudience(values, value, "Everyone", [...roles], "Selected Classes");

test("everyone selects each role and unchecking a role clears everyone", () => {
  const everyone = toggle([], "Everyone");
  assert.deepEqual(everyone, ["Everyone"]);
  for (const role of roles) assert.equal(audienceIsChecked(everyone, role, "Everyone", [...roles]), true);
  const withoutParents = toggle(everyone, "Parents");
  assert.equal(withoutParents.includes("Everyone"), false);
  assert.equal(withoutParents.includes("Parents"), false);
  assert.deepEqual(withoutParents, ["Students", "Teachers", "Staff"]);
});

test("checking the last role restores everyone", () => {
  assert.deepEqual(toggle(["Students", "Teachers", "Parents"], "Staff"), ["Everyone"]);
});

test("selected classes remains a separate target", () => {
  assert.deepEqual(toggle(["Everyone"], "Selected Classes"), ["Selected Classes"]);
  assert.equal(audienceIsChecked(["Everyone"], "Selected Classes", "Everyone", [...roles]), false);
});
