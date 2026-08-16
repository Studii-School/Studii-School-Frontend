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
