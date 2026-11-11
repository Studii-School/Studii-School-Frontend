"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { SearchInput } from "@/components/shared/search-input";
import { useAcademics } from "@/features/academics/academics-context";
import { parentChildrenFromAcademics } from "@/features/parents/parent-child-utils";
import { PersonNameLink } from "@/features/people/person-name-link";

export default function Page() {
  const { state, isLoading } = useAcademics();
  const [query, setQuery] = useState("");
  const children = parentChildrenFromAcademics(state).filter((student) =>
    !query.trim() || [student.firstName, student.lastName, student.admissionNumber, state.classes.find((item) => item.id === student.classId)?.displayName].some((value) => value?.toLowerCase().includes(query.trim().toLowerCase())),
  );

  return (
    <>
      <PageHeader title="My Children" description={isLoading ? "Loading linked children..." : "View your children linked to this account."} />
      <SectionCard title="Linked children" description={`${children.length} student(s)`}>
        <div className="border-b p-4"><SearchInput value={query} onChange={setQuery} placeholder="Search your children" /></div>
        <div className="divide-y px-5">
          {children.map((student) => <div key={student.id} className="py-4">
            <p className="font-semibold"><PersonNameLink kind="student" id={student.id}>{[student.firstName, student.lastName].filter(Boolean).join(" ")}</PersonNameLink></p>
            <p className="mt-1 text-sm text-muted">{student.admissionNumber} · {state.classes.find((item) => item.id === student.classId)?.displayName ?? "Unassigned"} · {student.status}</p>
          </div>)}
          {!children.length && <p className="py-8 text-sm text-muted">No linked children found.</p>}
        </div>
      </SectionCard>
    </>
  );
}
