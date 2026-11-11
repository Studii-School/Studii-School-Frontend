import { getContrastText, resolveColor } from "@/lib/color-utils";
import type { SchoolSettings } from "@/types/school-settings";

export type ThemeChoice = "light" | "dark";

export const USER_THEME_EVENT = "schoolos:user-theme";
const USER_THEME_KEY = "schoolos.theme.preference";
const USER_THEME_PREFIX = "schoolos.theme.preference.";

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string) {
  const color = resolveColor(hex) ?? "#075985";
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((value) => clamp(value).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function mix(hex: string, target: string, weight: number) {
  const source = hexToRgb(hex);
  const destination = hexToRgb(target);
  return rgbToHex({
    r: source.r * (1 - weight) + destination.r * weight,
    g: source.g * (1 - weight) + destination.g * weight,
    b: source.b * (1 - weight) + destination.b * weight,
  });
}

function userThemeKey() {
  if (typeof window === "undefined") return USER_THEME_KEY;
  try {
    const user = JSON.parse(window.localStorage.getItem("user") ?? "null") as { id?: string; email?: string; userId?: string } | null;
    const key = user?.id ?? user?.userId ?? user?.email;
    return key ? `${USER_THEME_PREFIX}${key}` : USER_THEME_KEY;
  } catch {
    return USER_THEME_KEY;
  }
}

export function readUserTheme(): ThemeChoice {
  if (typeof window === "undefined") return "light";
  const value = window.localStorage.getItem(userThemeKey()) ?? window.localStorage.getItem(USER_THEME_KEY);
  return value === "dark" ? "dark" : "light";
}

export function saveUserTheme(theme: ThemeChoice) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(userThemeKey(), theme);
  window.localStorage.setItem(USER_THEME_KEY, theme);
  window.dispatchEvent(new CustomEvent(USER_THEME_EVENT, { detail: theme }));
}

export function themeLabel(theme: ThemeChoice) {
  return theme === "dark" ? "Dark" : "Light";
}

export function applyPortalTheme(settings: SchoolSettings, theme: ThemeChoice) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const primary = resolveColor(settings.branding.primaryColor) ?? "#075985";
  const secondary = resolveColor(settings.branding.secondaryColor) ?? "#0F766E";
  const accent = resolveColor(settings.branding.accentColor) ?? "#F59E0B";
  const dark = theme === "dark";

  const vars: Record<string, string> = {
    "--background": dark ? "#0B1120" : "#FFFFFF",
    "--foreground": dark ? "#E5E7EB" : "#172033",
    "--primary": primary,
    "--primary-hover": mix(primary, dark ? "#FFFFFF" : "#000000", dark ? 0.12 : 0.16),
    "--primary-light": dark ? mix(primary, "#0B1120", 0.68) : mix(primary, "#FFFFFF", 0.86),
    "--secondary": secondary,
    "--secondary-light": dark ? mix(secondary, "#0B1120", 0.72) : mix(secondary, "#FFFFFF", 0.86),
    "--surface": dark ? "#111827" : "#FFFFFF",
    "--surface-muted": dark ? "#1F2937" : "#F8FAFC",
    "--border": dark ? "#334155" : "#E2E8F0",
    "--muted": dark ? "#9CA3AF" : "#64748B",
    "--success": dark ? "#4ADE80" : "#15803D",
    "--warning": dark ? "#FBBF24" : "#B45309",
    "--danger": dark ? "#F87171" : "#B91C1C",
    "--school-primary": primary,
    "--school-primary-foreground": getContrastText(primary),
    "--school-secondary": secondary,
    "--school-secondary-foreground": getContrastText(secondary),
    "--school-accent": accent,
    "--school-accent-foreground": getContrastText(accent),
  };

  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  root.dataset.portalTheme = theme;
}
