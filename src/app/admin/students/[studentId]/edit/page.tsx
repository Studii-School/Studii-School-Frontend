import { StudentFormPage } from "@/features/students/student-form-screen";

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <StudentFormPage studentId={studentId} />;
}
