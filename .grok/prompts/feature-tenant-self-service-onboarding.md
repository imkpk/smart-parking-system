# Feature: Tenant Self-Service Onboarding + Platform Super Admin

**Branch:** `feature/tenant-self-service-onboarding`  
**PR title:** `feat(saas): add tenant self-service onboarding and platform super admin`  
**Base:** `develop`  
**Date received:** 2026-06-20

---

You are working on the Smart Parking SaaS platform.

Repo: imkpk/smart-parking-system
Base branch: develop
Create/work on branch: feature/tenant-self-service-onboarding
PR title: feat(saas): add tenant self-service onboarding and platform super admin

Important workflow:

* Do NOT commit directly to develop.
* Create/use feature branch: feature/tenant-self-service-onboarding.
* develop is currently hosted/stable, so do not deploy or merge automatically.
* Implement iteratively in small safe steps.
* After each backend step, run backend build.
* After each frontend step, run frontend build.
* If a build/test fails, fix it before continuing.
* Open/update a PR from feature/tenant-self-service-onboarding into develop and stop.
* Do NOT merge the PR automatically.

Goal:
Make Smart Parking a simple SaaS product that supports:

* small apartments
* large apartments
* malls
* hospitals
* offices
* public parking operators

Role model:

* SUPER_ADMIN: platform owner/operator. This is me. Not created from public signup.
* TENANT_ADMIN: first person who signs up for an organization. For a small apartment, this person can manage everything alone.
* ADMIN: manager/staff inside the same organization.
* SECURITY: watchman/gate operator for check-in/check-out.
* USER: resident/customer/employee who uses parking.

Product rule:
Public signup should create a new organization and the first TENANT_ADMIN for that organization.
Public signup should NOT create a normal USER inside the default/demo organization.

Critical safety rules:

* Do not break existing login.
* Do not break existing deployed Vercel routing.
* Do not change payment-service.
* Do not change Render/Vercel/domain deployment config.
* Do not remove existing seed/demo data.
* Do not expose cross-organization data.
* Do not allow public signup to create SUPER_ADMIN.
* Do not allow public signup to choose arbitrary role from browser/client.
* Do not store or expose password hashes in API responses.
* Do not weaken role or organization access control to make tests pass.

Backend requirements:

1. SUPER_ADMIN model

* SUPER_ADMIN lives in the same users table.
* SUPER_ADMIN should have organizationId = null.
* SUPER_ADMIN is the platform owner/operator.
* SUPER_ADMIN is not attached to any tenant organization.
* SUPER_ADMIN must be created only by a seed/bootstrap script.
* SUPER_ADMIN must be able to login with normal email/password.
* SUPER_ADMIN login must work even when organizationId is null.

2. SUPER_ADMIN bootstrap script

* Add a safe bootstrap script to create/update the platform SUPER_ADMIN.
* Use environment variables:
  SUPER_ADMIN_NAME
  SUPER_ADMIN_EMAIL
  SUPER_ADMIN_PASSWORD
* Hash password with bcrypt.
* Upsert by email.
* Set:
  role = SUPER_ADMIN
  organizationId = null
  isActive = true
* Do not hardcode real credentials.
* Do not print password in logs.
* Add package.json script if appropriate, for example:
  npm run seed:super-admin
* Document exactly how to run it locally and in production.

3. Login behavior

* Update login lookup so SUPER_ADMIN with organizationId = null can login.
* Normal tenant users must still login safely.
* JWT should include:
  sub
  email
  role
  organizationId
* For SUPER_ADMIN, organizationId can be null.
* Existing tenant-scoped endpoints should continue to reject missing organization context unless explicitly made SUPER_ADMIN-safe.

4. Public tenant signup

* Update public /auth/register so it creates:
  Organization
  first TENANT_ADMIN user
* Public signup request should include:
  organizationName
  organizationType
  name
  email
  phone
  password
* Organization type values:
  APARTMENT, MALL, HOSPITAL, OFFICE, PUBLIC
* Generate organization slug safely from organization name.
* If slug already exists, append a unique suffix.
* First signup user role must always be TENANT_ADMIN.
* Public signup must ignore/remove any client-supplied role.
* Public signup must never use DEFAULT_ORGANIZATION_ID for the new tenant account.
* Public signup must never create SUPER_ADMIN.
* Return the same auth response shape:
  user
  accessToken

5. Tenant isolation

* Ensure newly created tenant admin only sees their own organization data.
* Existing default/demo seed data should remain, but must not appear for newly created tenants.
* All organization data must be scoped by currentUser.organizationId.
* Do not allow cross-organization parking lots, floors, slots, bookings, vehicles, users, or reports.

6. Role permissions
   Implement/confirm these permissions:

SUPER_ADMIN:

* Platform-level user.
* Can login without organizationId.
* For this PR, full platform UI can be placeholder only.
* Do not force SUPER_ADMIN into tenant-scoped screens.

TENANT_ADMIN:

* Full control inside own organization.
* Can create ADMIN, SECURITY, USER.
* Can create/manage parking lots.
* Can create/manage floors.
* Can create/manage slots.
* Can perform check-in/check-out if the tenant is small and has no security guard.
* Can see user counts/reports.

