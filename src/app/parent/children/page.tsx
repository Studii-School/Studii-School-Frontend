"use client";

import { ModulePage } from "@/components/dashboard/module-page";
import { useAcademics } from "@/features/academics/academics-context";

export default function Page() {
  const { state, isLoading } = useAcademics();
  const rows = state.students.map((student) => {
    const schoolClass = state.classes.find((item) => item.id === student.classId);
    return {
      name: [student.firstName, student.lastName].filter(Boolean).join(" "),
      admissionNo: student.admissionNumber,
      class: schoolClass?.displayName ?? "Unassigned",
      status: student.status,
    };
  });

  return (
    <ModulePage
      title="My Children"
      description={isLoading ? "Loading linked children..." : "View your children linked to this account."}
      rows={rows}
      columns={[
        { key: "name", label: "Student" },
        { key: "admissionNo", label: "Admission no." },
        { key: "class", label: "Class" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
