import { Suspense } from "react";
import { AdminStudentsPage } from "@/features/students/admin-students-screen";

export default function Page() {
  return <Suspense fallback={null}><AdminStudentsPage /></Suspense>;
}
