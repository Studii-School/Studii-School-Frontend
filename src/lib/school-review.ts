export function isSchoolUnderReview(status?: string | null) {
  const value = status?.trim().toUpperCase();
  return value === "UNDER_REVIEW" || value === "PENDING_REVIEW";
}

export function isSchoolSetupRoute(pathname: string) {
  return pathname === "/admin/students/new" || pathname === "/admin/students/import" ||
    pathname === "/admin/staff/add" || pathname === "/admin/admissions/new" ||
    pathname === "/admin/admissions/register";
}
