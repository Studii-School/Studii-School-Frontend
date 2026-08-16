import { TeacherAssignmentForm } from "@/features/assignments/assignments-screens";
export default async function Page({params}:{params:Promise<{assignmentId:string}>}){const{assignmentId}=await params;return <TeacherAssignmentForm assignmentId={assignmentId}/>}
