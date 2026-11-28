import { apiRequest, API_URL, AUTH_SESSION_EVENT, getProfile, type AuthUser, type LoginResponse } from "@/lib/api";

export async function acceptSchoolInvitation(token: string): Promise<AuthUser> {
  // An invitation is opened before the school has a session. Do not attach a
  // previously signed-in user's bearer token to this one-time link.
  const result = await fetch(`${API_URL}/auth/school-invitations/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const response = await result.json().catch(() => null) as LoginResponse | { message?: string } | null;
  if (!result.ok) throw new Error(response?.message || "This invitation could not be accepted. Ask SchoolOS for a new link.");
  if (!response || !("accessToken" in response)) throw new Error("The invitation did not return a school session. Ask SchoolOS for a new link.");
  if (!response.accessToken || response.user?.role !== "SCHOOL_ADMIN" || !(response.user.schoolId ?? response.user.school?.id)) {
    throw new Error("The invitation did not return a school administrator session. Ask SchoolOS for a new invitation.");
  }
  localStorage.setItem("accessToken", response.accessToken);
  localStorage.setItem("user", JSON.stringify(response.user));
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT));
  return response.user;
}

export async function submitSchoolOnboarding(): Promise<AuthUser> {
  await apiRequest("/schools/me/onboarding/submit", { method: "POST" });
  const profile = await getProfile();
  localStorage.setItem("user", JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT));
  return profile;
}
