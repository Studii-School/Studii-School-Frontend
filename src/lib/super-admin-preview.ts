"use client";

export function isSuperAdminPreview() {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1" && host !== "[::1]") return false;
  try {
    return !window.localStorage.getItem("accessToken");
  } catch {
    return false;
  }
}
