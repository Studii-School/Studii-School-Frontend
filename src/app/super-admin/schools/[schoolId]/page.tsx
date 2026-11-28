import { SchoolDetailScreen } from "@/features/super-admin/school-detail-screen";

export default async function Page({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  return <SchoolDetailScreen schoolId={schoolId} />;
}
