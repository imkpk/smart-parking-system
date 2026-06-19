# Smart Parking Backend

NestJS backend for a Smart Parking Management System.

The backend currently covers authentication, role-based access, parking structure management, vehicle registration, available slot search, booking, and parking event check-in/check-out.

## Tech Stack

- NestJS
- TypeScript
- PostgreSQL (Neon hosted / local Postgres)
- Prisma ORM
- JWT authentication
- Passport JWT
- bcrypt
- class-validator
- Swagger/OpenAPI

## Current Milestones

```text
Milestone 1: Auth + Users + Roles                      Complete
Milestone 2: Parking Lots + Floors + Slots             Complete
Milestone 3: Vehicles + Available Slot Search + Booking Complete
Milestone 4: Parking Events + Check-In/Check-Out        Complete
```

Not built yet:

- Payments
- Dashboard analytics
- Frontend
- Pricing
- Booking expiry jobs

## Roles

```text
ADMIN
- Manage parking lots, floors, and slots
- View all users
- View all vehicles
- View all bookings
- View all parking events
- Cancel bookings

SECURITY
- View parking lots, floors, and slots
- View bookings for later verification
- Check in vehicles
- Check out vehicles
- View active parking events

USER
- Register vehicles
- View own vehicles
- Search available slots
- Create bookings
- View own bookings
- Cancel own active bookings
- View own parking history
```

## Project Structure

```text
backend/
  prisma/
    schema.prisma
    migrations/
  src/
    app.module.ts
    main.ts
    app.controller.ts
    app.service.ts
    auth/
    users/
    parking-lots/
    floors/
    slots/
    vehicles/
    bookings/
    assignments/
    parking-events/
    dashboard/
    common/
      decorators/
      guards/
    prisma/
```

## Environment Setup

Copy `backend/.env.example` to `backend/.env`.

**PostgreSQL (local):**

```env
DATABASE_URL="postgresql://parking_user:parking_password@localhost:5432/smart_parking_db?schema=public"
SHADOW_DATABASE_URL="postgresql://parking_user:parking_password@localhost:5432/smart_parking_shadow_db?schema=public"
JWT_SECRET="smart_parking_dev_jwt_secret_32_chars_minimum"
JWT_EXPIRES_IN="1d"
PORT=3000
CORS_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

**Neon (hosted):** use `?sslmode=require` — see `.env.example`.

> NestJS backend and `payment-service` both use PostgreSQL (Neon/local Postgres).

**Render + Neon deploy:** see [docs/DEPLOY.md](./docs/DEPLOY.md).

## Installation

```bash
cd backend
npm install
npx prisma generate
npm run build
```

## Database Migrations

Apply migrations:

```bash
npx prisma migrate deploy
```

Check migration status:

```bash
npx prisma migrate status
```

Current migration (PostgreSQL baseline):

```text
20260619120000_postgresql_baseline
```

MySQL history: `prisma/migrations_mysql_archive/`

## Run The Backend

Development:

```bash
npm run start:dev
```

Production-style local start:

```bash
npm run build
npm run start
```

Base URL:

```text
http://localhost:3000/api
```

Health check:

```http
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "service": "smart-parking-backend"
}
```

## Swagger

Swagger UI:

```text
http://localhost:3000/api/docs
```

OpenAPI JSON:

```text
http://localhost:3000/api/docs-json
```

## Milestone 1: Auth + Users + Roles

### Features

- User registration
- User login
- JWT authentication
- Current user endpoint
- Admin-only users listing
- Role infrastructure

### Auth APIs

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Users APIs

```text
GET /api/users
GET /api/users/:id
```

### Auth Sample Requests

Register:

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "phone": "+919999999999",
  "password": "password123",
  "role": "ADMIN"
}
```

Login:

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

Use the returned `accessToken` as a Bearer token:

```http
Authorization: Bearer ACCESS_TOKEN
```

Current user:

```http
GET /api/auth/me
Authorization: Bearer ACCESS_TOKEN
```

## Milestone 2: Parking Lots + Floors + Slots

### Features

- Create, view, update, and soft-delete parking lots
- Create, view, update, and delete floors
- Create slots
- Bulk create slots
- View all slots in a parking lot
- View available slots in a parking lot
- Update slot status

