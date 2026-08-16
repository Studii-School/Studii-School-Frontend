"use client";
import { createContext, useContext } from "react";
import type { SchoolEvent, SchoolEventInput } from "./events.types";
export interface EventsContextValue { events: SchoolEvent[]; isLoading: boolean; error?: string; createEvent: (input: SchoolEventInput) => Promise<void>; updateEvent: (id: string, input: Partial<SchoolEventInput>) => Promise<void>; deleteEvent: (id: string) => Promise<void>; publishEvent: (id: string, published: boolean) => Promise<void>; refresh: () => Promise<void>; }
export const EventsContext = createContext<EventsContextValue | null>(null);
export function useEvents() { const context = useContext(EventsContext); if (!context) throw new Error("useEvents must be used within EventsProvider"); return context; }
