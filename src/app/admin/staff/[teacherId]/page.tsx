import { AdminTeacherDetailScreen } from "@/features/academics/academics-detail-screens";
export default async function Page({params}:{params:Promise<{teacherId:string}>}){const{teacherId}=await params;return <AdminTeacherDetailScreen teacherId={teacherId}/>}
