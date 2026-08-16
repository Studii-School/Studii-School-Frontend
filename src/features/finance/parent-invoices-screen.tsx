"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { parentChildrenFromAcademics, studentLabel } from "@/features/parents/parent-child-utils";
import { useFinance } from "./finance-context";
import { InvoiceTable } from "./components/invoice-table";

export function ParentInvoicesScreen() {
  const { state } = useFinance();
  const { state: academics } = useAcademics();
  const [childId, setChildId] = useState("ALL");
  const children = useMemo(() => parentChildrenFromAcademics(academics), [academics]);
  const childIds = new Set(children.map((child) => child.id));
  const familyInvoices = state.invoices.filter((item) => childIds.has(item.studentId));
  const invoices = childId === "ALL" ? familyInvoices : familyInvoices.filter((item) => item.studentId === childId);

  return <>
    <PageHeader title="Family Invoices" description="Invoices for children linked to your account." />
    <Card className="mb-5 p-4">
      <Select label="Show invoices for" value={childId} onChange={setChildId} options={[{ value: "ALL", label: "All children" }, ...children.map((child) => ({ value: child.id, label: studentLabel(child) }))]} />
    </Card>
    <SectionCard title="Current and past invoices"><InvoiceTable invoices={invoices} /></SectionCard>
  </>;
}
