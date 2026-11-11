"use client";
import { createContext, useContext } from "react";
import type { ThemeChoice } from "@/lib/theme";
import type { SchoolSettings } from "./school-settings.types";

export interface SchoolSettingsContextValue {
  settings: SchoolSettings;
  updateSettings: (next: SchoolSettings | ((current: SchoolSettings) => SchoolSettings)) => void;
  saveSettings: (nextSettings?: SchoolSettings) => Promise<void>;
  resetSettings: () => Promise<void>;
  refresh: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  selectedTheme: ThemeChoice;
  setSelectedTheme: (theme: ThemeChoice) => void;
}
export const SchoolSettingsContext = createContext<SchoolSettingsContextValue | null>(null);
export function useSchoolSettings() { const context = useContext(SchoolSettingsContext); if (!context) throw new Error("useSchoolSettings must be used within SchoolSettingsProvider"); return context; }
