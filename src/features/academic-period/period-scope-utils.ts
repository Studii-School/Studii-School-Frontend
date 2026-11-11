export type DatePeriodScope = {
  startDate?: string;
  endDate?: string;
  requireStartDate?: boolean;
};

function dateKey(value?: string) {
  return value?.slice(0, 10);
}

function isDateKey(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function dateBelongsToPeriod(value?: string, scope?: DatePeriodScope) {
  const startDate = dateKey(scope?.startDate);
  const endDate = dateKey(scope?.endDate);
  if (scope?.requireStartDate && !isDateKey(startDate)) return false;
  const key = dateKey(value);
  const hasPeriodBoundary = isDateKey(startDate) || isDateKey(endDate);
  if (!isDateKey(key)) return !hasPeriodBoundary;
  if (isDateKey(startDate) && key! < startDate!) return false;
  if (isDateKey(endDate) && key! > endDate!) return false;
  return true;
}
