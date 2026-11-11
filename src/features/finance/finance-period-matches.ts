export type FinancePeriodIdentity = {
  academicSessionId?: string;
  termId?: string;
  academicSession?: string;
  term?: string;
};

export function matchesFinancePeriod(record: FinancePeriodIdentity, scope: FinancePeriodIdentity) {
  const sessionMatches = (!record.academicSessionId || !scope.academicSessionId || record.academicSessionId === scope.academicSessionId)
    && (!record.academicSession || !scope.academicSession || record.academicSession === scope.academicSession);
  const termMatches = (!record.termId || !scope.termId || record.termId === scope.termId)
    && (!record.term || !scope.term || record.term === scope.term);
  return Boolean(sessionMatches && termMatches);
}
