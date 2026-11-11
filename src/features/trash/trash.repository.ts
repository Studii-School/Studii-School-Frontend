"use client";

import { apiRequest } from "@/lib/api";

export interface TrashRecord {
  id: string;
  schoolId: string | null;
  actorUserId: string | null;
  category: string;
  entityType: string;
  entityId: string;
  title: string;
  snapshot: Record<string, unknown>;
  deletedAt: string;
  expiresAt: string;
}

export interface TrashGroup {
  key: string;
  count: number;
}

export interface TrashResponse {
  records: TrashRecord[];
  groups: TrashGroup[];
}

export async function getTrash(category?: string) {
  const suffix = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiRequest<TrashResponse>(`/trash${suffix}`);
}

export async function restoreTrashRecord(id: string) {
  try {
    return await apiRequest<void>(`/trash/${encodeURIComponent(id)}/restore`, { method: "POST" });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "";
    if (message.includes("Cannot POST /trash/") && message.includes("/restore")) {
      throw new Error("Trash restore is not available in the backend API yet.");
    }
    throw caught;
  }
}
