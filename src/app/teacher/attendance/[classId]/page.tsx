import { AttendanceRegisterScreen } from "@/features/attendance/attendance-screens";
export default async function Page({params,searchParams}:{params:Promise<{classId:string}>;searchParams:Promise<{date?:string}>}){const{classId}=await params;const{date}=await searchParams;return <AttendanceRegisterScreen classId={classId} initialDate={date}/>}
