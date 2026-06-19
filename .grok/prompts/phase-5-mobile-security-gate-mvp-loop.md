implement this prompt strictly PHASE 5 — Mobile Security Gate + In-App Chat MVP

Repository:
`https://github.com/imkpk/smart-parking-system`

Base branch:
`develop`

Important:
Work in fast product build mode. Build the requested product features. Do not waste time creating broad test suites, long reports, or process-only PRs.

Current product state:

* Phase 1 complete: multi-tenancy.
* Phase 2 complete: white-label branding.
* Phase 3 complete: operator dashboard.
* Phase 4 complete: visual slot map.
* Phase 4E UI polish complete.
* No Phase 5 implementation exists yet.

Before coding:

* Pull latest `develop`.
* Confirm there are no open PRs.
* Read:

  * `MASTER_PROMPT.md`
  * `.grok/AGENTS.md`
  * backend Prisma schema
  * existing check-in / check-out / bookings / parking-events APIs
  * existing frontend security dashboard, bookings, parking events, and app shell routes

First cleanup:

* `MASTER_PROMPT.md` currently has stale Phase 4E current-branch/in-progress text.
* Update it only as needed so it says Phase 5 is now in progress.
* Do not rewrite unrelated docs.

Goal:
Implement Phase 5 in small focused PRs:

1. Mobile Security Gate
2. User ↔ Security / Customer Care Chat MVP
3. Phase 5 final smoke/cleanup

Product goals:

* Security staff should check in/out vehicles quickly on a phone.
* Users should be able to contact security before arriving at the parking location.
* Users should be able to contact customer care for booking/payment/general help.
* Chat must be tenant-scoped, role-aware, and linked to a parking lot or booking where possible.

Do not:

* Do not touch `single-tenant`.
* Do not touch `payment-service`.
* Do not add subscription billing.
* Do not add IoT/camera/ANPR.
* Do not add WhatsApp/SMS/email integrations.
* Do not add AI chatbot.
* Do not create large reports per PR.
* Do not create broad acceptance suites for every small UI change.
* Do not rewrite working pages.
* Do not add a new UI library.
* Do not weaken tenant isolation or role guards.

Testing policy:

* For frontend-only PRs: run `cd frontend && npm run build`.
* For backend/schema/API PRs: run `cd backend && npm run build`.
* Add focused tests only for critical backend authorization/tenant-scope logic and chat access rules.
* Do not add many visual/layout tests.
* Do not run full test suites repeatedly unless CI/build fails or shared behavior changed.
* Short manual verification notes are enough for UI-only changes.

PR policy:

* Small focused PRs.
* Short PR body:

  * What changed
  * How tested
  * Manual verification steps
* No long per-PR report unless explicitly required by existing convention.
* Update `MASTER_PROMPT.md` status/changelog only when phase status changes.

============================================================
PR 5A — Mobile Security Gate
============================

Branch:
`feature/phase-5a-mobile-security-gate`

PR title:
`feat(security): add mobile gate check-in checkout flow`

Scope:
Security mobile gate flow. Reuse existing backend APIs where possible. Add a small backend search endpoint only if existing APIs cannot support fast search.

Primary route:
`/security/gate`

Access:

* SECURITY: allowed
* ADMIN/TENANT_ADMIN: allowed for supervision/testing
* USER: blocked
* SUPER_ADMIN: blocked or platform-safe according to current route policy

UX requirements:

* Mobile-first at 375px width.
* Must also work on laptop.
* Large touch targets.
* One-handed usage.
* No dense DataGrid.
* No tiny action icons for the main flow.

Gate screen must support:

* Search by booking code.
* Search by vehicle number.
* Show matching booking/event result clearly:

  * Booking No / Booking Code
  * Vehicle number
  * Customer name if safe
  * Parking lot
  * Floor
  * Slot
  * Status
* Primary action:

  * If booking is confirmed/reserved: `Check in`
  * If parking event is active: `Check out`
  * If already completed/cancelled: show safe disabled state
