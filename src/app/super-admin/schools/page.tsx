import { SchoolManagementScreen } from "@/features/super-admin/school-management-screen";

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const { status } = await searchParams;
  const initialStatus = status === "active" || status === "suspended" || status === "other" ? status : "";
  return <SchoolManagementScreen key={initialStatus} initialStatus={initialStatus} />;
}
