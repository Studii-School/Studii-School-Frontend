# Finance Backend Contract

This frontend expects the NestJS API to expose authenticated, school-scoped endpoints under `/finance`.

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

The checkout endpoint should create a unique `tx_ref` linked to `schoolId`, `invoiceId`, and `studentId`, use `NGN`, and return `{ checkoutUrl, txRef }`.

Webhook and callback handlers must verify the Flutterwave transaction server-side before updating records. Confirm `status`, `tx_ref`, `currency`, and `amount`; enforce parent/student invoice ownership and school isolation; and process each Flutterwave transaction id or `tx_ref` idempotently so repeated events cannot create duplicate `PaymentTransaction` rows.

Suggested Prisma models:

- `FeeStructure`
- `StudentInvoice`
- `InvoiceItem`
- `PaymentTransaction`
- `Expense`

Every model should include `schoolId`, timestamps, and indexes for tenant-safe lookups.
