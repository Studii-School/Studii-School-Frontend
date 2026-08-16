import { AdminClassReportScreen } from "@/features/academics/admin-class-report-screen";
export default async function Page({params}:{params:Promise<{classId:string}>}){const{classId}=await params;return <AdminClassReportScreen classId={classId}/>}