ADMIN:

* Scoped to own organization.
* Can create SECURITY and USER.
* Can manage parking lots, floors, and slots.
* Can perform check-in/check-out.
* Can see user counts/reports.
* Cannot create TENANT_ADMIN.
* Cannot create SUPER_ADMIN.

SECURITY:

* Scoped to own organization.
* Can check-in/check-out.
* Can view active parking events.
* Cannot manage users.
* Cannot manage lots/floors/slots.

USER:

* Scoped to own account/organization.
* Can manage own vehicles.
* Can book parking.
* Can view own bookings/payments/history.
* Cannot access admin pages or tenant management.

7. Admin user creation

* Add/update POST /users.
* TENANT_ADMIN can create ADMIN, SECURITY, USER.
* ADMIN can create SECURITY and USER.
* SECURITY and USER cannot create users.
* Created users must be scoped to creator's organizationId.
* Do not allow creating SUPER_ADMIN from this endpoint.
* Do not allow ADMIN to create TENANT_ADMIN.
* Hash generated/provided password safely.
* Return safe user only, never passwordHash.

8. User summary

* Add GET /users/summary.
* Allow TENANT_ADMIN and ADMIN.
* Scope by current user organizationId.
* Return:
  totalUsers
  activeUsers
  inactiveUsers
  tenantAdmins
  admins
  security
  users

9. Parking lot/floor/slot permissions

* TENANT_ADMIN and ADMIN can create/manage parking lots, floors, and slots.
* SECURITY and USER cannot create/manage parking structure.
* Ensure all these records are organization-scoped.
* Do not break existing lot/floor/slot APIs.

Frontend requirements:

10. Public signup UI

* Update create account form for tenant self-service signup.
* Fields:
  Organization name
  Organization type
  Full name
  Email
  Phone
  Password
* Do not send role from public signup.
* Public signup should create a new organization + TENANT_ADMIN.
* After successful signup/login, route TENANT_ADMIN to tenant/admin dashboard.

11. Phone UX

* Show +91 prefix visually.
* Let user type only 10 Indian digits.
* Validate 10 digits.
* Submit phone to backend as +91XXXXXXXXXX.
* User should not need to manually type +91.

12. Password visibility

* Add show/hide password toggle to create account password field.
* Add show/hide password toggle to login password field.
* Do not change auth API contract.

13. Login UI behavior

* Keep existing login working.
* Route after login by role:
  SUPER_ADMIN -> Platform Admin placeholder page
  TENANT_ADMIN -> tenant/admin dashboard
  ADMIN -> admin dashboard
  SECURITY -> security dashboard
  USER -> user/resident dashboard

14. SUPER_ADMIN UI placeholder

* Add a simple safe placeholder page if full platform UI is not ready:
  Title: Platform Admin
  Message: Tenant management coming soon
* Do not show tenant-scoped demo data incorrectly to SUPER_ADMIN.
* Do not overbuild full platform dashboard in this PR.

15. Tenant/Admin UX

* TENANT_ADMIN should be able to manage everything for a small apartment without creating separate ADMIN or SECURITY.
* TENANT_ADMIN and ADMIN should see management menus.
* SECURITY should see check-in/check-out operational menus.
* USER should see resident/customer menus only.
* Do not show admin menus to USER.

16. User summary card

* Show organization user counts on admin/tenant dashboard if a dashboard area exists.
* Use GET /users/summary.
* Keep UI simple. Avoid a large redesign.

Validation loop:

Backend:
cd backend
npm run build
npm test if available

Frontend:
cd frontend
npm run build

Manual validation checklist:

* Run super admin bootstrap script with env vars.
* SUPER_ADMIN can login.
* SUPER_ADMIN has organizationId = null.
* SUPER_ADMIN does not get forced into tenant-scoped dashboard incorrectly.
* Public signup creates a new organization.
* Public signup creates first user as TENANT_ADMIN.
* Public signup does not send or accept role.
* New TENANT_ADMIN does not see default/demo organization data.
* TENANT_ADMIN can create parking lot/floor/slot.
* TENANT_ADMIN can create ADMIN, SECURITY, USER.
* TENANT_ADMIN can perform check-in/check-out.
* ADMIN can create SECURITY and USER.
* ADMIN cannot create TENANT_ADMIN or SUPER_ADMIN.
* SECURITY cannot create users.
* USER cannot access admin pages.
* Existing login still works.
* Phone stores normalized +91XXXXXXXXXX.
* Password show/hide works on login and signup.
* Frontend does not call localhost payment URLs in production build.

Iteration rules:

* Work in small commits.
* After each backend change, build backend.
* After each frontend change, build frontend.
* If any build/test fails, fix before continuing.
* If a requirement conflicts with current architecture, pause and explain the blocker in the PR description.
* Do not delete existing functionality.
* Do not weaken security.
* Do not merge into develop.

Final PR requirements:
Open/update PR from feature/tenant-self-service-onboarding into develop.

PR description must include:

* Summary
* Backend changes
* Frontend changes
* SUPER_ADMIN bootstrap instructions
* Public signup behavior
* Role/permission behavior
* Validation results
* Manual test checklist
* Known limitations

Stop after opening/updating the PR.