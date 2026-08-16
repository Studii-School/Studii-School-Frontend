"use client";

import { createContext } from "react";

export interface NavigationProgressContextValue {
  start: () => void;
  complete: () => void;
  setProgress: (value: number) => void;
  isLoading: boolean;
  isVisible: boolean;
  progress: number;
}

export const NavigationProgressContext = createContext<NavigationProgressContextValue | null>(null);
