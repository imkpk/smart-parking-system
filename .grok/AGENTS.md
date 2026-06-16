# AGENTS.md — Smart Parking System Agent Instructions

Use this file as the main instruction document for Codex, Claude, Copilot, or any coding agent working on this repository.

## Project Context

This is a Smart Parking System portfolio project.

```text
smart-parking-system/
├── backend/          # NestJS + Prisma + MySQL main API
├── payment-service/  # Spring Boot + MySQL payment microservice
└── frontend/         # React + TypeScript + Vite + MUI + React Query
```

Roles:

```text
ADMIN
SECURITY
USER
```

## Main Development Rule

Do not blindly generate new code.

Before changing anything:

```text
1. Inspect existing files.
2. Reuse existing components.
3. Reuse existing API clients.
4. Reuse existing types/interfaces.
5. Reuse existing utilities.
6. Avoid duplicate code.
7. Keep changes small and focused.
8. Do not rewrite unrelated files.
9. Do not change API contracts unless required.
10. Run build before finishing.
```

## Current Problem to Avoid

Previous changes created duplicate code across pages.

Avoid duplicating:

```text
DataGrid setup
Status chip logic
Confirm dialogs
Details modals/drawers
Snackbar handling
Date formatting
Currency formatting
Role checks
API clients
Axios instances
Search input logic
```

## Shared Frontend Components

Prefer using or creating shared files:

```text
src/components/common/AppDataGrid.tsx
src/components/common/PageHeader.tsx
src/components/common/StatusChip.tsx
src/components/common/ConfirmDialog.tsx
src/components/common/DetailsDrawer.tsx
src/components/common/EmptyState.tsx
src/utils/formatters.ts
src/utils/roleUtils.ts
```

Do not create page-specific duplicate versions if a shared component can solve it.

## Table UI Rule

A layman should understand the table.

```text
Keep technical IDs internally.
Show business-friendly labels in normal table.
Show raw IDs only inside View Details under Technical Details.
```

## Table Display Standards

### Vehicles Table

Show:

```text
Vehicle Number
Vehicle Type
Brand
Model
Color
Owner
Actions
```

Hide:

```text
vehicleId
userId
```

### Bookings Table

Show:

```text
Booking No
Booking Code
Customer
Vehicle Number
Parking Lot
Slot
Start Time
End Time
Status
Actions
```

Hide:

```text
userId
vehicleId
slotId
parkingLotId
```

### Parking Events Table

Show:

```text
Session No
Booking No
Customer
Vehicle Number
Parking Lot
Slot
Status
Checked In At
Checked Out At
Duration
Fee
Actions
```

Hide:

```text
raw eventId
userId
vehicleId
slotId
parkingLotId
```

Use `event.id` internally for checkout.

### Payments Table

Show:

```text
Receipt No
Booking No
Customer
Vehicle Number
Amount
Currency
Payment Status
Method
Payment Reference
Created On
Actions
```

Hide:

```text
userId
parkingEventId
raw internal IDs where possible
```

Use `payment.id` internally for mock success/failure and details.

### Parking Lots Table

Show:

```text
Parking Lot Name
Address
City
Total Floors
Total Slots
Available Slots
Status
Actions
```

Hide:

```text
parkingLotId
```

### Floors Table

Show:

```text
Floor Name
Floor Number
Parking Lot
Total Slots
Actions
```

Hide:

```text
floorId
parkingLotId
```

### Slots Table

Show:

```text
Slot Number
Floor
Parking Lot
Vehicle Type
Status
Actions
```

Hide:

```text
slotId
floorId
parkingLotId
```

## Details Drawer / Modal Standard

Use a View Details action wherever helpful.

Inside the details drawer/modal, use two sections:

```text
Business Details
Technical Details
```

Business Details examples:

```text
Customer name/email
Vehicle number
Parking lot name
Slot number
Booking code
Status
Amount
Time details
```

Technical Details examples:

```text
userId
vehicleId
slotId
floorId
parkingLotId
bookingId
parkingEventId
paymentId
```

