# Final Implementation Plan: Account Registration & User Discovery

---

## Phase 1 — User Entity & Unique Handle System

1. Update the `User` entity to include:
   - `displayName` — what others see (changeable)
   - `uniqueHandle` — e.g. `@name4821`, globally unique, immutable after set, indexed
   - `email` — indexed, unique
   - `passwordHash`
   - `emailVerified` (boolean, default false)
   - `privacySettings` — object with `whoCanMessage` field (values: `ANYONE`, `APPROVED_ONLY`)
   - `internalId` — UUID generated at creation, never exposed publicly
2. Auto-generate `uniqueHandle` at registration using: user-chosen prefix + random 4-digit suffix (e.g. `rahul.4821`). Handle must be unique across all users.
3. Add unique index on `uniqueHandle` and `email` in MongoDB.

---

## Phase 2 — Registration Flow (Backend)

1. `POST /api/v1/auth/register` accepts: `displayName`, `email`, `password`
2. Validate email not already taken. If taken, return error immediately.
3. Hash password and create a **pending** (unverified) user record with `emailVerified = false`.
4. Generate a verification code (6-digit OTP) and save it using the existing `EmailService` + token pattern already in the codebase.
5. Send verification email with the OTP.
6. Return a response telling the client to proceed to the email verification step.
7. `POST /api/v1/auth/verify-email` accepts: `email`, `code`
   - If valid and not expired: set `emailVerified = true`, auto-generate `uniqueHandle`, activate the account.
   - If invalid or expired: return error with option to resend.
8. `POST /api/v1/auth/resend-verification` — resend OTP (rate limited).

---

## Phase 3 — Login Flow (Backend)

1. `POST /api/v1/auth/login` accepts: `email`, `password`
2. Reject login if `emailVerified = false` with a clear message to verify email first.
3. On success: issue JWT access token + refresh token (existing refresh token system already in codebase).
4. Return `displayName`, `uniqueHandle`, `privacySettings` in the login response.

---

## Phase 4 — User Discovery (Backend)

1. `GET /api/v1/users/find?handle={uniqueHandle}` — exact match only, no partial/fuzzy search.
2. Returns: `displayName`, `uniqueHandle`, and whether a contact request is already pending/accepted.
3. No endpoint for searching by display name — display name search is disabled entirely.
4. Block lookup if the target user's `privacySettings.whoCanMessage = NOBODY`.

---

## Phase 5 — Contact Request System (Backend)

1. New `ContactRequest` collection with fields: `fromUserId`, `toUserId`, `status` (`PENDING`, `ACCEPTED`, `REJECTED`), `createdAt`.
2. `POST /api/v1/contacts/request` — send a contact request by `uniqueHandle`.
   - Blocked if: target has `whoCanMessage = NOBODY`, request already exists, users already connected.
   - If target has `whoCanMessage = ANYONE`: auto-accept.
3. `GET /api/v1/contacts/requests` — list incoming pending requests.
4. `POST /api/v1/contacts/request/{id}/accept` — accept a request, creates the contact link.
5. `POST /api/v1/contacts/request/{id}/reject` — reject a request.
6. Only accepted contacts can open a DM conversation with each other.

---

## Phase 6 — Privacy Settings (Backend)

1. `GET /api/v1/users/me/privacy` — return current privacy settings.
2. `PATCH /api/v1/users/me/privacy` — update `whoCanMessage` setting.
   - Allowed values: `ANYONE`, `APPROVED_ONLY` (default), `NOBODY`
3. Enforce this setting on every contact request and DM initiation check.

---

## Phase 7 — Registration & Login UI (Frontend)

1. Registration screen flow (3 steps on one page or stepper):
   - Step 1: Enter `displayName`, `email`, `password`
   - Step 2: Enter 6-digit OTP from email
   - Step 3: Success — show generated `uniqueHandle` to the user
2. Login screen: `email` + `password`. If unverified, redirect to OTP step.
3. Show the user their `uniqueHandle` prominently in profile/settings so they can share it.

---

## Phase 8 — User Discovery & Contact Request UI (Frontend)

1. "Add Contact" screen: single input for exact `uniqueHandle` search.
2. Show result card with `displayName` and `uniqueHandle` if found.
3. "Send Request" button — shows pending state after sent.
4. Notification badge / list for incoming contact requests.
5. Accept / Reject buttons on each incoming request.
6. Only show DM option for accepted contacts.

---

## Phase 9 — Privacy Settings UI (Frontend)

1. Settings page section: "Who can message me?"
2. Radio group: `Anyone` / `Approved Only` / `Nobody`
3. Save button — calls the PATCH privacy endpoint.

---

## Notes

- Do not implement global display-name search at any point.
- `uniqueHandle` is set once at account activation and cannot be changed by the user.
- The existing `EmailService`, `RefreshTokenService`, and `SecurityAuditService` already in the codebase should be reused — do not rebuild them.
- All phases should have unit + integration tests before moving to the next phase.
