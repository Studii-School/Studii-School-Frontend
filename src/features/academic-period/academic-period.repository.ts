import { apiRequest, readStoredToken } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
import { academicTermNameFromLabel, type AcademicSessionRecord, type AcademicTermRecord, type HistoricalSessionInput, type UpsertAcademicTermInput } from "./academic-period.types";

type ListResponse = AcademicSessionRecord[] | Record<string, unknown>;
type TermListResponse = AcademicTermRecord[] | Record<string, unknown>;

function unwrapList<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (!(key in record)) continue;
    const found = unwrapList<T>(record[key], keys);
    if (found.length || Array.isArray(record[key])) return found;
  }
  return [];
}

const unwrap = (value: ListResponse) => unwrapList<AcademicSessionRecord>(value, ["data", "items", "results", "sessions", "academicSessions"]);
const unwrapTerms = (value: TermListResponse) => unwrapList<AcademicTermRecord>(value, ["data", "items", "results", "terms", "academicTerms"]);
export const isUuid = (value?: string) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

function normalizeTerm(term: AcademicTermRecord, sessionId: string): AcademicTermRecord {
  const source = term as AcademicTermRecord & {
    term?: string;
    termName?: string;
    type?: string;
    academicTermId?: string;
    startsAt?: string;
    endsAt?: string;
  };
  const rawName = source.name ?? source.termName ?? source.term ?? source.type;
  return {
    ...term,
    id: source.id ?? source.academicTermId,
    sessionId,
    name: rawName === "FIRST" || rawName === "SECOND" || rawName === "THIRD"
      ? rawName
      : academicTermNameFromLabel(rawName),
    startDate: dateKey(source.startDate ?? source.startsAt),
    endDate: dateKey(source.endDate ?? source.endsAt),
  };
}

function dateKey(value?: string | null) {
  return value?.slice(0, 10) ?? "";
}
const localKey = () => {
  const user = readStoredUser();
  return `studii.academic-period.records.${user?.schoolId ?? user?.school?.id ?? "school"}`;
};

