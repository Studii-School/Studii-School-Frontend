"use client";

import type { FeatureKey } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
export const SWAGGER_DOCS_PATH = "/api/docs";

export type BackendRole =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

export type AuthUser = {
  id?: string;
  schoolId?: string;
  school?: { id?: string; name?: string; status?: string };
  features?: Partial<Record<FeatureKey, boolean>>;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: BackendRole | string;
  status?: string;
  studentId?: string;
  currentClassId?: string;
  classId?: string;
  guardianId?: string;
  childStudentIds?: string[];
  assignedClassIds?: string[];
  assignedSubjectIds?: string[];
};

export type LoginResponse = {
  message?: string;
  accessToken: string;
  user: AuthUser;
};

type ProfileResponse = AuthUser | { user: AuthUser };

export const AUTH_SESSION_EVENT = "studii-auth-session";

type LogoutOptions = {
  reason?: "expired" | "manual" | "invalid";
};

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

export function getTokenExpiryMs(token: string | null) {
  if (!token || token === "development-token") return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const decoded = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null, now = Date.now()) {
  const expiresAt = getTokenExpiryMs(token);
  return expiresAt !== null && expiresAt <= now;
}

export function readStoredToken() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("accessToken");
  if (isTokenExpired(token)) {
    logout({ reason: "expired" });
    return null;
  }
  return token;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = readStoredToken();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) logout({ reason: "expired" });
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(message || data?.error || "Request failed");
  }

  return data as T;
}

export async function login(email: string, password: string) {
  const data = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("user", JSON.stringify(data.user));
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT));

  return data.user;
}

export async function firstTimePassword(email: string, password: string) {
  const data = await apiRequest<LoginResponse>("/auth/first-time-password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("user", JSON.stringify(data.user));
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT));

  return data.user;
}

export async function getProfile() {
  const data = await apiRequest<ProfileResponse>("/auth/profile");
  const user = data && typeof data === "object" && "user" in data ? data.user : data;
  return user;
}

export function logout(options: LogoutOptions = {}) {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail: options }));
}
