"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AUTH_SESSION_EVENT } from "@/lib/api";
import { readStoredUser } from "@/lib/auth";
import { applyPortalTheme, readUserTheme, saveUserTheme, USER_THEME_EVENT, type ThemeChoice } from "@/lib/theme";
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

function applyFavicon(settings: SchoolSettings) {
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]'); if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); } icon.href = settings.faviconUrl ?? "/favicon.ico";
}

export function SchoolSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(defaultSchoolSettings); const [savedSettings, setSavedSettings] = useState(defaultSchoolSettings);
  const [selectedTheme, setSelectedThemeState] = useState<ThemeChoice>("light");
  const [isLoading, setIsLoading] = useState(true); const [isSaving, setIsSaving] = useState(false);
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const backendSettings = await getSchoolSettings(undefined, readStoredUser());
      const stored = normalizeSettings(backendSettings);
      const theme = readUserTheme();
      setSelectedThemeState(theme);
      setSettings(stored);
      setSavedSettings(stored);
      applyPortalTheme(stored, theme);
      applyFavicon(stored);
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
  useEffect(() => {
    const syncThemeChoice = () => {
      const theme = readUserTheme();
      setSelectedThemeState(theme);
      setSettings((current) => {
        applyPortalTheme(current, theme);
        return current;
      });
    };
    window.addEventListener(USER_THEME_EVENT, syncThemeChoice);
    return () => {
      window.removeEventListener(USER_THEME_EVENT, syncThemeChoice);
    };
  }, []);
  const setSelectedTheme = useCallback((theme: ThemeChoice) => {
    setSelectedThemeState(theme);
    saveUserTheme(theme);
    applyPortalTheme(settings, theme);
  }, [settings]);
  const updateSettings = useCallback((next: SchoolSettings | ((current: SchoolSettings) => SchoolSettings)) => { setSettings((current) => { const value = normalizeSettings(typeof next === "function" ? next(current) : next); applyPortalTheme(value, selectedTheme); applyFavicon(value); return value; }); }, [selectedTheme]);
  const saveSettings = useCallback(async (nextSettings?: SchoolSettings) => { setIsSaving(true); try { const input = normalizeSettings(nextSettings ?? settings); const saved = normalizeSettings(await saveSchoolSettings(input)); setSettings(saved); setSavedSettings(saved); applyPortalTheme(saved, selectedTheme); applyFavicon(saved); } finally { setIsSaving(false); } }, [selectedTheme, settings]);
  const resetSettings = useCallback(async () => { const backendReset = await resetSchoolSettings(undefined, readStoredUser()); const reset = normalizeSettings(backendReset); setSettings(reset); setSavedSettings(reset); applyPortalTheme(reset, selectedTheme); applyFavicon(reset); }, [selectedTheme]);
  const value = useMemo(() => ({ settings, updateSettings, saveSettings, resetSettings, refresh: loadSettings, isLoading, isSaving, hasUnsavedChanges: JSON.stringify(settings) !== JSON.stringify(savedSettings), selectedTheme, setSelectedTheme }), [settings, savedSettings, updateSettings, saveSettings, resetSettings, loadSettings, isLoading, isSaving, selectedTheme, setSelectedTheme]);
  return <SchoolSettingsContext.Provider value={value}>{children}</SchoolSettingsContext.Provider>;
}
