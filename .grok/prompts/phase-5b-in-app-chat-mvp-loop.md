PHASE 5B LOOP — In-App Chat MVP for Smart Parking SaaS

Repository:
`https://github.com/imkpk/smart-parking-system`

Base branch:
`develop`

Context:
Phase 5A Mobile Security Gate is complete:

* PR #97 merged: basic `/security/gate`
* PR #99 merged: phone search, multiple matches, vehicle visit history

Now implement Phase 5B: tenant-scoped in-app chat MVP.

Product goal:
Users should be able to message:

1. Security before arriving at a parking lot.
2. Customer care/admin support for booking, payment, check-in, or general issues.

Security/Admin staff should be able to reply from their role-specific inbox.

Important:
This is a real SaaS product, not a demo. Keep it simple, useful, and tenant-safe.

Work mode:

* Small focused PRs.
* Do not create one giant PR.
* Do not over-test UI polish.
* Do not create long reports per PR.
* Do not add WebSockets unless explicitly requested later.
* Use REST + React Query polling for MVP.
* Build first, test critical access rules only.

Do not:

* Do not touch `single-tenant`.
* Do not touch `payment-service`.
* Do not add WhatsApp/SMS/email integrations.
* Do not add AI chatbot.
* Do not add file attachments.
* Do not add voice/video.
* Do not add push notifications.
* Do not add complex SLA dashboard.
* Do not redesign the app shell.
* Do not rewrite existing pages.
* Do not weaken tenant isolation.
* Do not expose raw DB IDs in main UI.

============================================================
LOOP 5B-1 — Chat backend contract + Prisma schema
=================================================

Branch:
`feature/phase-5b-chat-schema-contract`

PR title:
`feat(chat): add tenant scoped chat schema contract`

Goal:
Add backend data model and minimal contract for conversations/messages.

Before coding:

* Read `MASTER_PROMPT.md`
* Read `.grok/AGENTS.md`
* Read `backend/prisma/schema.prisma`
* Inspect existing auth, roles, access policy, users, bookings, parking lots.

Add Prisma enums:

```prisma
enum ConversationType {
  SECURITY
  CUSTOMER_CARE
}

enum ConversationStatus {
  OPEN
  RESOLVED
}
```

Add Prisma models:

```prisma
model Conversation {
  id               Int                @id @default(autoincrement())
  organizationId   Int
  type             ConversationType
  status           ConversationStatus @default(OPEN)
  subject          String?
  createdByUserId  Int
  assignedToUserId Int?
  parkingLotId     Int?
  bookingId        Int?
  lastMessageAt    DateTime?
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  createdByUser     User         @relation("ConversationCreatedBy", fields: [createdByUserId], references: [id], onDelete: Cascade)
  assignedToUser    User?        @relation("ConversationAssignedTo", fields: [assignedToUserId], references: [id], onDelete: SetNull)
  parkingLot        ParkingLot?  @relation(fields: [parkingLotId], references: [id], onDelete: SetNull)
  booking           Booking?     @relation(fields: [bookingId], references: [id], onDelete: SetNull)
  messages          ConversationMessage[]

  @@index([organizationId])
  @@index([type])
  @@index([status])
  @@index([createdByUserId])
  @@index([assignedToUserId])
  @@index([parkingLotId])
  @@index([bookingId])
  @@map("conversations")
}

model ConversationMessage {
  id             Int      @id @default(autoincrement())
  organizationId Int
  conversationId Int
  senderId       Int
  body           String   @db.Text
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User         @relation("ConversationMessageSender", fields: [senderId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([conversationId])
  @@index([senderId])
  @@map("conversation_messages")
}
```

Update existing models relations as needed:

* Organization → conversations, conversationMessages
* User → createdConversations, assignedConversations, sentConversationMessages
* ParkingLot → conversations
* Booking → conversations

Create migration.

Do not add frontend in this PR.

Add minimal backend DTO/interface notes if useful, but do not implement all APIs here unless small.

Validation:

```bash
cd backend
npx prisma format
npx prisma generate
npm run build
```

Focused tests:

* No tests required unless schema/build fails.

Update:

* `MASTER_PROMPT.md`: mark Phase 5B chat backend/schema in progress.
* No long report required.

Stop after PR 5B-1.

============================================================
LOOP 5B-2 — Chat backend REST API
=================================

Branch:
`feature/phase-5b-chat-api`

PR title:
`feat(chat): add tenant scoped conversation APIs`

Depends on:
5B-1 merged into `develop`.

Goal:
Implement REST API for in-app chat MVP.

Routes:
Base path:
`/api/conversations`

Endpoints:

