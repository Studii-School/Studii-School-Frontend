import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const sessionId = "11111111-1111-4111-8111-111111111111";
const termId = "22222222-2222-4222-8222-222222222222";
const sourcePath = new URL("../src/features/academic-period/academic-period.repository.ts", import.meta.url);

function repositoryWithBackend({ applyDatePatch = true, applyActivation = true } = {}) {
  const calls = [];
  const session = {
    id: sessionId,
    name: "2026/2027",
    status: "ACTIVE",
    startDate: "2026-09-01",
    endDate: "2027-07-31",
    terms: [],
  };
  const term = {
    id: termId,
    sessionId,
    name: "FIRST",
    status: "CLOSED",
    startDate: "2026-09-01T00:00:00.000Z",
    endDate: "2026-12-01T00:00:00.000Z",
  };
  const apiRequest = async (url, options = {}) => {
    calls.push({ url, method: options.method ?? "GET", body: options.body && JSON.parse(options.body) });
    if (url === "/academic-sessions") return [session];
    if (url === `/academic-sessions/${sessionId}` && options.method === "PATCH") {
      Object.assign(session, JSON.parse(options.body));
      return session;
    }
    if (url === `/academic-terms?sessionId=${sessionId}`) return [term];
    if (url === `/academic-terms/${termId}` && options.method === "PATCH") {
      if (applyDatePatch) {
        term.startDate = new Date(JSON.parse(options.body).startDate).toISOString();
        term.endDate = new Date(JSON.parse(options.body).endDate).toISOString();
      }
      return term;
    }
    if (url === `/academic-terms/${termId}/activate` && options.method === "PATCH") {
      if (applyActivation) term.status = "ACTIVE";
      return term;
    }
    throw new Error(`Unexpected API request: ${options.method ?? "GET"} ${url}`);
  };
  const source = readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const moduleObject = { exports: {} };
  const requireStub = (id) => {
    if (id === "@/lib/api") return { apiRequest, readStoredToken: () => "test-token" };
    if (id === "@/lib/auth") return { readStoredUser: () => ({ schoolId: "school-1" }) };
    if (id === "./academic-period.types") return {
      academicTermNameFromLabel: (value) => value === "SECOND" ? "SECOND" : value === "THIRD" ? "THIRD" : "FIRST",
    };
    throw new Error(`Unexpected module: ${id}`);
  };
  new Function("require", "module", "exports", compiled)(requireStub, moduleObject, moduleObject.exports);
  return { repository: moduleObject.exports.academicPeriodRepository, calls };
}

const input = {
  sessionName: "2026/2027",
  sessionStartDate: "2026-09-01",
  sessionEndDate: "2027-07-31",
  termName: "FIRST",
  termStartDate: "2026-09-10",
  termEndDate: "2026-12-15",
  makeCurrent: true,
};

test("saving an existing term updates backend dates before activating it", async () => {
  const { repository, calls } = repositoryWithBackend();
  const saved = await repository.upsertTerm(input);
  assert.equal(saved.term.startDate, input.termStartDate);
  assert.equal(saved.term.endDate, input.termEndDate);
  const current = await repository.getActiveTerm();
  assert.equal(current?.term.startDate, input.termStartDate);
  assert.equal(current?.term.endDate, input.termEndDate);
  assert.deepEqual(calls.filter((call) => call.method === "PATCH").map((call) => call.url), [
    `/academic-terms/${termId}`,
    `/academic-terms/${termId}/activate`,
  ]);
  assert.deepEqual(calls.find((call) => call.url === `/academic-terms/${termId}`).body, {
    startDate: input.termStartDate,
    endDate: input.termEndDate,
  });
});

test("a backend that ignores the date update cannot report a successful save", async () => {
  const { repository } = repositoryWithBackend({ applyDatePatch: false });
  await assert.rejects(repository.upsertTerm(input), /server did not save the term dates/);
});

test("a backend that leaves the term inactive cannot report a successful save", async () => {
  const { repository } = repositoryWithBackend({ applyActivation: false });
  await assert.rejects(repository.upsertTerm(input), /server did not set this term as current/);
});

test("saving a later term expands an existing session to include its dates", async () => {
  const { repository, calls } = repositoryWithBackend();
  await repository.upsertTerm({
    ...input,
    sessionStartDate: "2026-01-01",
    sessionEndDate: "2027-12-31",
  });
  assert.deepEqual(calls.find((call) => call.url === `/academic-sessions/${sessionId}`).body, {
    startDate: "2026-01-01",
    endDate: "2027-12-31",
  });
});
