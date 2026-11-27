"use client";

import { API_URL } from "./api";

async function publicPost<T>(path: string, payload: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("We could not reach SchoolOS. Please check your connection and try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(message || data?.error || "Your request could not be completed. Please try again.");
  }
  return data as T;
}

export type DemoRequest = {
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  schoolSize?: string;
  notes?: string;
};

export function requestDemo(values: DemoRequest) {
  return publicPost<{ message: string; requestId: string }>("/auth/demo-requests", values);
}
