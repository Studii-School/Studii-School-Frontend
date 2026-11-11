export function audienceIsChecked<T extends string>(
  values: T[],
  value: T,
  everyone: T,
  roleValues: T[],
) {
  return values.includes(value) || (value !== everyone && roleValues.includes(value) && values.includes(everyone));
}

export function toggleAudience<T extends string>(
  values: T[],
  value: T,
  everyone: T,
  roleValues: T[],
  classesValue: T,
): T[] {
  if (value === everyone) return values.includes(everyone) ? [] : [everyone];
  if (value === classesValue) {
    if (values.includes(classesValue)) return values.filter((item) => item !== classesValue);
    return values.includes(everyone) ? [classesValue] : [...values, classesValue];
  }

  const expanded = values.includes(everyone)
    ? [...roleValues, ...values.filter((item) => item !== everyone && !roleValues.includes(item))]
    : values;
  const next = expanded.includes(value)
    ? expanded.filter((item) => item !== value)
    : [...expanded, value];
  return roleValues.every((item) => next.includes(item)) ? [everyone] : next;
}
