import { getAcademicsState } from "@/features/academics/academics.storage";
import type { Guardian, SchoolClass, StaffMember, Student } from "@/features/academics/academics.types";
import { classIdForName, classNameFor, demoGuardians, demoStudents } from "@/lib/demo-relationships";
import { getFinanceState, resetFinanceState, saveFinanceState } from "./finance.storage";
import type { CheckoutInput, CheckoutResponse, CreateStaffFinanceEntryInput, DemoPaymentOutcome, Expense, FeeStructure, FinanceState, FinanceSummary, Payment, Receipt, RecordExpenseInput, RecordPaymentInput, StaffFinanceEntry, StaffFinanceRow, StudentInvoice } from "./finance.types";

export interface FinanceRepository {
  getState(): Promise<FinanceState>;
  getFinanceSummary(): Promise<FinanceSummary>;
  getFeeStructures(): Promise<FeeStructure[]>;
  createFeeStructure(input: Omit<FeeStructure, "id" | "studentsAssigned" | "expectedRevenue">): Promise<FeeStructure>;
  activateFeeStructure(id: string): Promise<{ fee: FeeStructure; invoicesCreated: number }>;
  updateFeeStructure(id: string, input: Partial<FeeStructure>): Promise<FeeStructure | undefined>;
  deleteFeeStructure(id: string): Promise<void>;
  getInvoices(): Promise<StudentInvoice[]>;
  getInvoiceById(id: string): Promise<StudentInvoice | undefined>;
  recordPayment(input: RecordPaymentInput): Promise<{ payment: Payment; receipt: Receipt }>;
  createFlutterwaveCheckout(input: CheckoutInput): Promise<CheckoutResponse>;
  getPayments(): Promise<Payment[]>;
  getExpenses(): Promise<Expense[]>;
  recordExpense(input: RecordExpenseInput): Promise<Expense>;
  getAdminStaffFinance(): Promise<{ staff: StaffFinanceRow[]; teachers: Array<StaffFinanceRow & { teacherId: string; teacherName: string }> }>;
  createPayrollRun(period: string): Promise<{ period: string; created: number; alreadyPrepared: boolean }>;
  createStaffFinanceEntry(staffUserId: string, input: CreateStaffFinanceEntryInput): Promise<StaffFinanceEntry>;
  updateStaffFinanceEntryStatus(entryId: string, status: StaffFinanceEntry["status"], input?: { method?: string; reference?: string; note?: string }): Promise<StaffFinanceEntry>;
  payStaffFinanceEntry(entryId: string, input: { method: string; reference: string; paymentDate?: string; note?: string }): Promise<StaffFinanceEntry>;
  getReceipts(): Promise<Receipt[]>;
  matchTransaction(transactionId: string, invoiceId: string): Promise<{ payment: Payment; receipt: Receipt }>;
  getDebtors(): Promise<StudentInvoice[]>;
  getParentInvoices(parentId: string): Promise<StudentInvoice[]>;
  getStudentInvoices(studentId: string): Promise<StudentInvoice[]>;
  simulateOnlinePayment(input: RecordPaymentInput, outcome: DemoPaymentOutcome): Promise<{ outcome: DemoPaymentOutcome; payment?: Payment; receipt?: Receipt }>;
  reset(): Promise<FinanceState>;
}

