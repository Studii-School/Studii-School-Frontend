"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "./page-header";
import { SectionCard } from "./section-card";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { UpcomingEvents } from "@/features/events/upcoming-events";
import type { PortalAudience } from "@/features/events/events.types";
import { parentChildrenFromAcademics, studentLabel } from "@/features/parents/parent-child-utils";

type ParentTarget = "ALL" | "PARENT" | string;

export function EventsPage({ role, title, description, selectedClass }: { role: PortalAudience; title: string; description: string; selectedClass?: string }) {
  const { state: academics } = useAcademics();
  const [target, setTarget] = useState<ParentTarget>("ALL");
  const children = useMemo(() => parentChildrenFromAcademics(academics), [academics]);
  const options = [
    { value: "ALL", label: "All family" },
    { value: "PARENT", label: "Parent account" },
    ...children.map((child) => ({ value: child.id, label: studentLabel(child) })),
  ];

  return <>
    <PageHeader title={title} description={description} />
    {role === "parent" && <Card className="mb-5 p-4"><Select label="Show events for" value={target} onChange={setTarget} options={options} /></Card>}
    <SectionCard title="Upcoming events" description="Published events relevant to you">
      <UpcomingEvents role={role} selectedClass={selectedClass} parentTarget={target} />
    </SectionCard>
  </>;
}