### Parking Lot APIs

```text
GET    /api/parking-lots
POST   /api/parking-lots
GET    /api/parking-lots/:id
PATCH  /api/parking-lots/:id
DELETE /api/parking-lots/:id
```

### Floor APIs

```text
GET    /api/parking-lots/:parkingLotId/floors
POST   /api/parking-lots/:parkingLotId/floors
PATCH  /api/floors/:id
DELETE /api/floors/:id
```

### Slot APIs

```text
GET   /api/parking-lots/:parkingLotId/slots
GET   /api/parking-lots/:parkingLotId/available-slots
POST  /api/floors/:floorId/slots
POST  /api/floors/:floorId/slots/bulk
PATCH /api/slots/:id/status
```

### Parking Structure Sample Flow

Create parking lot:

```http
POST /api/parking-lots
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json
```

```json
{
  "name": "Apartment Block A",
  "type": "APARTMENT",
  "address": "Main gate basement entry",
  "city": "Hyderabad",
  "state": "Telangana",
  "pincode": "500081"
}
```

Create floor:

```http
POST /api/parking-lots/1/floors
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json
```

```json
{
  "name": "Basement 1",
  "level": -1
}
```

Create slot:

```http
POST /api/floors/1/slots
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json
```

```json
{
  "slotNumber": "B1-C-001",
  "slotType": "CAR",
  "status": "AVAILABLE"
}
```

Bulk create slots:

```http
POST /api/floors/1/slots/bulk
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json
```

```json
{
  "slots": [
    {
      "slotNumber": "B1-C-002",
      "slotType": "CAR"
    },
    {
      "slotNumber": "B1-B-001",
      "slotType": "BIKE"
    }
  ]
}
```

Update slot status:

```http
PATCH /api/slots/1/status
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json
```

```json
{
  "status": "MAINTENANCE"
}
```

## Milestone 3: Vehicles + Available Slot Search + Booking

### Features

- Register vehicles
- View own vehicles
- Admin view all vehicles
- Search available slots by vehicle type
- Create bookings
- View own bookings
- Admin and security view bookings
- Cancel bookings
- Reserve slot on booking
- Release slot on cancellation
- Prevent double booking

### Vehicle APIs

```text
POST   /api/vehicles
GET    /api/vehicles/my
GET    /api/vehicles
GET    /api/vehicles/:id
PATCH  /api/vehicles/:id
DELETE /api/vehicles/:id
```

### Available Slot Search

```text
GET /api/parking-lots/:parkingLotId/available-slots?vehicleType=CAR
```

### Booking APIs

```text
POST /api/bookings
GET  /api/bookings/my
GET  /api/bookings
GET  /api/bookings/:id
POST /api/bookings/:id/cancel
```

### Booking Rules

- User can only book with their own vehicle.
- Slot must be `AVAILABLE`.
- Slot type must match vehicle type.
- Booking creation uses a Prisma transaction.
- Booking creation marks the slot as `RESERVED`.
- Cancelling a booking marks it as `CANCELLED`.
- Cancelling a booking releases the slot back to `AVAILABLE`.
- Double booking the same slot returns conflict.

### Booking Sample Flow

Register vehicle:

```http
POST /api/vehicles
Authorization: Bearer USER_TOKEN
Content-Type: application/json
```

```json
{
  "vehicleNumber": "TS09EA1234",
  "vehicleType": "CAR",
  "brand": "Hyundai",
  "model": "Creta",
  "color": "White"
}
```

Search available slots:

```http
GET /api/parking-lots/1/available-slots?vehicleType=CAR
Authorization: Bearer USER_TOKEN
```

Create booking:

```http
POST /api/bookings
Authorization: Bearer USER_TOKEN
Content-Type: application/json
```

```json
{
  "vehicleId": 1,
  "slotId": 1,
  "startTime": "2026-06-14T10:00:00.000Z",
  "endTime": "2026-06-14T18:00:00.000Z"
}
```

View own bookings:

```http
GET /api/bookings/my
Authorization: Bearer USER_TOKEN
```

Cancel booking:

```http
POST /api/bookings/1/cancel
Authorization: Bearer USER_TOKEN
```

Admin view all bookings:

```http
GET /api/bookings
Authorization: Bearer ADMIN_TOKEN
```

