export function parseFormattedNumber(value: string) {
  const normalized = value.replace(/[^\d.]/g, "");
  const parts = normalized.split(".");
  const whole = parts[0] ?? "";
  const decimal = parts.length > 1 ? `.${parts.slice(1).join("")}` : "";
  return Number(`${whole}${decimal}` || 0);
}

export function formatNumberInput(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(value);
}
