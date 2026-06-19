# Phase 5B — In-App Chat MVP Acceptance Report

**Date:** 2026-06-19  
**Base branch:** `develop`  
**Prompt:** `.grok/prompts/phase-5b-in-app-chat-mvp-loop.md`  
**Manual-test rule:** `.grok/prompts/phase-5b-manual-test-pr-comments.md`

## PR stack

| Loop | PR | Title | Status |
|------|-----|-------|--------|
| 5B-1 | [#101](https://github.com/imkpk/smart-parking-system/pull/101) | `feat(chat): add tenant scoped chat schema contract` | ✅ Merged |
| 5B-2 | [#102](https://github.com/imkpk/smart-parking-system/pull/102) | `feat(chat): add tenant scoped conversation APIs` | ✅ Merged |
| 5B-3 | [#103](https://github.com/imkpk/smart-parking-system/pull/103) | `feat(chat): add frontend conversation client hooks` | ✅ Merged |
| 5B-4 | [#104](https://github.com/imkpk/smart-parking-system/pull/104) | `feat(chat): add user support chat UI` | ✅ Merged |
| 5B-5 | [#105](https://github.com/imkpk/smart-parking-system/pull/105) | `feat(chat): add security and admin support inbox` | ✅ Merged |
| 5B-6 | [#106](https://github.com/imkpk/smart-parking-system/pull/106) | `fix(chat): polish phase 5b chat smoke flow` | 🟡 Open |

## Product goal (met)

* USER can message **Security** before arriving (parking lot or booking context).
* USER can message **Customer Care** for booking/payment/check-in/general support.
* **SECURITY** replies from `/security/messages` (SECURITY conversations only).
* **ADMIN / TENANT_ADMIN** reply and resolve from `/admin/support` (all tenant conversations).
* Tenant-scoped REST API with role-safe access; no cross-tenant leakage.
* MVP uses **5s React Query polling** — no WebSockets.

## Shipped by loop

### 5B-1 — Schema + contract

* Prisma: `Conversation`, `ConversationMessage`, enums `ConversationType`, `ConversationStatus`
* Migration: `backend/prisma/migrations/20260619100000_phase_5b_chat_schema/migration.sql`
* Contract types: `backend/src/conversations/conversation.types.ts`

### 5B-2 — REST API

* Module: `backend/src/conversations/` — controller, service, presenter, DTOs
* Routes under `/api/conversations`:
  * `POST /security`, `POST /customer-care`
  * `GET /`, `GET /:id/messages`, `POST /:id/messages`, `PATCH /:id/resolve`
* Access: USER own chats; SECURITY org SECURITY chats; ADMIN/TENANT_ADMIN all org chats; SUPER_ADMIN blocked
* Resolved conversations reject new messages (400); max message length 2000
* Focused service tests in `conversations.service.spec.ts`
* Manual API smoke passed after `npx prisma migrate deploy`

### 5B-3 — Frontend client

* `frontend/src/types/conversation.ts`
* `frontend/src/api/conversationsApi.ts`
* `frontend/src/hooks/useConversations.ts` (optional `{ poll: true }` → 5s refetch)

### 5B-4 — User UI

* Route: `/support` (USER only)
* `UserSupportPage` — list, security/customer-care starters, thread with polling
* `ChatMessageBubble`, nav item **Support** in `AppLayout`
* CI fix: direct MUI icon imports (barrel icons undefined in Vitest)

### 5B-5 — Staff inbox

* SECURITY: `/security/messages` — `SecurityMessagesPage`
* ADMIN/TENANT_ADMIN: `/admin/support` — `AdminSupportInboxPage`
* Shared: `StaffSupportInboxPage`, `conversationDisplay.ts`
* Reply, resolve, type/status filters (admin), mobile list → thread + Back

### 5B-6 — Smoke polish

* Staff inbox: guard message empty state during loading (no flash)
* User page: reuse `conversationDisplay` helpers; direct icon imports
* AppLayout test: tenant admin **Support Inbox** nav assertion
* `MASTER_PROMPT.md` v1.13.5 — Phase 5B complete + deferred list

## Demo credentials

Password: `password123`

| Role | Email |
|------|-------|
| USER | `demo-user@smartparking.demo` |
| SECURITY | `demo-security@smartparking.demo` |
| ADMIN | `demo-admin@smartparking.demo` |

## Validation

```bash
cd backend && npm run build && npm run test:run -- conversations
cd ../frontend && npm run build && npm run test:run -- AppLayout.test.tsx
```

## Manual smoke checklist (5B-6)

1. USER starts security chat → SECURITY replies → USER sees reply (polling).
2. USER starts customer-care chat → ADMIN replies → USER sees reply.
3. Resolve locks composer; status chips update.
4. USER blocked from `/admin/support` and `/security/messages`.
5. SECURITY blocked from `/support` and admin inbox.
6. Cross-tenant access blocked (API + UI guards).
7. Mobile 375px: list → thread → Back works on user and staff pages.
8. No empty-state flash while messages load in staff thread panel.

Posted on PR #106 comment.

## Known deferred work

* WebSocket / SSE live updates
* Push notifications and unread badges (`unreadCount` stubbed at 0)
* File/image attachments
* Cypress smoke journey (J16+)
* SUPER_ADMIN cross-tenant support inbox
* Conversation assignment / routing rules
* SLA analytics dashboard
* WhatsApp / SMS / email integrations

## Next recommended step

Phase 5C/5D or human redirect — **do not start Phase 6 (subscription billing)** without explicit approval.