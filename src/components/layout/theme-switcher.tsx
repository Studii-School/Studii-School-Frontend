"use client";

import { Check, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSchoolSettings } from "@/features/school-settings/school-settings-context";
import { themeLabel, type ThemeChoice } from "@/lib/theme";

const choices: Array<{ value: ThemeChoice; icon: ReactNode }> = [
  { value: "light", icon: <Sun size={16} /> },
  { value: "dark", icon: <Moon size={16} /> },
];

export function ThemeSwitcher() {
  const { selectedTheme, setSelectedTheme } = useSchoolSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className="px-3"
        aria-label="Choose display theme"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selectedTheme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
        <span className="hidden md:inline">{themeLabel(selectedTheme)}</span>
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-[70] mt-2 w-64 rounded-xl border bg-surface p-2 shadow-xl">
          <div className="px-2 py-2">
            <p className="text-sm font-semibold">Display theme</p>
            <p className="mt-1 text-xs text-muted">This only changes your own portal view.</p>
          </div>
          <div className="mt-1 space-y-1">
            {choices.map((choice) => (
              <button
                key={choice.value}
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-left text-sm hover:bg-surface-muted"
                onClick={() => {
                  setSelectedTheme(choice.value);
                  setOpen(false);
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-[var(--school-primary)]">{choice.icon}</span>
                  <span className="truncate font-medium">{themeLabel(choice.value)}</span>
                </span>
                {selectedTheme === choice.value && <Check size={15} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
