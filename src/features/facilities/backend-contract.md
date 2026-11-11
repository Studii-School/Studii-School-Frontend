# Facilities backend contract

The web client uses the school's authenticated API configured through `NEXT_PUBLIC_API_URL`. Facility data is scoped to the active school on the server. The frontend uses local browser storage only when there is no API session; that is for demo/offline use and is not a shared school database.

## State

`GET /facilities` returns `{ "facilities": { "books": [], "loans": [], "routes": [], "transportAssignments": [], "pickupUpdates": [], "healthRecords": [], "assets": [], "maintenanceRequests": [] } }`. Each record has an id, `schoolId`, and timestamps. The API must return only records the signed-in user may access.

## Mutations

- `POST /facilities/library/books` creates a catalogue entry.
- `POST /facilities/library/loans` issues a copy and decrements availability in the same transaction.
- `POST /facilities/library/requests` creates a student or parent request without reserving a copy.
- `POST /facilities/library/requests/:loanId/issue` approves a request and atomically reserves a copy.
- `POST /facilities/library/requests/:loanId/decline` declines a pending request.
- `POST /facilities/library/loans/:loanId/return` returns an issued copy, increments availability once, and is idempotent.
- `POST /facilities/transport/routes` creates a route and vehicle record.
- `POST /facilities/transport/assignments` creates or updates a student's active route assignment. Enforce one active route assignment per student and school.
- `POST /facilities/transport/pickup-updates` records a pickup change or route notice.
- `POST /facilities/health/records` records an allergy, medication, condition, emergency contact, or incident.
- `POST /facilities/inventory/assets` creates an asset record.
- `PATCH /facilities/inventory/assets/:assetId` updates asset condition or maintenance date.
- `POST /facilities/inventory/maintenance-requests` creates a repair or supply request.
- `PATCH /facilities/inventory/maintenance-requests/:requestId` updates request status.

Mutations return the updated facility state or an `{ "item": ... }` response. Return validation errors as a non-2xx response with `{ "message": "..." }`.

## Authorization and data rules

- Administrators can manage all four modules within their school.
- Teachers can issue/return library books, view transport and essential health information for assigned classes, report incidents and report maintenance issues.
- Students can request books and see their own loans, transport plan, pickup updates and health information.
- Parents can request books and view only their linked children's loans, transport plan, pickup updates and health information.
- Inventory is not available to parent or student accounts.
- Do not expose incident narratives or unrelated health details to teachers. Only return essential care alerts and emergency contacts for assigned students.
- Enforce school isolation, linked child/student ownership, assigned-class access, role permissions, positive copy/quantity counts, valid route and student references, and duplicate prevention on the API. Do not rely on client-side filtering for security.
- Store medical and emergency records with the same encryption, audit and retention controls as other sensitive student records. Record the actor and timestamps server-side.

## Persistent models

Use tenant-scoped records for `LibraryBook`, `LibraryLoan`, `SchoolRoute`, `TransportAssignment`, `PickupUpdate`, `HealthRecord`, `InventoryAsset`, and `MaintenanceRequest`. Index `(schoolId, status)`, `(schoolId, studentId)`, ISBN/asset tag within a school, and route/loan references. A loan return and copy count update must be one transaction; health and inventory mutations must include actor audit details.
