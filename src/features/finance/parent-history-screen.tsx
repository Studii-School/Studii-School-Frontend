"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Card } from "@/components/ui/card";
import { useAcademics } from "@/features/academics/academics-context";
import { parentChildrenFromAcademics } from "@/features/parents/parent-child-utils";
import { readStoredUser } from "@/lib/auth";
import { useFinance } from "./finance-context";
import { PaymentTable } from "./components/payment-table";
import { filterPaymentsByInvoices } from "./finance-scope";
import { parentPaymentInvoices } from "./payment-audience";

export function ParentHistoryScreen() {
  const { allState, source } = useFinance();
  const { state: academics } = useAcademics();
  const children = parentChildrenFromAcademics(academics);
  const childIds = new Set(children.map((child) => child.id));
  const user = readStoredUser();
  const invoices = parentPaymentInvoices(allState.invoices, source === "api", childIds, user?.id, user?.email);
  const payments = filterPaymentsByInvoices(allState.payments, invoices);

  return <>
    <PageHeader title="Payment history" description="Payments made for your children." />
    <SectionCard title="Recent payments">
      {children.length || invoices.length ? <PaymentTable payments={payments} /> : <Card className="m-4 rounded-xl p-5 text-sm text-muted">No children are linked to your account yet. Please contact the school office.</Card>}
    </SectionCard>
  </>;
}
