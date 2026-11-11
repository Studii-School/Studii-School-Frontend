"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useAcademics } from "@/features/academics/academics-context";
import { parentChildrenFromAcademics, studentLabel } from "@/features/parents/parent-child-utils";
import { readStoredUser } from "@/lib/auth";
import { useFinance } from "./finance-context";
import { InvoiceTable } from "./components/invoice-table";
import { parentPaymentInvoices } from "./payment-audience";

export function ParentInvoicesScreen() {
  const { allState, source } = useFinance();
  const { state: academics } = useAcademics();
  const [childId, setChildId] = useState("ALL");
  const children = useMemo(() => parentChildrenFromAcademics(academics), [academics]);
  const childIds = new Set(children.map((child) => child.id));
  const user = readStoredUser();
  const familyInvoices = parentPaymentInvoices(allState.invoices, source === "api", childIds, user?.id, user?.email);
  const invoices = childId === "ALL" ? familyInvoices : familyInvoices.filter((item) => item.studentId === childId);

  return <>
    <PageHeader title="Family Invoices" description="Invoices for children linked to your account." />
    <Card className="mb-5 p-4">
      <Select label="Show invoices for" value={childId} onChange={setChildId} options={[{ value: "ALL", label: "All children" }, ...children.map((child) => ({ value: child.id, label: studentLabel(child) }))]} />
    </Card>
    <SectionCard title="Invoices across all terms"><InvoiceTable invoices={invoices} /></SectionCard>
  </>;
}