## Search Input Standard

Use text input for search.

Do not use:

```tsx
type="number"
inputMode="numeric"
```

Use:

```tsx
type="text"
```

Search should support:

```text
booking code
receipt no
vehicle number
customer name
email
parking lot name
slot number
payment reference
status
```

## Role-Based UI Rules

### ADMIN

Can:

```text
Manage everything
View all payments
View all bookings
View all parking events
Check in vehicles
Check out vehicles
View dashboards and reports
Use mock payment success/failure
View technical details
```

### SECURITY

Can:

```text
View operational bookings
Check in vehicles
Check out vehicles
View active parking events
View operational payment status
```

### USER

Can:

```text
Register vehicle
Create booking
Cancel own booking if allowed
View own booking history
View own parking history
View own payment history
```

USER should not see:

```text
Other users' records
Technical IDs in normal table
Mock payment actions
Admin reports
```

## Business Flow Rules

```text
Check-in uses Booking ID or Booking Code.
Check-out uses Parking Event ID internally, shown as Session No.
Payment mock success/failure uses Payment ID internally, shown as Receipt No.
Booking reserves slot.
Check-in makes parking event ACTIVE and slot OCCUPIED.
Check-out completes parking event, calculates fee, releases slot, and initiates payment.
```

## API Client Rules

Do not create duplicate Axios instances.

Recommended centralized API files:

```text
src/api/paymentsApi.ts
src/api/parkingEventsApi.ts
src/api/bookingsApi.ts
src/api/vehiclesApi.ts
```

## Status Chip Standard

Use one shared `StatusChip` component for all statuses.

Statuses include:

```text
AVAILABLE
RESERVED
OCCUPIED
CONFIRMED
CANCELLED
COMPLETED
EXPIRED
ACTIVE
INITIATED
SUCCESS
FAILED
REFUNDED
```

Do not write status chip color logic separately in every page.

## Formatting Standard

Use shared formatter functions.

Recommended file:

```text
src/utils/formatters.ts
```

Helpers:

```text
formatDateTime
formatCurrency
formatStatusLabel
formatDuration
formatReceiptNo
formatBookingNo
formatSessionNo
```

Examples:

```text
Payment ID 6       -> Receipt No: PAY-000006
Booking ID 18      -> Booking No: BK-000018
Parking Event 14   -> Session No: SES-000014
```

## Code Quality Rules

```text
1. Use TypeScript types.
2. Do not use any unless unavoidable.
3. Do not duplicate interfaces.
4. Do not create one-off components if shared component exists.
5. Keep component files readable.
6. Move large column definitions to helper files if page becomes too large.
7. Keep API logic outside UI components.
8. Keep formatting logic outside UI components.
9. Keep reusable role logic outside UI components.
10. Do not suppress errors without understanding them.
```

## Before Finishing Any Task

Frontend:

```bash
cd frontend
npm run build
```

Backend, if changed:

```bash
cd backend
npm run build
npm run test:cov
```

Payment service, if changed:

```bash
cd payment-service
mvn clean package
```

## Response Required After Every Agent Task

When finished, report:

```text
1. Files changed
2. What was refactored or implemented
3. Duplicate code removed
4. Build result
5. Manual test steps
6. Any pending issues
```

## Recommended Agent Workflow

```text
1. Understand the feature or bug.
2. Inspect existing files first.
3. Identify reusable components.
4. Make the smallest clean change.
5. Avoid duplicate code.
6. Run build.
7. Explain the result.
```

## Do Not Do

```text
Do not create duplicate tables.
Do not create duplicate dialogs.
Do not create duplicate status chips.
Do not create duplicate axios clients.
Do not expose raw database IDs everywhere.
Do not rewrite working pages unnecessarily.
Do not add new features while fixing cleanup issues.
Do not ignore build errors.
```

## Current Priority

```text
Shared DataGrid
Shared StatusChip
Shared ConfirmDialog
Shared DetailsDrawer
User-friendly table columns
Hidden technical IDs
Consistent search
Role-based table rendering
```
