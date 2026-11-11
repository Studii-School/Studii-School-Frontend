import { AttendanceRegisterScreen } from "@/features/attendance/attendance-screens";

export default async function Page({ params }: { params: Promise<{ classId: string; date: string }> }) {
  const { classId, date } = await params;
  return <AttendanceRegisterScreen classId={classId} initialDate={date} isAdmin />;
}
