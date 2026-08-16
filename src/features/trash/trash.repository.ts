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
  return apiRequest<void>(`/trash/${encodeURIComponent(id)}/restore`, { method: "POST" });
}
