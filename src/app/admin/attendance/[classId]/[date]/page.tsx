import { AdminAttendanceRegisterScreen } from "@/features/attendance/admin-attendance-screens";
export default async function Page({params}:{params:Promise<{classId:string;date:string}>}){const{classId,date}=await params;return <AdminAttendanceRegisterScreen classId={classId} date={date}/>}
