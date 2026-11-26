import assert from "node:assert/strict";
import test from "node:test";
import { verifyAdminPassword } from "../src/lib/api.ts";

const admin = { id: "admin-1", email: "admin@school.test", role: "SCHOOL_ADMIN", schoolId: "school-1" };

function withAuthResponses(loginResponse, run, profile = admin) {
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  const storage = new Map([["accessToken", "active-token"], ["user", JSON.stringify(admin)]]);
  const calls = [];
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.window = {};
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/auth/profile")) return Response.json(profile);
    if (url.endsWith("/auth/login")) return loginResponse;
    throw new Error(`Unexpected request: ${url}`);
  };
  return Promise.resolve()
    .then(() => run({ calls, storage }))
    .finally(() => {
      globalThis.fetch = previousFetch;
      globalThis.localStorage = previousStorage;
      globalThis.window = previousWindow;
    });
}

test("the signed-in administrator can verify without changing the active session", async () => {
  await withAuthResponses(Response.json({ accessToken: "new-token", user: admin }), async ({ calls, storage }) => {
    await verifyAdminPassword("correct-password");
    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.headers.get("Authorization"), "Bearer active-token");
    assert.deepEqual(JSON.parse(calls[1].options.body), { email: admin.email, password: "correct-password" });
    assert.equal(storage.get("accessToken"), "active-token");
  });
});

test("an incorrect password does not replace or clear the session", async () => {
  await withAuthResponses(Response.json({ message: "Invalid credentials" }, { status: 401 }), async ({ storage }) => {
    await assert.rejects(verifyAdminPassword("wrong-password"), /Incorrect password/);
    assert.equal(storage.get("accessToken"), "active-token");
  });
});

test("credentials for a different administrator cannot enable historical editing", async () => {
  await withAuthResponses(Response.json({ accessToken: "other-token", user: { ...admin, id: "admin-2" } }), async ({ storage }) => {
    await assert.rejects(verifyAdminPassword("someone-elses-password"), /signed-in administrator/);
    assert.equal(storage.get("accessToken"), "active-token");
  });
});

test("a non-administrator cannot submit a password", async () => {
  await withAuthResponses(Response.json({ accessToken: "new-token", user: admin }), async ({ calls }) => {
    await assert.rejects(verifyAdminPassword("correct-password"), /Only an administrator/);
    assert.equal(calls.length, 1);
  }, { ...admin, role: "TEACHER" });
});
