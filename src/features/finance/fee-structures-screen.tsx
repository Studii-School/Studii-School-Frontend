"use client";

import { useState } from "react";
import { Ban, Copy, FileText, Plus, Power, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "@/features/navigation-progress/navigation-progress-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/dashboard/section-card";
import { Modal } from "@/components/ui/modal";
import { Button, buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { useActionFeedback } from "@/features/action-feedback/action-feedback-context";
import { useAcademics } from "@/features/academics/academics-context";
import { formatNaira } from "@/lib/currency";
import { useFinance } from "./finance-context";
import { useFinanceView } from "./use-finance-view";
import { FinanceNavigation } from "./components/finance-navigation";
import { FeeStructureForm } from "./forms/fee-structure-form";
import { filterFeeStructuresByPeriod, selectedClassFromParams } from "./finance-scope";
import { useFinancePeriodScope } from "./use-finance-period-scope";
import type { FeeStructure } from "./finance.types";

export function FeeStructuresScreen() {
  const { allState: state, activateFeeStructure, updateFeeStructure, deleteFeeStructure } = useFinance();
  const { state: academics } = useAcademics();
  const periodScope = useFinancePeriodScope();
  const selectedClassId = selectedClassFromParams(useSearchParams());
  const selectedClass = academics.classes.find((item) => item.id === selectedClassId);
  const { confirm, toast } = useActionFeedback();
  const [showForm, setShowForm] = useState(false);
  const [template, setTemplate] = useState<FeeStructure>();
  const [busy, setBusy] = useState("");
  const { state: view, label, selectedTermOnly } = useFinanceView();
  const periodFees = view.feeStructures;
  const fees = selectedClassId
    ? periodFees.filter((fee) => fee.applicableToAllStudents || fee.classGroup === "All classes" || fee.classIds?.includes(selectedClassId) || fee.classGroup === selectedClass?.displayName)
    : periodFees;

  const activate = (id: string, count: number) =>
    confirm({
      title: "Activate fee structure?",
      description: `This will generate up to ${count} student invoice records. Existing financial history will not be replaced.`,
      confirmLabel: "Activate Fee",
      onConfirm: async () => {
        setBusy(id);
        try {
          const created = await activateFeeStructure(id);
          toast(`Fee structure created successfully. ${created} new invoice(s) generated.`, "success");
        } finally {
          setBusy("");
        }
      },
    });

  const deactivate = (id: string) =>
    confirm({
      title: "Deactivate fee?",
      description: "This stops the fee from generating new invoices. Existing invoices, payments and receipts stay available.",
      confirmLabel: "Deactivate Fee",
      onConfirm: async () => {
        setBusy(id);
        try {
          await updateFeeStructure(id, { status: "Inactive" });
          toast("Fee deactivated. Existing invoices were kept.", "success");
        } finally {
          setBusy("");
        }
      },
    });

  const remove = (id: string) =>
    confirm({
      title: "Delete fee?",
      description: "Only fees without generated invoices can be deleted. Use deactivate when invoices already exist.",
      confirmLabel: "Delete Fee",
      destructive: true,
      onConfirm: async () => {
        setBusy(id);
        try {
          await deleteFeeStructure(id);
          toast("Fee deleted.", "success");
        } catch (caught) {
          toast(caught instanceof Error ? caught.message : "Fee could not be deleted.", "error");
        } finally {
          setBusy("");
        }
      },
    });

  const invoiceHref = (feeId: string) => {
    const params = new URLSearchParams({ feeId });
    if (selectedClassId) params.set("classId", selectedClassId);
    if (selectedTermOnly) params.set("financePeriod", "term");
    return `/admin/finance/invoices?${params.toString()}`;
  };

  return (
    <>
      <PageHeader title={selectedClass ? `${selectedClass.displayName} fee structures` : "Fee Structures"} description={selectedClass ? `Create and review obligations that apply to ${selectedClass.displayName}.` : "Configure school fees by class, term and category."} action={<Button onClick={() => { setTemplate(undefined); setShowForm(true); }}><Plus size={16} />Create fee structure</Button>} />
      <FinanceNavigation />
      <Modal open={showForm} title={template ? "Copy fee to selected term" : "New fee structure"} description="Define the fee details and eligible students." maxWidth="xl" onClose={() => setShowForm(false)}>
        {showForm && <FeeStructureForm key={template?.id ?? "new"} selectedClassId={selectedClassId} template={template} onDone={() => setShowForm(false)} />}
      </Modal>
      <SectionCard title="Configured fees" description={`${fees.length} saved · ${label} - ${fees.filter((item) => item.status === "Active").length} active - ${fees.filter((item) => item.status === "Draft").length} draft.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-muted">
              <tr>{["Fee name", "Class", "Category", "Amount", "Due date", "Assigned", "Expected revenue", "Status", "Actions"].map((item) => <th key={item} className={item === "Actions" ? "w-[280px] px-4 py-3" : "px-4 py-3"}>{item}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {fees.map((fee) => {
                const inSelectedPeriod = filterFeeStructuresByPeriod([fee], periodScope).length > 0;
                const invoiceCount = state.invoices.filter((invoice) => invoice.feeStructureId === fee.id && invoice.academicSession === fee.academicSession && invoice.term === fee.term).length;
                return (
                <ClickableTableRow key={fee.id} href={invoiceCount > 0 ? invoiceHref(fee.id) : undefined} label={fee.name}>
                  <td className="px-4 py-3 font-medium">{fee.name}<p className="text-xs font-normal text-muted">{fee.term} - {fee.academicSession}{!inSelectedPeriod ? " · Other term" : ""}</p>{invoiceCount > 0 && <p className="text-xs font-normal text-muted">{invoiceCount} generated invoice(s)</p>}{fee.status === "Draft" && <p className="text-xs font-normal text-warning">{inSelectedPeriod ? "Activate to show this fee to students and parents." : "Copy to the selected term before billing students."}</p>}</td>
                  <td className="px-4 py-3">{fee.classGroup}</td>
                  <td className="px-4 py-3">{fee.category}</td>
                  <td className="px-4 py-3">{formatNaira(fee.amount)}</td>
                  <td className="px-4 py-3">{fee.dueDate}</td>
                  <td className="px-4 py-3">{fee.studentsAssigned}</td>
                  <td className="px-4 py-3">{formatNaira(fee.expectedRevenue)}</td>
                  <td className="px-4 py-3"><Badge tone={fee.status === "Active" ? "success" : fee.status === "Draft" ? "warning" : "neutral"}>{fee.status === "Archived" ? "Inactive" : fee.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex w-max items-center gap-2 whitespace-nowrap">
                      {fee.status === "Draft" && inSelectedPeriod && <Button className="min-h-9 px-3 text-xs" variant="outline" disabled={busy === fee.id} onClick={() => activate(fee.id, fee.classIds?.length ? state.invoices.length || 4 : 4)}><Power size={14} />{busy === fee.id ? "Activating..." : "Activate"}</Button>}
                      {!inSelectedPeriod && <Button className="min-h-9 px-3 text-xs" variant="outline" onClick={() => { setTemplate(fee); setShowForm(true); }}><Copy size={14} />Copy to this term</Button>}
                      {invoiceCount > 0
                        ? <Link href={invoiceHref(fee.id)} className={buttonStyles("outline") + " min-h-9 px-3 text-xs"}><FileText size={14} />View invoices</Link>
                        : <Button className="min-h-9 px-3 text-xs" variant="outline" onClick={() => toast(inSelectedPeriod ? "This fee has no student invoices in the selected term. Activate a draft to create them, or check that eligible students are enrolled." : "Select this fee's academic term in the top bar to view its invoices.", "info")}><FileText size={14} />View invoices</Button>}
                      {fee.status === "Active" && <Button className="min-h-9 px-3 text-xs" variant="outline" disabled={busy === fee.id} onClick={() => deactivate(fee.id)}><Ban size={14} />Deactivate</Button>}
                      {fee.status !== "Active" && <Button className="min-h-9 px-3 text-xs" variant="danger" disabled={busy === fee.id} onClick={() => remove(fee.id)}><Trash2 size={14} />Delete</Button>}
                    </div>
                  </td>
                </ClickableTableRow>
              );})}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
