export type SchoolRecord = {
  id?: string;
  schoolId?: string;
  name?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  totalUsers?: number;
  _count?: { users?: number };
  schoolAdmins?: Array<{ id?: string; name?: string; email?: string; createdAt?: string }>;
  admins?: Array<{ id?: string; name?: string; email?: string }>;
};

export type SchoolFormState = {
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
};

export type SchoolAdminFormState = {
  schoolId: string;
  name: string;
  email: string;
  password: string;
};

export type DemoRequestRecord = {
  id: string;
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  schoolSize?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
};

export function schoolKey(school: SchoolRecord) {
  return school.id ?? school.schoolId ?? "";
}

export function schoolStatus(status?: string) {
  const value = status?.trim().toUpperCase();
  if (value === "ACTIVE") return "active";
  if (value === "SUSPENDED" || value === "INACTIVE") return "suspended";
  return "other";
}

export function statusLabel(status?: string) {
  return status?.trim().toLowerCase().replaceAll("_", " ").replace(/^./, (first) => first.toUpperCase()) || "Unknown";
}
