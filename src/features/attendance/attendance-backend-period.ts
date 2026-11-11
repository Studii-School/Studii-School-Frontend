type BackendPeriodFields = {
  academicSessionId?: string;
  sessionId?: string;
  termId?: string;
};

export function backendAttendancePeriod(
  register: BackendPeriodFields,
  entries: BackendPeriodFields[] = [],
) {
  const entry = entries.find((item) => item.sessionId && item.termId) ?? entries[0];
  const sessionId = register.academicSessionId ?? register.sessionId ?? entry?.sessionId;
  return {
    academicSessionId: sessionId,
    sessionId,
    termId: register.termId ?? entry?.termId,
  };
}
