# PR #120 follow-up: Tenant dashboard quick actions + mobile login

**Branch:** `feature/tenant-self-service-onboarding`  
**PR:** https://github.com/imkpk/smart-parking-system/pull/120  
**Prompt:** `.grok/prompts/pr120-tenant-dashboard-mobile-login.md`  
**Date:** 2026-06-20

## Summary

Extended PR #120 with tenant-admin onboarding UX and phone/email password login for MVP.

## Backend

- **Login:** `LoginDto.email` now accepts email or Indian mobile (`9876543210`, `+919876543210`). Normalizes 10-digit input to `+91XXXXXXXXXX`. Duplicate matches return a safe conflict message.
- **Users:** `CreateUserDto` requires phone; email optional. Phones normalized on create. Migration `20260620180000_user_email_optional` makes `users.email` nullable.
- **OTP:** Future note added in `auth.service.ts` (not implemented).
- **Slots:** `TENANT_ADMIN` already allowed on `POST /floors/:floorId/slots` — no backend change needed.

## Frontend

- **Dashboard:** `TenantAdminQuickActions` on tenant admin dashboard (top) with Create Parking Lot/Floor/Slot/User/Admin/Security. Disabled states + tooltips when lot/floor missing. Routes use `?create=1` to open existing dialogs.
- **Create user:** `CreateUserDialog` wired to `POST /users` with optional email and required +91 phone.
- **Login:** Label "Email or mobile number"; same API field `email`.
- **Slots:** Tooltip "Create floor first" when Create Slot/Bulk Create disabled (no floors).

## Validation

| Check | Result |
|-------|--------|
| `backend` build | Pass |
| `backend` tests | 329 passed |
| `frontend` build | Pass |
| Login/dashboard tests | Pass |
| payment-service | Not changed |

## Manual checklist (for reviewer)

- [ ] TENANT_ADMIN quick actions on dashboard
- [ ] Create lot → floor → slot flow via quick actions
- [ ] Login with email / 10-digit phone / +91 phone
- [ ] Create SECURITY/USER without email
- [ ] SUPER_ADMIN login unchanged
- [ ] PR not merged to `develop`