1. `POST /api/conversations/security`

   * USER starts conversation with security.
   * Body:

     * parkingLotId required or bookingId required
     * bookingId optional
     * message required
   * Creates conversation type SECURITY.
   * Creates first message.

2. `POST /api/conversations/customer-care`

   * USER starts customer-care conversation.
   * Body:

     * subject optional
     * bookingId optional
     * message required
   * Creates conversation type CUSTOMER_CARE.
   * Creates first message.

3. `GET /api/conversations`

   * Lists conversations visible to current user.
   * Query:

     * type optional
     * status optional
   * USER: only conversations they created.
   * SECURITY: SECURITY conversations in their organization.
   * ADMIN/TENANT_ADMIN: all tenant conversations, both SECURITY and CUSTOMER_CARE.
   * SUPER_ADMIN: blocked unless existing policy says otherwise.

4. `GET /api/conversations/:id/messages`

   * Returns messages for one visible conversation.
   * Ordered oldest first.

5. `POST /api/conversations/:id/messages`

   * Sends message in visible conversation.
   * USER can only send to own conversations.
   * SECURITY can reply to SECURITY conversations in org.
   * ADMIN/TENANT_ADMIN can reply to tenant conversations.
   * Message body required and trimmed.
   * Max length 2000 chars.

6. `PATCH /api/conversations/:id/resolve`

   * SECURITY can resolve SECURITY conversations.
   * ADMIN/TENANT_ADMIN can resolve any tenant conversation.
   * USER cannot resolve.

Response shape:
Conversation list item should include business labels:

```ts
{
  id,
  type,
  status,
  subject,
  createdBy: { name, email },
  assignedTo?: { name, email },
  parkingLot?: { id, name },
  booking?: { bookingNo, bookingCode },
  lastMessageAt,
  lastMessagePreview,
  unreadCount?: 0
}
```

Messages:

```ts
{
  id,
  sender: { name, role },
  body,
  createdAt,
  isMine
}
```

Rules:

* Tenant scoped everywhere.
* No cross-tenant access.
* Do not expose raw IDs as primary labels.
* Use existing `AccessPolicyService` where possible.
* Reuse existing formatters/helpers if backend already has booking number formatting.
* Throw clear 403/404/400 errors.
* Do not add WebSockets.
* Do not add attachments.

Add focused backend tests:

1. USER creates security conversation in own org.
2. USER cannot read another user’s conversation.
3. SECURITY can read SECURITY conversation in own org.
4. SECURITY cannot read cross-tenant conversation.
5. ADMIN/TENANT_ADMIN can read tenant customer-care conversation.
6. Empty message rejected.
7. Resolved conversation behavior is safe.

Validation:

```bash
cd backend
npm run build
npm run test:run -- conversations
```

If exact test command differs, run focused conversation spec only.

Do not add frontend in this PR.

Update `MASTER_PROMPT.md` only if phase status needs it.

Stop after PR 5B-2.

============================================================
LOOP 5B-3 — Chat frontend API client + hooks
============================================

Branch:
`feature/phase-5b-chat-frontend-client`

PR title:
`feat(chat): add frontend conversation client hooks`

Depends on:
5B-2 merged into `develop`.

Goal:
Add typed frontend API client and React Query hooks for conversations.

Files:

* Use existing API client factory.
* Do not create duplicate axios instances.
* Add something like:

  * `frontend/src/api/conversationsApi.ts`
  * `frontend/src/hooks/useConversations.ts`

Client functions:

* startSecurityConversation
* startCustomerCareConversation
* listConversations
* getConversationMessages
* sendConversationMessage
* resolveConversation

Hooks:

* useConversations
* useConversationMessages
* useSendConversationMessage
* useStartSecurityConversation
* useStartCustomerCareConversation
* useResolveConversation

Polling:

* Messages should support polling every 5 seconds in UI later.
* Do not implement full UI yet.

Types:

* ConversationType
* ConversationStatus
* ConversationListItem
* ConversationMessage
* StartConversationRequest

Do not:

* Do not build full UI yet.
* Do not change app routes yet unless needed.
* Do not add WebSockets.
* Do not touch backend.

Validation:

```bash
cd frontend
npm run build
```

Stop after PR 5B-3.

============================================================
LOOP 5B-4 — User chat UI
========================

Branch:
`feature/phase-5b-user-chat-ui`

PR title:
`feat(chat): add user support chat UI`

Depends on:
5B-3 merged into `develop`.

Goal:
Allow USER to start and continue chats.

Routes:

* `/support` or `/chat`
  Choose the route that fits current app navigation best.

USER features:

1. Conversation list

   * Open/resolved conversations
   * Type: Security / Customer Care
   * Last message preview
   * Linked parking lot/booking if available

