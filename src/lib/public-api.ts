"use client";

import { API_URL, AUTH_SESSION_EVENT, type LoginResponse } from "./api";

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

export type SchoolRegistration = {
  schoolName: string;
  schoolLevel: "PRIMARY" | "SECONDARY" | "BOTH" | "";
  adminName: string;
  email: string;
  phone: string;
  address?: string;
  password: string;
};

export async function registerSchool(values: SchoolRegistration) {
  const data = await publicPost<LoginResponse>("/auth/register-school", values);
  if (!data.accessToken || !data.user?.schoolId) throw new Error("Registration succeeded, but sign-in is not ready. Please sign in with your new account.");
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("user", JSON.stringify(data.user));
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT));
  return data.user;
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
