import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "react-grid-layout/css/styles.css";
import "./globals.css";
import { AppProviders } from "./providers";

const appFont = Plus_Jakarta_Sans({ variable: "--font-app-sans", subsets: ["latin"] });

const themeInitScript = `
(() => {
  const valid = (value) => /^#[0-9A-F]{6}$/i.test(value || "");
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  const rgb = (hex) => {
    const color = valid(hex) ? hex : "#075985";
    return { r: parseInt(color.slice(1, 3), 16), g: parseInt(color.slice(3, 5), 16), b: parseInt(color.slice(5, 7), 16) };
  };
  const hex = ({ r, g, b }) => "#" + [r, g, b].map((value) => clamp(value).toString(16).padStart(2, "0")).join("").toUpperCase();
  const mix = (source, target, weight) => {
    const a = rgb(source), b = rgb(target);
    return hex({ r: a.r * (1 - weight) + b.r * weight, g: a.g * (1 - weight) + b.g * weight, b: a.b * (1 - weight) + b.b * weight });
  };
  const contrast = (color) => {
    const value = rgb(color);
    return ((0.2126 * value.r + 0.7152 * value.g + 0.0722 * value.b) / 255) > 0.58 ? "#172033" : "#FFFFFF";
  };
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const userKey = user && (user.id || user.userId || user.email) ? "schoolos.theme.preference." + (user.id || user.userId || user.email) : "schoolos.theme.preference";
    const storedTheme = localStorage.getItem(userKey) || localStorage.getItem("schoolos.theme.preference");
    const theme = storedTheme === "dark" ? "dark" : "light";
    const primary = "#075985";
    const dark = theme === "dark";
    const secondary = "#0F766E";
    const accent = "#F59E0B";
    const vars = {
      "--background": dark ? "#0B1120" : "#F0F1EF",
      "--foreground": dark ? "#E5E7EB" : "#172033",
      "--primary": primary,
      "--primary-hover": mix(primary, dark ? "#FFFFFF" : "#000000", dark ? 0.12 : 0.16),
      "--primary-light": dark ? mix(primary, "#0B1120", 0.68) : mix(primary, "#FFFFFF", 0.86),
      "--secondary": secondary,
      "--secondary-light": dark ? mix(secondary, "#0B1120", 0.72) : mix(secondary, "#FFFFFF", 0.86),
      "--surface": dark ? "#111827" : "#FAFAF9",
      "--surface-muted": dark ? "#1F2937" : "#E8EAE7",
      "--border": dark ? "#334155" : "#D6D9D4",
      "--muted": dark ? "#9CA3AF" : "#64748B",
      "--success": dark ? "#4ADE80" : "#15803D",
      "--warning": dark ? "#FBBF24" : "#B45309",
      "--danger": dark ? "#F87171" : "#B91C1C",
      "--school-primary": primary,
      "--school-primary-foreground": contrast(primary),
      "--school-secondary": secondary,
      "--school-secondary-foreground": contrast(secondary),
      "--school-accent": accent,
      "--school-accent-foreground": contrast(accent)
    };
    Object.entries(vars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
    document.documentElement.dataset.portalTheme = theme;
  } catch {}
})();
`;

export const metadata: Metadata = {
  title: { default: "SchoolOS", template: "%s | SchoolOS" },
  description: "A simple school operating system by TTechnologies.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body suppressHydrationWarning className={`${appFont.variable} font-sans antialiased`}><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /><AppProviders>{children}</AppProviders></body></html>;
}
