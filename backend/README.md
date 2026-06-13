# Smart Parking Backend

Phase 1: Apartment Parking MVP backend scaffold.

## Tech Stack

- NestJS
- MySQL
- Prisma
- JWT auth with roles

## Folder Structure

```text
backend/
  prisma/
    schema.prisma
  src/
    app.module.ts
    main.ts
    common/
      decorators/
      guards/
      enums/
    config/
    prisma/
      prisma.module.ts
      prisma.service.ts
    auth/
      auth.controller.ts
      auth.module.ts
      auth.service.ts
      dto/
      guards/
      strategies/
    users/
      users.controller.ts
      users.module.ts
      users.service.ts
      dto/
    parking-lots/
      parking-lots.controller.ts
      parking-lots.module.ts
      parking-lots.service.ts
      dto/
    floors/
      floors.controller.ts
      floors.module.ts
      floors.service.ts
      dto/
    slots/
      slots.controller.ts
      slots.module.ts
      slots.service.ts
      dto/
    vehicles/
      vehicles.controller.ts
      vehicles.module.ts
      vehicles.service.ts
      dto/
    assignments/
      assignments.controller.ts
      assignments.module.ts
      assignments.service.ts
      dto/
    parking-events/
      parking-events.controller.ts
      parking-events.module.ts
      parking-events.service.ts
      dto/
    dashboard/
      dashboard.controller.ts
      dashboard.module.ts
      dashboard.service.ts
      dto/
```

## Planned API Routes

```text
POST   /auth/register
POST   /auth/login

GET    /users
GET    /users/:id

POST   /parking-lots
GET    /parking-lots
GET    /parking-lots/:id
PATCH  /parking-lots/:id
DELETE /parking-lots/:id

POST   /floors
GET    /floors
GET    /floors/:id
PATCH  /floors/:id
DELETE /floors/:id

POST   /slots
GET    /slots
GET    /slots/:id
PATCH  /slots/:id
DELETE /slots/:id

POST   /vehicles
GET    /vehicles
GET    /vehicles/:id
PATCH  /vehicles/:id
DELETE /vehicles/:id

POST   /assignments
GET    /assignments
PATCH  /assignments/:id/revoke

POST   /parking-events/entry
POST   /parking-events/exit
GET    /parking-events

GET    /dashboard/slot-summary
```

## Phase 1 Domain

- `ADMIN` manages lots, floors/zones, slots, users, and slot assignments.
- `USER` registers vehicles.
- `SECURITY` records vehicle entries and exits.
- Dashboard reports total, occupied, and available slots.