Security view bookings:

```http
GET /api/bookings
Authorization: Bearer SECURITY_TOKEN
```

## Milestone 4: Parking Events + Check-In/Check-Out

### Features

- Security check-in by `bookingId` or `bookingCode`
- Security check-out by parking event id
- Active parking event listing
- User parking history
- Admin parking event listing
- Fee calculation
- Slot changes from `RESERVED` to `OCCUPIED` on check-in
- Slot changes from `OCCUPIED` to `AVAILABLE` on check-out
- Booking changes from `CONFIRMED` to `COMPLETED` on check-out
- Duplicate check-in prevention

### Parking Event APIs

```text
POST /api/parking-events/check-in
POST /api/parking-events/check-out
GET  /api/parking-events/active
GET  /api/parking-events/history
GET  /api/parking-events
GET  /api/parking-events/:id
```

### Check-In Rules

- Security can check in using `bookingId` or `bookingCode`.
- Booking must be `CONFIRMED`.
- Slot must be `RESERVED`.
- Duplicate check-in for the same booking is blocked.
- Check-in creates an `ACTIVE` parking event.
- Check-in marks the slot as `OCCUPIED`.
- Check-in uses a Prisma transaction.

### Check-Out Rules

- Only `ACTIVE` parking events can be checked out.
- Check-out calculates duration in minutes.
- Check-out calculates a mock fee.
- Check-out marks the parking event as `COMPLETED`.
- Check-out marks the booking as `COMPLETED`.
- Check-out releases the slot back to `AVAILABLE`.
- Check-out uses a Prisma transaction.

### Fee Rules

```text
First 60 minutes: 50
Every additional started hour: 30
Partial hours are rounded up
```

Examples:

```text
30 mins  = 50
60 mins  = 50
61 mins  = 80
120 mins = 80
121 mins = 110
```

### Parking Event Sample Flow

Check in with booking code:

```http
POST /api/parking-events/check-in
Authorization: Bearer SECURITY_TOKEN
Content-Type: application/json
```

```json
{
  "bookingCode": "BK-1781389000000-ABC123"
}
```

Check in with booking id:

```http
POST /api/parking-events/check-in
Authorization: Bearer SECURITY_TOKEN
Content-Type: application/json
```

```json
{
  "bookingId": 1
}
```

Check out:

```http
POST /api/parking-events/check-out
Authorization: Bearer SECURITY_TOKEN
Content-Type: application/json
```

```json
{
  "parkingEventId": 1
}
```

View active parking events:

```http
GET /api/parking-events/active
Authorization: Bearer SECURITY_TOKEN
```

View user parking history:

```http
GET /api/parking-events/history
Authorization: Bearer USER_TOKEN
```

Admin view all parking events:

```http
GET /api/parking-events
Authorization: Bearer ADMIN_TOKEN
```

## Important Enums

```text
Role:
- ADMIN
- SECURITY
- USER

ParkingLotType:
- APARTMENT
- MALL
- HOSPITAL
- OFFICE
- PUBLIC

SlotType:
- CAR
- BIKE
- EV
- HANDICAPPED

SlotStatus:
- AVAILABLE
- OCCUPIED
- RESERVED
- MAINTENANCE

VehicleType:
- CAR
- BIKE
- EV

BookingStatus:
- PENDING
- CONFIRMED
- CANCELLED
- COMPLETED
- EXPIRED

ParkingEventStatus:
- ACTIVE
- COMPLETED
- CANCELLED
```

## Verification Commands

```bash
npm run build
npx prisma validate
npx prisma migrate status
```

## Notes

- Parking lot delete is a soft delete using `isActive = false`.
- Floors and slots currently use hard delete/status updates.
- Booking creation currently sets booking status to `CONFIRMED`.
- Booking creation reserves the slot by setting slot status to `RESERVED`.
- Check-in marks the slot as `OCCUPIED`.
- Check-out marks the slot as `AVAILABLE`.
- Fee calculation is currently mock/local logic, not payment processing.

# Note from Pratibha for this service
Milestone 1: Auth + Users + Roles ✅
Milestone 2: Parking Lots + Floors + Slots ✅
Milestone 3: Vehicles + Bookings ✅
Milestone 4: Check-in + Check-out + Fee Calculation ✅
