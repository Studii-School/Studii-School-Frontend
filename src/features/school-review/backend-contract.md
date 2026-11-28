# School invitation and review API contract

The frontend now uses the existing school profile, academic period, and school level save APIs. The backend still needs the following invitation and review operations for the complete journey:

- `POST /schools/invitations` (super administrator): accepts `{ "email": "school@example.com" }`, creates a school invitation, and emails a one-time link to `/school-onboarding?invite=<token>`. Return `{ "invitationId": "...", "email": "school@example.com" }` only when delivery is accepted, or an error if the email cannot be sent. Repeated requests should have an explicit resend or expiry policy.
- `POST /auth/school-invitations/accept` (public): accepts `{ "token": "..." }` and returns `{ "accessToken": "...", "user": { "role": "SCHOOL_ADMIN", "schoolId": "...", "school": { "id": "...", "status": "..." } } }`. It must reject expired or reused tokens and associate the administrator with the invited school.
- `POST /schools/me/onboarding/submit` (school administrator): marks the authenticated school `UNDER_REVIEW` only after its profile is saved. `GET /auth/profile`, `GET /schools`, and `GET /schools/:id` must expose that status.
- `POST /schools/:id/onboarding/approve` (super administrator): approves a reviewed school, returns the school with `status: "ACTIVE"`, and makes the updated status visible to the school administrator through `GET /auth/profile`.

The platform review panel reads the existing `GET /schools/:id/settings` endpoint. The super administrator role needs read access to that school's saved profile to review it; the panel disables approval when that request fails.

The server must also reject student and staff creation/import and admissions enrollment for an `UNDER_REVIEW` school. The frontend disables the corresponding controls and routes, but client-side restrictions alone cannot protect these APIs. KYC document upload and email/phone OTP verification remain preview-only until backend endpoints exist.
