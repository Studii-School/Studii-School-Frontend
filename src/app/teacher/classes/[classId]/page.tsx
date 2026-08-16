import { TeacherClassDetailScreen } from "@/features/academics/academics-screens";
export default async function Page({params}:{params:Promise<{classId:string}>}){const{classId}=await params;return <TeacherClassDetailScreen classId={classId}/>}