2. Start Security Chat

   * USER can start chat with security.
   * User chooses:

     * parking lot, or
     * booking if available
   * First message required.
   * UI copy:
     `Message security before you arrive.`

3. Start Customer Care Chat

   * Subject optional.
   * Booking optional.
   * First message required.
   * UI copy:
     `Ask for help with booking, payment, check-in, or general support.`

4. Message thread

   * Chat bubbles
   * Sender name/role
   * Time
   * Send message field
   * React Query polling every 5 seconds
   * Empty/loading/error states

UX:

* Mobile-friendly.
* Simple and clean, not Slack clone.
* Use MUI 7.
* Reuse existing components.
* No raw DB IDs in main UI.
* Add sidebar/nav item only for USER where appropriate.

Do not:

* Do not implement security/admin inbox in this PR.
* Do not add WebSockets.
* Do not add attachments.
* Do not touch backend.

Validation:

```bash
cd frontend
npm run build
```

Manual verification:

1. Login as USER.
2. Open support/chat route.
3. Start security chat.
4. Start customer care chat.
5. Send message.
6. Refresh page; messages still load.
7. USER cannot see other users’ conversations.

Stop after PR 5B-4.

============================================================
LOOP 5B-5 — Security and Admin inbox UI
=======================================

Branch:
`feature/phase-5b-staff-chat-inbox`

PR title:
`feat(chat): add security and admin support inbox`

Depends on:
5B-4 merged into `develop`.

Goal:
Allow SECURITY, ADMIN, TENANT_ADMIN to respond to conversations.

Routes:

* SECURITY:

  * `/security/messages`
* ADMIN/TENANT_ADMIN:

  * `/admin/support`
  * or existing admin route pattern if different

SECURITY inbox:

* Shows SECURITY conversations in tenant/org.
* Filters:

  * Open
  * Resolved
* Conversation list:

  * User name
  * Parking lot / booking
  * Last message preview
  * Last message time
* Thread:

  * Reply
  * Resolve
* Security should not see customer-care conversations unless current role policy allows.

ADMIN/TENANT_ADMIN inbox:

* Shows CUSTOMER_CARE conversations.
* Optionally shows SECURITY conversations for supervision if backend permits.
* Reply.
* Resolve.
* See linked booking/lot context.

UX:

* Use responsive two-panel layout on desktop.
* Use list → thread navigation on mobile.
* Use MUI 7 and theme tokens.
* No DataGrid for chat messages.
* Keep simple.

Do not:

* Do not add SLA dashboard.
* Do not add analytics.
* Do not add WebSockets.
* Do not add attachments.
* Do not touch payment-service.

Validation:

```bash
cd frontend
npm run build
```

Manual verification:

1. USER creates security chat.
2. SECURITY sees and replies.
3. USER receives reply after polling.
4. USER creates customer-care chat.
5. ADMIN/TENANT_ADMIN sees and replies.
6. SECURITY cannot access admin support inbox.
7. USER cannot access staff inbox.
8. Resolve conversation works.

Stop after PR 5B-5.

============================================================
LOOP 5B-6 — Phase 5B smoke cleanup
==================================

Branch:
`fix/phase-5b-chat-smoke-cleanup`

PR title:
`fix(chat): polish phase 5b chat smoke flow`

Depends on:
5B-5 merged into `develop`.

Goal:
Fix only issues found during manual smoke.

Allowed fixes:

* broken navigation
* bad empty state
* bad mobile spacing
* missing route guard
* unclear labels
* build/type failures
* stale status in `MASTER_PROMPT.md`

Do not:

* Do not add new major features.
* Do not add WebSockets.
* Do not add attachments.
* Do not add notifications.
* Do not touch payment-service.
* Do not start Phase 6.

Validation:

```bash
cd backend
npm run build
cd ../frontend
npm run build
```

Manual smoke checklist:

1. USER starts security chat.
2. SECURITY replies.
3. USER sees reply.
4. USER starts customer-care chat.
5. ADMIN/TENANT_ADMIN replies.
6. USER sees reply.
7. Resolve works.
8. USER blocked from staff inbox.
9. SECURITY blocked from admin support inbox.
10. Cross-tenant access blocked.
11. Mobile views usable at 375px.

Update:

* `MASTER_PROMPT.md`

  * mark Phase 5B Chat MVP complete only after manual smoke passes.
  * add deferred work:

    * WebSocket live updates
    * push notifications
    * attachments
    * staff assignment rules
    * support SLA analytics
    * WhatsApp/SMS/email integrations

Stop after PR 5B-6.
Do not start Phase 6.
