# PR #120 follow-up: Tenant dashboard quick actions + mobile login

**Branch:** `feature/tenant-self-service-onboarding`  
**PR:** #120  
**Base:** `develop`  
**Repo:** imkpk/smart-parking-system  
**Date received:** 2026-06-20

---

Update existing PR #120 on branch feature/tenant-self-service-onboarding.

Repo: imkpk/smart-parking-system
PR: #120
Base: develop
Branch: feature/tenant-self-service-onboarding

Goal:
Improve tenant admin onboarding/dashboard usability and add mobile-number login with password for the MVP.

Important:

* Do not merge into develop.
* Update the existing PR only.
* Do not change payment-service.
* Do not change deployment/Vercel/Render config.
* Do not add OTP implementation in this PR.
* Keep OTP as a documented future enhancement.
* Build frontend and backend before finishing.

Part 1: Tenant Admin dashboard quick actions

When a TENANT_ADMIN logs in, the tenant/admin dashboard should show clear quick action buttons at the top.

Add quick action buttons:

* Create Parking Lot
* Create Floor
* Create Slot
* Create User
* Create Admin
* Create Security

Behavior:

* These buttons should route/open existing create dialogs/pages if already available.
* Do not create a large redesign.
* Keep the dashboard simple and demo-friendly.
* TENANT_ADMIN should be able to manage a small apartment alone without creating a separate ADMIN or SECURITY user.

Button availability rules:

* Create Parking Lot: enabled for TENANT_ADMIN and ADMIN.
* Create Floor: enabled only if parking lot flow exists; if no parking lot exists, show disabled state or helper text "Create parking lot first".
* Create Slot: should be enabled for TENANT_ADMIN and ADMIN when a floor exists.
* If no floor exists, disable Create Slot and show helper text "Create floor first".
* Create User: enabled for TENANT_ADMIN and ADMIN.
* Create Admin: enabled for TENANT_ADMIN only.
* Create Security: enabled for TENANT_ADMIN and ADMIN.

Part 2: Fix create slot disabled issue

Bug:
I logged in as TENANT_ADMIN and the Create Slot button is disabled.

Expected:

* TENANT_ADMIN must be allowed to create slots.
* ADMIN must also be allowed to create slots.
* SECURITY and USER must not create slots.
* If Create Slot is disabled only because no floor exists, show a clear reason.
* If a floor exists and TENANT_ADMIN still cannot create slot, fix the frontend permission/disabled logic.
* Also verify backend slot create endpoint allows TENANT_ADMIN.

Part 3: Mobile number + password login

Add MVP-friendly login using email OR mobile number with password.

Login UI:

* Replace/adjust email field label to: Email or mobile number
* User should be able to type: 9876543210, +919876543210, user@example.com
* Password field stays required.
* Keep password show/hide toggle.
* Do not add OTP UI in this PR.

Backend login:

* Update login DTO/service to accept an identifier field or support existing email field as emailOrPhone without breaking frontend.
* Allow login by: email + password, phone + password
* Phone normalization: 10 Indian digits → +91XXXXXXXXXX; +91XXXXXXXXXX kept as-is.
* Existing email login must continue working.
* SUPER_ADMIN login must continue working.
* Tenant-scoped users must continue to be organization-safe.
* If duplicate matching phone/email ambiguity exists, return a safe error asking user to contact support.

Part 4: Email optional for tenant-created users

For users created by TENANT_ADMIN/ADMIN:

* Name is required.
* Phone is required.
* Email should be optional.
* Password is required for now.
* Role is required.
* Phone should be stored normalized as +91XXXXXXXXXX.
* Do not require email for SECURITY or USER accounts.
* If current database uniqueness requires email, update schema carefully to allow nullable email while preserving uniqueness where applicable.
* Existing users with email should continue to work.

Important data rules:

* Phone should be unique inside the organization.
* Email, when provided, should be unique inside the organization.
* Do not allow cross-organization access.
* Do not expose passwordHash.

Part 5: Future OTP note only

Do not implement OTP now.

Add a short TODO/comment or documentation note:
Future login options: mobile + OTP, email + OTP, password reset via OTP.
These require SMS/email provider, OTP expiry, resend limit, and rate limiting.

Validation:
Backend: cd backend && npm run build && npm test
Frontend: cd frontend && npm run build

Manual checklist:

* TENANT_ADMIN sees quick action buttons on dashboard.
* TENANT_ADMIN can create parking lot/floor/slot.
* Create Slot is not incorrectly disabled for TENANT_ADMIN.
* Create Slot shows clear disabled reason only when floor is missing.
* TENANT_ADMIN can create ADMIN, SECURITY, USER.
* ADMIN can create SECURITY and USER.
* SECURITY cannot create users/lots/floors/slots.
* USER cannot see admin buttons.
* Login works with email + password.
* Login works with 10-digit mobile + password.
* Login works with +91 mobile + password.
* Public signup still creates Organization + TENANT_ADMIN.
* SUPER_ADMIN bootstrap/login still works.
* No localhost payment URLs appear in frontend production build.

Update PR #120 and stop. Do not merge.