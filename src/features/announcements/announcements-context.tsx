"use client";
import { createContext, useContext } from "react";
import type { Announcement, AnnouncementInput } from "./announcements.types";
export interface AnnouncementsContextValue { announcements: Announcement[]; isLoading: boolean; error?: string; createAnnouncement(input: AnnouncementInput): Promise<void>; updateAnnouncement(id: string, input: Partial<AnnouncementInput>): Promise<void>; deleteAnnouncement(id: string): Promise<void>; setPublished(id: string, published: boolean): Promise<void>; refresh(): Promise<void>; }
export const AnnouncementsContext = createContext<AnnouncementsContextValue | null>(null);
export function useAnnouncements() { const value = useContext(AnnouncementsContext); if (!value) throw new Error("useAnnouncements must be used within AnnouncementsProvider"); return value; }
