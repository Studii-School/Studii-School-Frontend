import { TeacherAssignmentAdminScreen } from "@/features/academics/academics-screens";
export default async function Page({ searchParams }: { searchParams: Promise<{ teacher?: string }> }) {
  const { teacher = "" } = await searchParams;
  return <TeacherAssignmentAdminScreen initialTeacherUserId={teacher} />;
}