* Confirmation step before check-in/out.
* Success state after action.
* Error state with clear message.
* Fast reset/search again.

Backend:

* Prefer existing endpoints.
* If needed, add:

  * `GET /security/gate/search?q=...`
* Search must be tenant-scoped.
* SECURITY can only see operational data for their organization.
* USER data must not leak across tenants.
* Do not expose raw IDs as primary labels.

Frontend:

* Add nav entry for SECURITY if appropriate.
* Keep existing dashboard intact.
* Use MUI 7 and existing components.
* Use existing API client factory.
* Use existing chips/formatters where possible.

Manual verification:

* Login as SECURITY.
* Open `/security/gate`.
* Search booking code.
* Search vehicle number.
* Check in a valid booking.
* Check out an active event.
* Try invalid search.
* Confirm USER cannot access route.

Validation:

```bash
cd frontend
npm run build
```

If backend changed:

```bash
cd backend
npm run build
```

Stop after PR 5A is opened/merged. Do not start chat until 5A is stable.

============================================================
PR 5B — Chat Backend MVP
========================

Branch:
`feature/phase-5b-chat-backend`

PR title:
`feat(chat): add tenant-scoped conversation API`

Scope:
Backend schema + REST APIs for in-app chat MVP.

Do not:

* Do not implement WebSockets yet unless it is very low-risk and already supported.
* Do not add file attachments.
* Do not add voice/video.
* Do not add AI chatbot.
* Do not add external integrations.
* Do not touch payment-service.

Chat MVP:
Use REST APIs plus frontend polling in PR 5C. WebSocket/live push can be Phase 5D/Future if needed.

Data model:
Add Prisma models/enums similar to:

* `ConversationType`

  * `SECURITY`
  * `CUSTOMER_CARE`

* `ConversationStatus`

  * `OPEN`
  * `RESOLVED`

* `Conversation`

  * id
  * organizationId
  * type
  * status
  * createdByUserId
  * assignedToUserId optional
  * parkingLotId optional
  * bookingId optional
  * subject optional
  * lastMessageAt
  * createdAt
  * updatedAt

* `ConversationMessage`

  * id
  * organizationId
  * conversationId
  * senderId
  * body
  * createdAt

Optional only if simple:

* `ConversationParticipant`

  * conversationId
  * userId
  * lastReadAt

Rules:

* Every conversation/message must be tenant-scoped.
* USER can create and read only own conversations.
* USER can message:

  * security for a parking lot / booking
  * customer care for support
* SECURITY can see security conversations for their organization, especially linked to their parking lot/booking context.
* ADMIN/TENANT_ADMIN can see customer-care conversations for their organization.
* SUPER_ADMIN should not see tenant chat unless explicit platform-safe support view exists.
* Users cannot read other users’ conversations.
* Security cannot read cross-tenant conversations.
* Messages cannot be empty.
* Keep body length bounded.

API endpoints:

* `POST /conversations/security`

  * starts user-to-security conversation
  * body: parkingLotId, bookingId optional, message
* `POST /conversations/customer-care`

  * starts user-to-customer-care conversation
  * body: subject optional, bookingId optional, message
* `GET /conversations`

  * list conversations visible to current user
  * query: type, status
* `GET /conversations/:id/messages`

  * messages for one conversation
* `POST /conversations/:id/messages`

  * send message
* `PATCH /conversations/:id/resolve`

  * allowed for ADMIN/TENANT_ADMIN/SECURITY depending on conversation type
* Optional:

  * `PATCH /conversations/:id/assign`
  * `PATCH /conversations/:id/read`

Security availability:

* Add a lightweight endpoint if needed:

  * `GET /parking-lots/:id/security-availability`
* MVP definition:

  * return count/list of active SECURITY users in same organization
  * if no lot-specific assignment exists, label as organization security team
* Do not invent complex staff scheduling in this PR.

Backend validation:

```bash
cd backend
npm run build
```