type EligibleStudent = {
  id: string;
  name: string;
  admissionNumber: string;
  guardianId?: string;
  parentId: string;
  parent: string;
  parentPhone: string;
  classId: string;
  className: string;
};

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const statusFor = (balance: number, paid: number, dueDate: string): StudentInvoice["status"] => balance <= 0 ? "Paid" : new Date(`${dueDate}T23:59:59`) < new Date() ? "Overdue" : paid > 0 ? "Partially paid" : "Unpaid";
const studentName = (student: Student) => [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") || student.admissionNumber;
const staffName = (staff: StaffMember) => staff.fullName || [staff.firstName, staff.lastName].filter(Boolean).join(" ") || staff.email;
const classLabel = (classes: SchoolClass[], classId: string) => classes.find((item) => item.id === classId)?.displayName ?? classes.find((item) => item.id === classId)?.name ?? classNameFor(classId);
const guardianFor = (student: Student, guardians: Guardian[]) => guardians.find((guardian) => student.guardianIds.includes(guardian.id) || student.parentIds?.includes(guardian.id) || Boolean(guardian.email && student.guardianEmail && guardian.email.toLowerCase() === student.guardianEmail.toLowerCase()));

export class LocalFinanceRepository implements FinanceRepository {
  async getState() {
    const base = await getFinanceState();
    const state = { ...base, expenses: base.expenses ?? [], staffFinanceEntries: base.staffFinanceEntries ?? [] };
    let changed = false;
    for (const fee of state.feeStructures.filter((item) => item.status === "Active")) {
      const eligible = await this.eligibleStudents(fee);
      const created = await this.generateInvoices(state, fee);
      if (created > 0) {
        state.activity.unshift(`${fee.name} refreshed - ${created} invoice(s) generated`);
        changed = true;
      }
      if (fee.studentsAssigned !== eligible.length || fee.expectedRevenue !== eligible.length * fee.amount) {
        fee.studentsAssigned = eligible.length;
        fee.expectedRevenue = eligible.length * fee.amount;
        changed = true;
      }
    }
    if (changed) await saveFinanceState(state);
    return state;
  }

  async getFinanceSummary() {
    const state = await this.getState();
    const active = state.invoices.filter((item) => !["Cancelled", "Waived"].includes(item.status));
    const totalExpected = active.reduce((sum, item) => sum + item.totalAmount, 0);
    const amountCollected = state.payments.filter((item) => item.status === "Successful").reduce((sum, item) => sum + item.amount, 0);
    const outstandingAmount = active.reduce((sum, item) => sum + item.outstandingBalance, 0);
    const totalExpenses = state.expenses.reduce((sum, item) => sum + item.amount, 0);
    const matched = state.reconciliationTransactions.filter((item) => item.status === "Auto-matched" || item.status === "Manually matched").length;
    return {
      totalExpected,
      amountCollected,
      outstandingAmount,
      collectionRate: totalExpected ? Math.round((amountCollected / totalExpected) * 100) : 0,
      transactionCount: state.reconciliationTransactions.length,
      reconciliationRate: state.reconciliationTransactions.length ? Math.round((matched / state.reconciliationTransactions.length) * 100) : 0,
      needsReview: state.reconciliationTransactions.filter((item) => !["Auto-matched", "Manually matched"].includes(item.status)).length,
      totalExpenses,
      currentBalance: amountCollected - totalExpenses,
    };
  }

  async getFeeStructures() { return (await this.getState()).feeStructures; }

  private async eligibleStudents(fee: FeeStructure): Promise<EligibleStudent[]> {
    const academics = await getAcademicsState();
    const realStudents = academics.students.filter((student) => student.status === "ACTIVE" && student.classId);
    if (realStudents.length) {
      const ids = fee.applicableToAllStudents || fee.classGroup === "All classes" ? undefined : fee.classIds?.length ? fee.classIds : [classIdForName(fee.classGroup)].filter((item): item is string => Boolean(item));
      return realStudents.filter((student) => !ids || ids.includes(student.classId)).map((student) => {
        const guardian = guardianFor(student, academics.guardians);
        return {
          id: student.id,
          name: studentName(student),
          admissionNumber: student.admissionNumber,
          guardianId: guardian?.id ?? student.guardianIds[0],
          parentId: guardian?.userId ?? guardian?.id ?? student.parentIds?.[0] ?? student.guardianIds[0] ?? student.guardianEmail ?? "parent",
          parent: guardian?.fullName ?? student.guardianName ?? "Guardian",
          parentPhone: guardian?.phone ?? student.guardianPhone ?? "",
          classId: student.classId,
          className: classLabel(academics.classes, student.classId),
        };
      });
    }

    const demoEligible = fee.applicableToAllStudents || fee.classGroup === "All classes" ? demoStudents : demoStudents.filter((student) => (fee.classIds?.length ? fee.classIds : [classIdForName(fee.classGroup)]).filter(Boolean).includes(student.classId));
    return demoEligible.map((student) => {
      const guardian = demoGuardians.find((item) => item.id === student.guardianId);
      return {
        id: student.id,
        name: student.name,
        admissionNumber: student.admissionNumber,
        guardianId: student.guardianId,
        parentId: student.guardianId === "guardian-001" ? "parent-aisha" : guardian?.userId ?? student.guardianId,
        parent: guardian?.name ?? "Guardian",
        parentPhone: "0800 000 0000",
        classId: student.classId,
        className: classNameFor(student.classId),
      };
    });
  }

  private async generateInvoices(state: FinanceState, fee: FeeStructure) {
    let created = 0;
    for (const student of await this.eligibleStudents(fee)) {
      if (state.invoices.some((item) => item.studentId === student.id && item.feeStructureId === fee.id)) continue;
      const invoice: StudentInvoice = {
        id: uid("inv"),
        schoolId: fee.schoolId ?? "school-001",
        invoiceNumber: `INV-2026-${String(state.invoices.length + 1100 + created).padStart(5, "0")}`,
        studentId: student.id,
        student: student.name,
        admissionNumber: student.admissionNumber,
        guardianId: student.guardianId,
        parentId: student.parentId,
        parent: student.parent,
        parentPhone: student.parentPhone,
        classId: student.classId,
        className: student.className,
        feeStructureId: fee.id,
        academicSessionId: fee.academicSessionId,
        termId: fee.termId,
        academicSession: fee.academicSession,
        term: fee.term,
        totalAmount: fee.amount,
        amountPaid: 0,
        outstandingBalance: fee.amount,
        dueDate: fee.dueDate,
        status: statusFor(fee.amount, 0, fee.dueDate),
        paymentPlan: fee.allowInstalments ? `${fee.numberOfInstalments} instalments` : "Full payment",
      };
      state.invoices.unshift(invoice);
      created++;
    }
    return created;
  }

  async createFeeStructure(input: Omit<FeeStructure, "id" | "studentsAssigned" | "expectedRevenue">) {
    const state = await this.getState();
    const duplicate = state.feeStructures.some((item) => item.academicSession === input.academicSession && item.term === input.term && item.category === input.category && item.classGroup === input.classGroup && !["Inactive", "Archived"].includes(item.status));
    if (duplicate) throw new Error("A similar fee already exists for this class, term and category.");
    const now = new Date().toISOString();
    const base = { ...input, id: uid("fee"), schoolId: "school-001", createdAt: now, updatedAt: now, studentsAssigned: 0, expectedRevenue: 0 };
    const eligible = await this.eligibleStudents(base);
    const created: FeeStructure = { ...base, studentsAssigned: input.status === "Active" ? eligible.length : 0, expectedRevenue: input.status === "Active" ? eligible.length * input.amount : 0 };
    state.feeStructures.unshift(created);
    const invoicesCreated = input.status === "Active" ? await this.generateInvoices(state, created) : 0;
    state.activity.unshift(`Fee structure ${created.name} created${invoicesCreated ? ` - ${invoicesCreated} invoices generated` : ""}`);
    await saveFinanceState(state);
    return created;
  }

  async activateFeeStructure(id: string) {
    const state = await this.getState();
    const fee = state.feeStructures.find((item) => item.id === id);
    if (!fee) throw new Error("Fee structure not found.");
    const eligible = await this.eligibleStudents(fee);
    fee.status = "Active";
    fee.studentsAssigned = eligible.length;
    fee.expectedRevenue = eligible.length * fee.amount;
    fee.updatedAt = new Date().toISOString();
    const invoicesCreated = await this.generateInvoices(state, fee);
    state.activity.unshift(`${fee.name} activated - ${invoicesCreated} invoices generated`);
    await saveFinanceState(state);
    return { fee, invoicesCreated };
  }

  async updateFeeStructure(id: string, input: Partial<FeeStructure>) {
    const state = await this.getState();
    const current = state.feeStructures.find((item) => item.id === id);
    if (current?.status === "Active" && state.invoices.some((item) => item.feeStructureId === id) && ("amount" in input || "classIds" in input)) throw new Error("Archive or duplicate this fee instead of changing obligations with existing invoices.");
    let updated: FeeStructure | undefined;
    state.feeStructures = state.feeStructures.map((item) => item.id === id ? (updated = { ...item, ...input, updatedAt: new Date().toISOString() }) : item);
    await saveFinanceState(state);
    return updated;
  }

  async deleteFeeStructure(id: string) {
    const state = await this.getState();
    const fee = state.feeStructures.find((item) => item.id === id);
    if (!fee) throw new Error("Fee structure not found.");
    if (state.invoices.some((item) => item.feeStructureId === id)) {
      throw new Error("This fee already has invoices. Deactivate it instead so existing records stay correct.");
    }
    state.feeStructures = state.feeStructures.filter((item) => item.id !== id);
    state.activity.unshift(`${fee.name} deleted.`);
    await saveFinanceState(state);
  }

  async getInvoices() { return (await this.getState()).invoices; }
  async getInvoiceById(id: string) { return (await this.getState()).invoices.find((item) => item.id === id); }

  async recordPayment(input: RecordPaymentInput) {
    const state = await this.getState();
    const invoice = state.invoices.find((item) => item.id === input.invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (input.amount <= 0) throw new Error("Payment amount must be greater than zero.");
    if (input.amount > invoice.outstandingBalance) throw new Error("Payment cannot exceed the outstanding balance.");
    if (!/^[A-Z0-9][A-Z0-9-]{5,39}$/i.test(input.reference)) throw new Error("Enter a valid transaction reference.");
    if (state.payments.some((item) => item.reference.toLowerCase() === input.reference.toLowerCase())) throw new Error("This payment reference already exists.");
    const payment: Payment = { id: uid("pay"), invoiceId: invoice.id, studentId: invoice.studentId, student: invoice.student, amount: input.amount, paymentDate: input.paymentDate, method: input.method, bankOrProvider: input.bankOrProvider, reference: input.reference, payerName: input.payerName, notes: input.notes, recordedBy: input.recordedBy, status: "Successful" };
    invoice.amountPaid += input.amount;
    invoice.outstandingBalance = Math.max(0, invoice.totalAmount - invoice.amountPaid);
    invoice.lastPaymentDate = input.paymentDate;
    invoice.status = statusFor(invoice.outstandingBalance, invoice.amountPaid, invoice.dueDate);
    const receipt: Receipt = { id: uid("receipt"), receiptNumber: `GFC-RCP-${new Date().getFullYear()}-${String(state.receipts.length + 423).padStart(5, "0")}`, paymentId: payment.id, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, student: invoice.student, parentOrPayer: input.payerName, amount: input.amount, paymentMethod: input.method, paymentDate: input.paymentDate, reference: input.reference, recordedBy: input.recordedBy, outstandingBalance: invoice.outstandingBalance, status: "Valid" };
    state.payments.unshift(payment);
    state.receipts.unshift(receipt);
    state.activity.unshift(`${payment.method} payment recorded for ${invoice.student}`);
    await saveFinanceState(state);
    return { payment, receipt };
  }

  async createFlutterwaveCheckout(input: CheckoutInput): Promise<CheckoutResponse> {
    void input;
    throw new Error("Flutterwave checkout must be created by the backend finance API.");
  }

  async getPayments() { return (await this.getState()).payments; }
  async getExpenses() { return (await this.getState()).expenses; }
  async recordExpense(input: RecordExpenseInput) {
    const state = await this.getState();
    if (!input.title.trim() || !input.category.trim() || input.amount <= 0 || !input.expenseDate) throw new Error("Title, category, amount and date are required.");
    const expense: Expense = { id: uid("exp"), schoolId: "school-001", title: input.title.trim(), category: input.category.trim(), amount: input.amount, expenseDate: input.expenseDate, note: input.note?.trim(), recordedBy: input.recordedBy, createdAt: new Date().toISOString() };
    state.expenses.unshift(expense);
    state.activity.unshift(`Expense recorded: ${expense.title}`);
    await saveFinanceState(state);
    return expense;
  }
  async getAdminStaffFinance() {
    const [state, academics] = await Promise.all([this.getState(), getAcademicsState()]);
    const rows: StaffFinanceRow[] = academics.staff.map((staff) => ({
      staffUserId: staff.userId,
      staffName: staffName(staff),
      email: staff.email,
      employeeNumber: staff.employeeNumber ?? staff.staffId,
      jobTitle: staff.jobTitle,
      isTeachingStaff: staff.isTeachingStaff,
      salaryAmount: staff.salaryAmount ?? 0,
      entries: state.staffFinanceEntries.filter((entry) => entry.staffUserId === staff.userId),
    }));
    return {
      staff: rows,
      teachers: rows.map((row) => ({ ...row, teacherId: row.staffUserId, teacherName: row.staffName })),
    };
  }
  async createStaffFinanceEntry(staffUserId: string, input: CreateStaffFinanceEntryInput) {
    const state = await this.getState();
    const academics = await getAcademicsState();
    const staff = academics.staff.find((item) => item.userId === staffUserId);
    if (!staff) throw new Error("Staff member not found.");
    if (!input.title.trim()) throw new Error("Title is required.");
    if (input.amount < 0) throw new Error("Amount cannot be negative.");
    if (input.type === "DEDUCTION" && input.payrollPeriod) {
      const salaryEntry = state.staffFinanceEntries.find((entry) => entry.staffUserId === staffUserId && entry.type === "SALARY" && entry.payrollPeriod === input.payrollPeriod);
      if (salaryEntry?.status === "PAID") throw new Error("This month's salary has already been paid. Add the deduction to a future payroll instead.");
      const gross = salaryEntry?.amount ?? staff.salaryAmount ?? 0;
      const deductions = state.staffFinanceEntries.filter((entry) => entry.staffUserId === staffUserId && entry.type === "DEDUCTION" && entry.payrollPeriod === input.payrollPeriod).reduce((sum, entry) => sum + entry.amount, 0);
      if (input.amount + deductions > gross) throw new Error("Deductions cannot be greater than this month's salary.");
    }
    const now = new Date().toISOString();
    const entry: StaffFinanceEntry = {
      id: uid("staff-fin"),
      staffUserId,
      type: input.type,
      title: input.title.trim(),
      amount: input.amount,
      status: input.status,
      dueDate: input.dueDate ?? null,
      paidAt: input.paidAt ?? (input.status === "PAID" ? now.slice(0, 10) : null),
      paymentMethod: input.paymentMethod ?? null,
      paymentReference: input.paymentReference ?? null,
      paymentNote: input.paymentNote ?? null,
      payrollPeriod: input.payrollPeriod ?? null,
      note: input.note?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    state.staffFinanceEntries.unshift(entry);
    state.activity.unshift(`${input.type === "SALARY" ? "Salary" : input.type === "BONUS" ? "Bonus" : input.type === "DEDUCTION" ? "Deduction" : input.type === "FINE" ? "Fine" : input.type === "OTHER_PAYMENT" ? "Other payment" : "Required payment"} saved for ${staffName(staff)}`);
    await saveFinanceState(state);
    return entry;
  }
  async createPayrollRun(period: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error("Choose a valid payroll month.");
    const state = await this.getState();
    const academics = await getAcademicsState();
    const eligible = academics.staff.filter((item) => item.status === "ACTIVE" && (item.salaryAmount ?? 0) > 0);
    const existing = new Set(state.staffFinanceEntries.filter((item) => item.type === "SALARY" && (item.payrollPeriod ?? item.dueDate?.slice(0, 7)) === period).map((item) => item.staffUserId));
    const lastDay = new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0).getDate();
    const dueDate = `${period}-${String(lastDay).padStart(2, "0")}`;
    const now = new Date().toISOString();
    let created = 0;
    for (const staff of eligible) {
      if (existing.has(staff.userId)) continue;
      state.staffFinanceEntries.unshift({
        id: uid("payroll"), staffUserId: staff.userId, type: "SALARY", title: `Salary · ${period}`,
        amount: staff.salaryAmount ?? 0, status: "YET_TO_BE_PAID", dueDate, payrollPeriod: period,
        createdAt: now, updatedAt: now,
      });
      created++;
    }
    if (created) {
      state.activity.unshift(`Payroll prepared for ${period} - ${created} staff salaries`);
      await saveFinanceState(state);
    }
    return { period, created, alreadyPrepared: created === 0 && eligible.length > 0 };
  }
  async updateStaffFinanceEntryStatus(entryId: string, status: StaffFinanceEntry["status"], input?: { method?: string; reference?: string; note?: string }) {
    const state = await this.getState();
    const index = state.staffFinanceEntries.findIndex((entry) => entry.id === entryId);
    if (index < 0) throw new Error("Finance entry not found.");
    const paid = status === "PAID";
    const updated: StaffFinanceEntry = {
      ...state.staffFinanceEntries[index],
      status,
      paidAt: paid ? new Date().toISOString().slice(0, 10) : null,
      paymentMethod: paid ? input?.method ?? state.staffFinanceEntries[index].paymentMethod : null,
      paymentReference: paid ? input?.reference ?? state.staffFinanceEntries[index].paymentReference : null,
      paymentNote: input?.note?.trim() || state.staffFinanceEntries[index].paymentNote,
      updatedAt: new Date().toISOString(),
    };
    state.staffFinanceEntries[index] = updated;
    if (paid && updated.type === "SALARY" && updated.payrollPeriod) {
      state.staffFinanceEntries = state.staffFinanceEntries.map((entry) => entry.staffUserId === updated.staffUserId && entry.type === "DEDUCTION" && entry.payrollPeriod === updated.payrollPeriod
        ? { ...entry, status: "PAID", paidAt: updated.paidAt, paymentMethod: "Withheld from salary", updatedAt: new Date().toISOString() }
        : entry);
    }
    state.activity.unshift(`${updated.title} marked ${status === "PAID" ? "paid" : "unpaid"}.`);
    await saveFinanceState(state);
    return updated;
  }
  async payStaffFinanceEntry(entryId: string, input: { method: string; reference: string; paymentDate?: string; note?: string }) {
    const state = await this.getState();
    const index = state.staffFinanceEntries.findIndex((entry) => entry.id === entryId);
    if (index < 0) throw new Error("Finance entry not found.");
    const entry = state.staffFinanceEntries[index];
    if (!["FINE", "REQUIRED_PAYMENT"].includes(entry.type)) throw new Error("Only fines and required payments can be paid.");
    if (!input.reference.trim()) throw new Error("Payment reference is required.");
    const updated: StaffFinanceEntry = {
      ...entry,
      status: "PAID",
      paidAt: input.paymentDate ?? new Date().toISOString().slice(0, 10),
      paymentMethod: input.method,
      paymentReference: input.reference.trim(),
      paymentNote: input.note?.trim() || null,
      updatedAt: new Date().toISOString(),
    };
    state.staffFinanceEntries[index] = updated;
    state.activity.unshift(`${entry.title} marked paid by staff.`);
    await saveFinanceState(state);
    return updated;
  }
  async getReceipts() { return (await this.getState()).receipts; }
  async matchTransaction(transactionId: string, invoiceId: string) {
    const state = await this.getState();
    const transaction = state.reconciliationTransactions.find((item) => item.id === transactionId);
    if (!transaction) throw new Error("Transaction not found.");
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (transaction.amount > invoice.outstandingBalance) throw new Error("Use split payment for an amount above this invoice balance.");
    const result = await this.recordPayment({ invoiceId, amount: transaction.amount, paymentDate: transaction.date, method: "Bank transfer", bankOrProvider: transaction.channel, reference: transaction.reference, payerName: transaction.payerName, notes: "Matched during reconciliation", recordedBy: "Amaka Okafor" });
    const latest = await this.getState();
    latest.reconciliationTransactions = latest.reconciliationTransactions.map((item) => item.id === transactionId ? { ...item, status: "Manually matched", suggestedStudent: invoice.student, suggestedInvoice: invoice.invoiceNumber, matchConfidence: 100 } : item);
    await saveFinanceState(latest);
    return result;
  }
  async getDebtors() { return (await this.getState()).invoices.filter((item) => item.outstandingBalance > 0).sort((a, b) => b.outstandingBalance - a.outstandingBalance); }
  async getParentInvoices(parentId: string) { return (await this.getState()).invoices.filter((item) => item.parentId === parentId); }
  async getStudentInvoices(studentId: string) { return (await this.getState()).invoices.filter((item) => item.studentId === studentId); }
  async simulateOnlinePayment(input: RecordPaymentInput, outcome: DemoPaymentOutcome) {
    if (outcome === "success") {
      const result = await this.recordPayment(input);
      return { outcome, payment: result.payment, receipt: result.receipt };
    }
    const state = await this.getState();
    const invoice = state.invoices.find((item) => item.id === input.invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    const payment: Payment = { id: uid("pay"), invoiceId: invoice.id, studentId: invoice.studentId, student: invoice.student, amount: input.amount, paymentDate: input.paymentDate, method: input.method, reference: input.reference, payerName: input.payerName, recordedBy: "Demo checkout", status: outcome === "failed" ? "Failed" : "Pending" };
    state.payments.unshift(payment);
    state.activity.unshift(`Demo payment ${outcome} for ${invoice.student}`);
    await saveFinanceState(state);
    return { outcome, payment };
  }
  async reset() { return resetFinanceState(); }
}

export const financeRepository: FinanceRepository = new LocalFinanceRepository();
