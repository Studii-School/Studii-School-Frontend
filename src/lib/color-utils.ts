export const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

const NAMED_THEME_COLORS: Record<string, string> = {
  amber: "#D97706",
  black: "#000000",
  blue: "#2563EB",
  cyan: "#0891B2",
  emerald: "#0F766E",
  fuchsia: "#C026D3",
  gold: "#CA8A04",
  gray: "#4B5563",
  green: "#15803D",
  grey: "#4B5563",
  indigo: "#4338CA",
  lime: "#65A30D",
  navy: "#1E3A8A",
  orange: "#EA580C",
  pink: "#DB2777",
  purple: "#7E22CE",
  red: "#DC2626",
  rose: "#E11D48",
  royal: "#4338CA",
  "royal blue": "#4169E1",
  sky: "#0284C7",
  slate: "#475569",
  teal: "#0F766E",
  violet: "#7C3AED",
  white: "#FFFFFF",
  yellow: "#CA8A04",
};

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

/** Converts a six-digit hex value or a friendly colour name to backend-safe hex. */
export function resolveColor(value: string): string | null {
  const trimmed = value.trim();
  if (isValidHexColor(trimmed)) return trimmed.toUpperCase();
  return NAMED_THEME_COLORS[trimmed.toLowerCase()] ?? null;
}

export function getContrastText(hexColor: string): "#FFFFFF" | "#172033" {
  if (!isValidHexColor(hexColor)) return "#172033";
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.58 ? "#172033" : "#FFFFFF";
}
