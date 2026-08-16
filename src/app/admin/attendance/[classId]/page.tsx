import { AdminClassAttendanceScreen } from "@/features/attendance/admin-attendance-screens";
export default async function Page({params}:{params:Promise<{classId:string}>}){const{classId}=await params;return <AdminClassAttendanceScreen classId={classId}/>}
