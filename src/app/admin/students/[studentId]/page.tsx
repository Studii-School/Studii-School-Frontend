import { StudentDetailPage } from "@/features/students/student-detail-screen";

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <StudentDetailPage studentId={studentId} />;
}
