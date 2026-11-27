"use client";

import { apiRequest } from "@/lib/api";
import { isSuperAdminPreview } from "@/lib/super-admin-preview";

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
  if (isSuperAdminPreview()) return { records: [], groups: [] } as TrashResponse;
  const suffix = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiRequest<TrashResponse>(`/trash${suffix}`);
}

export async function restoreTrashRecord(id: string) {
  if (isSuperAdminPreview()) throw new Error("Actions are unavailable in the local preview.");
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
