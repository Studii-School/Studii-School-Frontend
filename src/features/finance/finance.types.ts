export type FeeCategory="Tuition"|"Development levy"|"Examination fee"|"Uniform"|"Books"|"Transport"|"Boarding"|"Feeding"|"PTA levy"|"Technology fee"|"Excursion"|"Graduation"|"Other";
export type FeeStructureStatus="Active"|"Draft"|"Archived";
export type InvoiceStatus="Unpaid"|"Partially paid"|"Paid"|"Overdue"|"Waived"|"Cancelled";
export type PaymentMethod="Flutterwave"|"Online card payment"|"Bank transfer"|"Cash"|"POS"|"USSD"|"Cheque"|"Mobile money"|"Other";
export type ReconciliationStatus="Auto-matched"|"Manually matched"|"Unmatched"|"Duplicate"|"Amount mismatch"|"Reversed";
export interface FeeStructure{id:string;schoolId?:string;name:string;academicSession:string;term:string;classGroup:string;classIds?:string[];applicableToAllStudents?:boolean;category:FeeCategory;amount:number;isMandatory:boolean;dueDate:string;allowInstalments:boolean;numberOfInstalments:number;firstInstalmentPercentage?:number;paymentFrequency?:string;latePenalty:number;discountEligible?:boolean;description:string;status:FeeStructureStatus;effectiveDate?:string;createdByUserId?:string;createdAt?:string;updatedAt?:string;studentsAssigned:number;expectedRevenue:number}
export interface StudentInvoice{id:string;schoolId?:string;invoiceNumber:string;studentId:string;student:string;admissionNumber:string;guardianId?:string;parentId:string;parent:string;parentPhone:string;classId?:string;className:string;feeStructureId?:string;academicSession:string;term:string;totalAmount:number;amountPaid:number;outstandingBalance:number;dueDate:string;status:InvoiceStatus;paymentPlan:string;lastPaymentDate?:string}
export interface Payment{id:string;schoolId?:string;invoiceId:string;studentId:string;student:string;amount:number;paymentDate:string;method:PaymentMethod;bankOrProvider?:string;reference:string;payerName:string;notes?:string;recordedBy:string;status:"Successful"|"Failed"|"Pending";providerTransactionId?:string;txRef?:string}
export interface Expense{id:string;schoolId?:string;title:string;category:string;amount:number;expenseDate:string;note?:string;recordedBy:string;createdAt?:string}
export interface PaymentPlanInstalment{id:string;dueDate:string;amount:number;status:"Paid"|"Due"|"Upcoming"}
export interface PaymentPlan{id:string;invoiceId:string;name:string;instalments:PaymentPlanInstalment[]}
export interface Receipt{id:string;receiptNumber:string;paymentId:string;invoiceId:string;invoiceNumber:string;student:string;parentOrPayer:string;amount:number;paymentMethod:PaymentMethod;paymentDate:string;reference:string;recordedBy:string;outstandingBalance:number;status:"Valid"|"Void"}
export interface ReconciliationTransaction{id:string;reference:string;payerName:string;amount:number;date:string;channel:string;suggestedStudent?:string;suggestedInvoice?:string;matchConfidence:number;status:ReconciliationStatus;narrative:string}
export interface FinanceSummary{totalExpected:number;amountCollected:number;outstandingAmount:number;collectionRate:number;transactionCount:number;reconciliationRate:number;needsReview:number;totalExpenses?:number;currentBalance?:number}
export interface PaymentReminder{id:string;invoiceId:string;channels:("Email"|"SMS"|"WhatsApp")[];message:string;sentAt?:string}
export interface RecordPaymentInput{invoiceId:string;amount:number;paymentDate:string;method:PaymentMethod;bankOrProvider?:string;reference:string;payerName:string;notes?:string;recordedBy:string}
export interface RecordExpenseInput{title:string;category:string;amount:number;expenseDate:string;note?:string;recordedBy:string}
export interface CheckoutInput{invoiceId:string;amount:number;customerEmail?:string;customerName?:string;studentName?:string;invoiceNumber?:string;txRef?:string}
export interface CheckoutResponse{checkoutUrl:string;txRef:string}
export interface FinanceState{feeStructures:FeeStructure[];invoices:StudentInvoice[];payments:Payment[];receipts:Receipt[];expenses:Expense[];reconciliationTransactions:ReconciliationTransaction[];paymentPlans:PaymentPlan[];activity:string[]}
export type DemoPaymentOutcome="success"|"failed"|"delayed";