Focused tests only:

* USER cannot read another USER conversation.
* SECURITY cannot read cross-tenant conversation.
* ADMIN/TENANT_ADMIN can read customer-care conversation in own org.
* Message creation is tenant-scoped.

Do not add broad acceptance suites.

============================================================
PR 5C — Chat Frontend MVP
=========================

Branch:
`feature/phase-5c-chat-frontend`

PR title:
`feat(chat): add user security and customer care chat UI`

Scope:
Frontend chat UI consuming PR 5B APIs.

Do not:

* Do not add WebSocket unless backend already supports it.
* Do not add external integrations.
* Do not redesign app shell.
* Do not create complex support dashboard.

Routes:

* USER:

  * `/support`
  * or `/chat`
* SECURITY:

  * `/security/messages`
  * optional link from `/security/gate`
* ADMIN/TENANT_ADMIN:

  * `/admin/support`
  * or existing admin route pattern

User features:

* Start chat with security:

  * from booking detail if possible
  * from parking lot/availability context if accessible
  * choose parking lot when needed
* Start customer-care chat:

  * issue type/subject optional
  * first message required
* Conversation list:

  * open/resolved
  * last message preview
  * linked booking/lot if present
* Message thread:

  * send message
  * show sender
  * show time
  * refresh with React Query polling every 5 seconds
  * avoid manual browser refresh

Security features:

* See security conversations for tenant/org.
* Filter open/resolved.
* Reply to user.
* See linked parking lot/booking context.
* Resolve conversation if allowed.

Admin/Tenant Admin support features:

* See customer-care conversations.
* Reply.
* Resolve.
* See linked booking/payment/lot context if available.

UX:

* Mobile-friendly.
* Simple chat bubbles.
* Clear empty state.
* Clear loading/error states.
* No giant tables.
* No overbuilt Slack clone.
* Use MUI 7 and theme tokens.
* Use existing API client factory.
* Sidebar/nav should include chat/support only for roles that can use it.

Validation:

```bash
cd frontend
npm run build
```

Focused tests only if existing route/nav tests fail.

Manual verification:

* USER starts security chat from booking or support page.
* USER starts customer-care chat.
* SECURITY replies.
* ADMIN/TENANT_ADMIN replies to customer-care chat.
* USER cannot access admin support inbox.
* SECURITY cannot access admin-only support inbox.
* Polling updates after sending messages.

============================================================
PR 5D — Phase 5 Smoke Cleanup
=============================

Branch:
`fix/phase-5-mobile-gate-chat-smoke`

PR title:
`fix(phase-5): polish mobile gate and chat smoke flow`

Scope:
Small fixes only after manually testing 5A–5C.

Do not:

* Do not add new major features.
* Do not add WebSockets.
* Do not add payment changes.
* Do not add AI/chatbot.
* Do not add large reports.

Fix only:

* broken navigation
* bad mobile spacing
* missing role guard
* obvious error state
* broken build/type issue
* stale MASTER_PROMPT phase status

Validation:

```bash
cd frontend
npm run build
cd ../backend
npm run build
```

Optional focused tests only if a real bug requires it.

Update:

* `MASTER_PROMPT.md`

  * mark Phase 5 Mobile Security Gate + Chat MVP complete only if manually verified
  * add known deferred work:

    * WebSocket live push
    * push notifications
    * staff scheduling/lot-specific security assignment
    * attachments
    * SLA/support analytics
    * WhatsApp/SMS/email integrations

Final manual smoke checklist:

* SECURITY can use `/security/gate` on mobile width.
* SECURITY can check in/out.
* USER can start security chat.
* USER can start customer-care chat.
* SECURITY can reply.
* ADMIN/TENANT_ADMIN can reply to customer-care chat.
* Cross-tenant chat access is blocked.
* USER cannot access management/support admin routes.
* Existing dashboard/parking lot/visual map still loads.

Stop after Phase 5 smoke PR.
Do not start Phase 6.