import type { StudentInvoice } from "./finance.types";

export function studentPaymentInvoices(invoices: StudentInvoice[], backendAuthorized: boolean, studentId?: string) {
  return invoices.filter((invoice) =>
    !["Cancelled", "Waived"].includes(invoice.status)
    && (backendAuthorized || Boolean(studentId && invoice.studentId === studentId)),
  );
}

export function parentPaymentInvoices(
  invoices: StudentInvoice[],
  backendAuthorized: boolean,
  childIds: Set<string>,
  parentId?: string,
  parentEmail?: string,
) {
  const email = parentEmail?.trim().toLowerCase();
  return invoices.filter((invoice) =>
    !["Cancelled", "Waived"].includes(invoice.status)
    && (backendAuthorized
      || childIds.has(invoice.studentId)
      || Boolean(parentId && invoice.parentId === parentId)
      || Boolean(email && invoice.parentId.toLowerCase() === email)),
  );
}
