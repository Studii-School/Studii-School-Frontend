"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AUTH_SESSION_EVENT } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
import { getContrastText, isValidHexColor } from "@/lib/color-utils";
import { defaultSchoolSettings } from "./school-settings.defaults";
import { getSchoolSettings, resetSchoolSettings, saveSchoolSettings } from "./school-settings.storage";
import { SchoolSettingsContext } from "./school-settings-context";
import type { SchoolSettings } from "./school-settings.types";

function normalizeSettings(settings: SchoolSettings): SchoolSettings {
  return {
    ...defaultSchoolSettings,
    ...settings,
    schoolLevels: settings.schoolLevels?.length
      ? settings.schoolLevels
      : defaultSchoolSettings.schoolLevels,
    branding: {
      ...defaultSchoolSettings.branding,
      ...settings.branding,
    },
  };
}

function applyBranding(settings: SchoolSettings) {
  const root = document.documentElement;
  const { primaryColor, secondaryColor, accentColor } = normalizeSettings(settings).branding;
  if (isValidHexColor(primaryColor)) { root.style.setProperty("--school-primary", primaryColor); root.style.setProperty("--school-primary-foreground", getContrastText(primaryColor)); }
  if (isValidHexColor(secondaryColor)) { root.style.setProperty("--school-secondary", secondaryColor); root.style.setProperty("--school-secondary-foreground", getContrastText(secondaryColor)); }
  if (isValidHexColor(accentColor)) { root.style.setProperty("--school-accent", accentColor); root.style.setProperty("--school-accent-foreground", getContrastText(accentColor)); }
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]'); if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); } icon.href = settings.faviconUrl ?? "/favicon.ico";
}

export function SchoolSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(defaultSchoolSettings); const [savedSettings, setSavedSettings] = useState(defaultSchoolSettings);
  const [isLoading, setIsLoading] = useState(true); const [isSaving, setIsSaving] = useState(false);
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await getSchoolSettings(undefined, readStoredUser());
      setSettings(stored);
      setSavedSettings(stored);
      applyBranding(stored);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { void loadSettings(); }, [loadSettings]);
  useEffect(() => {
    const refresh = () => void loadSettings();
    const refreshFromStorage = (event: StorageEvent) => {
      if (event.key === "accessToken" || event.key === "user") refresh();
    };
    window.addEventListener(AUTH_SESSION_EVENT, refresh);
    window.addEventListener("storage", refreshFromStorage);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, refresh);
      window.removeEventListener("storage", refreshFromStorage);
    };
  }, [loadSettings]);
  const updateSettings = useCallback((next: SchoolSettings | ((current: SchoolSettings) => SchoolSettings)) => { setSettings((current) => { const value = normalizeSettings(typeof next === "function" ? next(current) : next); applyBranding(value); return value; }); }, []);
  const saveSettings = useCallback(async (nextSettings?: SchoolSettings) => { setIsSaving(true); try { const saved = await saveSchoolSettings(nextSettings??settings); setSettings(saved); setSavedSettings(saved); applyBranding(saved); } finally { setIsSaving(false); } }, [settings]);
  const resetSettings = useCallback(async () => { const reset = await resetSchoolSettings(undefined, readStoredUser()); setSettings(reset); setSavedSettings(reset); applyBranding(reset); }, []);
  const value = useMemo(() => ({ settings, updateSettings, saveSettings, resetSettings, refresh: loadSettings, isLoading, isSaving, hasUnsavedChanges: JSON.stringify(settings) !== JSON.stringify(savedSettings) }), [settings, savedSettings, updateSettings, saveSettings, resetSettings, loadSettings, isLoading, isSaving]);
  return <SchoolSettingsContext.Provider value={value}>{children}</SchoolSettingsContext.Provider>;
}