const idPart = () => Math.random().toString(36).slice(2, 9);
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${idPart()}`;

function readLocalSessions() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(localKey()) ?? "[]") as AcademicSessionRecord[];
  } catch {
    return [];
  }
}

function writeLocalSessions(items: AcademicSessionRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(localKey(), JSON.stringify(items));
}

function mergeSessions(primary: AcademicSessionRecord[], fallback: AcademicSessionRecord[]) {
  const byId = new Map<string, AcademicSessionRecord>();
  const keyFor = (item: AcademicSessionRecord) => item.name.trim().toLowerCase() || item.id;
  for (const item of fallback) byId.set(keyFor(item), item);
  for (const item of primary) {
    const key = keyFor(item);
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, item);
      continue;
    }
    const termByName = new Map(existing.terms.map((term) => [term.name, { ...term, sessionId: item.id }]));
    for (const term of item.terms) termByName.set(term.name, term);
    byId.set(key, {
      ...existing,
      ...item,
      status: item.status === "ACTIVE" || existing.status === "ACTIVE" ? "ACTIVE" : item.status || existing.status,
      terms: [...termByName.values()].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    });
  }
  return [...byId.values()].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

function upsertLocalTerm(input: UpsertAcademicTermInput) {
  const sessions = readLocalSessions();
  const sessionKey = input.sessionName.trim().toLowerCase();
  let session = sessions.find((item) => item.name.trim().toLowerCase() === sessionKey);
  if (!session) {
    session = {
      id: makeId("session"),
      name: input.sessionName.trim(),
      status: input.makeCurrent ? "ACTIVE" : "CLOSED",
      startDate: input.sessionStartDate,
      endDate: input.sessionEndDate,
      terms: [],
    };
    sessions.push(session);
  }

  session.name = input.sessionName.trim();
  session.startDate = input.sessionStartDate;
  session.endDate = input.sessionEndDate;
  if (input.makeCurrent) {
    for (const item of sessions) {
      item.status = item.id === session.id ? "ACTIVE" : item.status === "ACTIVE" ? "CLOSED" : item.status;
      item.terms = item.terms.map((term) => ({ ...term, status: "CLOSED" }));
    }
    session.status = "ACTIVE";
  }

  const existing = session.terms.find((item) => item.name === input.termName);
  const nextTerm: AcademicTermRecord = {
    id: existing?.id ?? makeId("term"),
    sessionId: session.id,
    name: input.termName,
    status: input.makeCurrent ? "ACTIVE" : existing?.status ?? "CLOSED",
    startDate: input.termStartDate,
    endDate: input.termEndDate,
  };
  session.terms = [...session.terms.filter((item) => item.id !== nextTerm.id && item.name !== nextTerm.name), nextTerm]
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  writeLocalSessions(sessions);
  return { session, term: nextTerm, sessions };
}

function markLocalTermEnded(sessionId: string, termId: string, endDate: string) {
  const sessions = readLocalSessions();
  let closedTerm: AcademicTermRecord | undefined;
  const next = sessions.map((session) => {
    if (session.id !== sessionId) return session;
    return {
      ...session,
      status: "CLOSED",
      terms: session.terms.map((term) => {
        if (term.id !== termId) return term;
        closedTerm = { ...term, status: "CLOSED", endDate };
        return closedTerm;
      }),
    };
  });
  writeLocalSessions(next);
  return closedTerm;
}

async function fetchRemoteSessions() {
  const remote = unwrap(await apiRequest<ListResponse>("/academic-sessions"));
  return Promise.all(remote.map(async (session) => {
    const embeddedTerms = session.terms ?? (session as AcademicSessionRecord & { academicTerms?: AcademicTermRecord[] }).academicTerms ?? [];
    let terms = embeddedTerms.map((term) => normalizeTerm(term, session.id));
    try {
      const fetched = unwrapTerms(await apiRequest<TermListResponse>(`/academic-terms?sessionId=${encodeURIComponent(session.id)}`));
      if (fetched.length || !terms.length) terms = fetched.map((term) => normalizeTerm(term, session.id));
    } catch (error) {
      if (!terms.length) throw error;
    }
    return { ...session, startDate: dateKey(session.startDate), endDate: dateKey(session.endDate), terms };
  }));
}

export const academicPeriodRepository = {
  async listSessions() {
    const local = readLocalSessions();
    try {
      const hydrated = await fetchRemoteSessions();
      // A successful server response is authoritative. Merging old local IDs here
      // can resurrect pre-migration periods that are not valid UUID records.
      writeLocalSessions(hydrated);
      return hydrated;
    } catch {
      return local;
    }
  },
  async getActiveTerm() {
    const sessions = await fetchRemoteSessions();
    const session = sessions.find((item) => item.status === "ACTIVE" && item.terms.some((term) => term.status === "ACTIVE"))
      ?? sessions.find((item) => item.terms.some((term) => term.status === "ACTIVE"));
    const term = session?.terms.find((item) => item.status === "ACTIVE");
    return session && term ? { session, term } : undefined;
  },
  async importHistory(sessions: HistoricalSessionInput[]) {
    const existing = readLocalSessions();
    const additions = sessions.map((session) => {
      const sessionId = makeId("session");
      return {
        id: sessionId,
        name: session.name,
        status: "CLOSED",
        startDate: session.startDate,
        endDate: session.endDate,
        terms: session.terms.map((term) => ({
          id: makeId("term"),
          sessionId,
          name: term.name,
          status: "CLOSED",
          startDate: term.startDate,
          endDate: term.endDate,
        })),
      } satisfies AcademicSessionRecord;
    });
    writeLocalSessions(mergeSessions(additions, existing));
    try {
      return await apiRequest<{ importedSessions: number; importedTerms: number }>("/academic-sessions/import-history", {
        method: "POST",
        body: JSON.stringify({ sessions }),
      });
    } catch {
      return {
        importedSessions: additions.length,
        importedTerms: additions.reduce((sum, item) => sum + item.terms.length, 0),
      };
    }
  },
  async upsertTerm(input: UpsertAcademicTermInput) {
    if (!input.termStartDate || !input.termEndDate) {
      throw new Error("Term start and end dates are required.");
    }
    if (input.termEndDate <= input.termStartDate) {
      throw new Error("Term end date must be after the start date.");
    }
    if (!readStoredToken()) {
      const local = upsertLocalTerm(input);
      return { session: local.session, term: local.term };
    }

    try {
      let sessions = await fetchRemoteSessions();
      let session = sessions.find(
        (item) => item.name.trim().toLowerCase() === input.sessionName.trim().toLowerCase(),
      );
      const existingSession = Boolean(session);
      if (!session) {
        const startDate = [input.sessionStartDate, input.termStartDate].filter(Boolean).sort()[0];
        const endDate = [input.sessionEndDate, input.termEndDate].filter(Boolean).sort().at(-1);
        session = await apiRequest<AcademicSessionRecord>("/academic-sessions", {
          method: "POST",
          body: JSON.stringify({
            name: input.sessionName.trim(),
            startDate,
            endDate,
          }),
        });
      }

      if (!isUuid(session.id)) throw new Error("The server returned an invalid academic session ID.");
      if (existingSession) {
        const startDate = [session.startDate, input.sessionStartDate, input.termStartDate].filter(Boolean).sort()[0];
        const endDate = [session.endDate, input.sessionEndDate, input.termEndDate].filter(Boolean).sort().at(-1)!;
        if (startDate !== session.startDate || endDate !== session.endDate) {
          await apiRequest<AcademicSessionRecord>(`/academic-sessions/${session.id}`, {
            method: "PATCH",
            body: JSON.stringify({ startDate, endDate }),
          });
        }
      }
      const terms = unwrapTerms(await apiRequest<TermListResponse>(`/academic-terms?sessionId=${encodeURIComponent(session.id)}`));
      let term = terms.find((item) => normalizeTerm(item, session!.id).name === input.termName);
      if (!term) {
        term = await apiRequest<AcademicTermRecord>("/academic-terms", {
          method: "POST",
          body: JSON.stringify({
            name: input.termName,
            sessionId: session.id,
            startDate: input.termStartDate,
            endDate: input.termEndDate,
          }),
        });
      } else if (
        dateKey(term.startDate) !== input.termStartDate ||
        dateKey(term.endDate) !== input.termEndDate
      ) {
        await apiRequest<AcademicTermRecord>(`/academic-terms/${term.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            startDate: input.termStartDate,
            endDate: input.termEndDate,
          }),
        });
      }
      term = normalizeTerm(term, session.id);
      if (!isUuid(term.id)) throw new Error("The server returned an invalid academic term ID.");
      if (input.makeCurrent && (term.status !== "ACTIVE" || session.status !== "ACTIVE")) {
        await apiRequest<AcademicTermRecord>(`/academic-terms/${term.id}/activate`, { method: "PATCH" });
      }

      sessions = await fetchRemoteSessions();
      const savedSession = sessions.find((item) => item.id === session!.id);
      const savedTerm = savedSession?.terms.find((item) => item.id === term!.id);
      if (!savedSession || !savedTerm) throw new Error("The academic period could not be reloaded from the server.");
      if (savedTerm.startDate !== input.termStartDate || savedTerm.endDate !== input.termEndDate) {
        throw new Error("The server did not save the term dates. Please try again.");
      }
      if (input.makeCurrent && savedTerm.status !== "ACTIVE") {
        throw new Error("The server did not set this term as current. Please try again.");
      }
      writeLocalSessions(sessions);
      return { session: savedSession, term: savedTerm };
    } catch (error) {
      throw error instanceof Error ? error : new Error("The academic period could not be saved to the server.");
    }
  },
  async markTermEnded(sessionId: string, termId: string, endDate: string) {
    if (!readStoredToken()) return markLocalTermEnded(sessionId, termId, endDate);
    if (!isUuid(sessionId) || !isUuid(termId)) {
      throw new Error("The selected academic period is not synchronized with the server.");
    }
    try {
      return await apiRequest<AcademicTermRecord>(`/academic-terms/${termId}/close`, { method: "PATCH" });
    } catch (error) {
      throw error instanceof Error ? error : new Error("The academic term could not be closed.");
    }
  },
};
