# Finance Backend Contract

This frontend expects the NestJS API to expose authenticated, school-scoped endpoints under `/finance`.

`GET /finance` supplies the complete ledger authorized for the signed-in role, across all terms. The provider fetches this once per refresh; client views share that snapshot. Student and parent authorization must be enforced by the API. Teachers use `/finance/teacher` for payroll and `/finance/teacher/student-status` for assigned-student fee status.

Finance pages default to all terms. `financePeriod=term` explicitly filters invoices by the selected academic period and follows class navigation. Payments and receipts inherit the invoice's period, even when paid later. Collections count successful payments only; expected balances exclude cancelled and waived invoices. Paid accounts are distinct students with no remaining billable balance. An API error must be shown and must not replace live records with local demo data.

Required Flutterwave environment variables in the NestJS backend `.env`:

- `FLW_PUBLIC_KEY`
- `FLW_SECRET_KEY`
- `FLW_ENCRYPTION_KEY`
- `FLW_SECRET_HASH`
- `FLW_CALLBACK_URL`
- `FLW_REDIRECT_URL`

Minimum endpoints:

- `GET /finance`
- `GET /finance/summary`
- `POST /finance/fee-structures`
- `POST /finance/fee-structures/:id/activate`
- `GET /finance/invoices`
- `POST /finance/payments/manual`
- `GET /finance/payments`
- `POST /finance/payments/flutterwave/checkout`
- `POST /finance/payments/flutterwave/callback`
- `POST /finance/payments/flutterwave/webhook`
- `POST /finance/expenses`
- `GET /finance/expenses`
- `GET /finance/receipts`
- `GET /finance/admin/teachers`
- `POST /finance/admin/teachers/:staffUserId/entries`
- `POST /finance/admin/payroll/runs`
- `PATCH /finance/admin/entries/:entryId/status`
- `GET /finance/teacher`
- `GET /finance/teacher/student-status`

`GET /finance/admin/teachers` powers the admin "Staff Finance" workspace. Keep the existing route name for compatibility, but return all staff, not only teaching staff:

```json
{
  "staff": [
    {
      "staffUserId": "staff-user-001",
      "staffName": "Ada Okafor",
      "email": "ada@example.com",
      "employeeNumber": "STF-001",
      "jobTitle": "Accountant",
      "isTeachingStaff": false,
      "salaryAmount": 250000,
      "entries": []
    }
  ]
}
```

For older frontend builds, the same response may also include a `teachers` array using `teacherId` and `teacherName` aliases.

`POST /finance/admin/teachers/:staffUserId/entries` accepts `{ type, title, amount, status, dueDate?, payrollPeriod?, paymentMethod?, paymentReference?, note? }`. `type` supports `SALARY`, `BONUS`, `DEDUCTION`, `FINE`, `REQUIRED_PAYMENT`, and `OTHER_PAYMENT`; `status` is `YET_TO_BE_PAID`, `PENDING`, `BEING_PAID`, or `PAID`. `payrollPeriod` is `YYYY-MM` and associates a salary or deduction with one monthly payroll.

`POST /finance/admin/payroll/runs` accepts `{ "period": "YYYY-MM" }`. It should idempotently prepare one salary entry for each active staff member with a configured base salary and return `{ period, created, alreadyPrepared? }`. Preparing a payroll must not initiate bank transfers or mark salaries as paid.

`PATCH /finance/admin/entries/:entryId/status` accepts `{ status, paymentMethod?, paymentReference?, paymentNote? }`. Only an authorized school finance administrator can mark a salary or other staff payment as paid. Validate and persist payment references and the paid date server-side.

When a monthly salary entry is marked paid, mark the deductions for that staff member and payroll period as applied as part of the same database transaction. Reject new deductions for a payroll period after its salary has been paid.

Every staff finance entry should return `payrollPeriod` where applicable. Deductions reduce the staff member's take-home amount for that payroll period. The API should reject a deduction total greater than gross salary or return a clear validation error for administrator review.

The checkout endpoint should create a unique `tx_ref` linked to `schoolId`, `invoiceId`, and `studentId`, use `NGN`, and return `{ checkoutUrl, txRef }`.

Webhook and callback handlers must verify the Flutterwave transaction server-side before updating records. Confirm `status`, `tx_ref`, `currency`, and `amount`; enforce parent/student invoice ownership and school isolation; and process each Flutterwave transaction id or `tx_ref` idempotently so repeated events cannot create duplicate `PaymentTransaction` rows.

Suggested Prisma models:

- `FeeStructure`
- `StudentInvoice`
- `InvoiceItem`
- `PaymentTransaction`
- `Expense`
- `StaffFinanceEntry`

Every model should include `schoolId`, timestamps, and indexes for tenant-safe lookups.
