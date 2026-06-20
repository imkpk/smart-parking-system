# Smart Parking

**Smart Parking** is a multi-tenant parking management product for apartments, malls, hospitals, offices, and public parking locations. Property owners sign up, set up their parking lots, and run daily operations — while residents book slots, security handles the gate, and admins keep everything running.

Use this guide to understand **what the product does**, **who uses it**, **when to use each feature**, and **how to complete everyday tasks** step by step.

---

## Contents

- [What is Smart Parking?](#what-is-smart-parking)
- [Who is it for?](#who-is-it-for)
- [When should you use it?](#when-should-you-use-it)
- [How the product works (big picture)](#how-the-product-works-big-picture)
- [Create your account](#create-your-account)
- [Log in](#log-in)
- [Your role decides your experience](#your-role-decides-your-experience)
- [Property owner guide (Tenant Admin)](#property-owner-guide-tenant-admin)
- [Operations helper guide (Admin)](#operations-helper-guide-admin)
- [Gate operator guide (Security)](#gate-operator-guide-security)
- [Resident & visitor guide (User)](#resident--visitor-guide-user)
- [Understanding dashboard numbers](#understanding-dashboard-numbers)
- [Typical day — start to finish](#typical-day--start-to-finish)
- [Quick checklist before going live](#quick-checklist-before-going-live)
- [Developer & technical reference](#developer--technical-reference)

---

## What is Smart Parking?

Smart Parking helps a **property or parking owner** run structured parking operations online:

- Define **parking lots**, **floors**, and **slots**
- Onboard **staff** (admins, security) and **users** (residents, employees, customers)
- Let users **register vehicles** and **book slots**
- Let security **check vehicles in and out** at the gate
- Track **active sessions**, **daily activity**, **revenue**, and **payment history**

Each organization (apartment complex, mall, hospital, office campus, etc.) is a separate tenant. Data stays isolated — one property cannot see another property's parking data.

---

## Who is it for?

| Person | Role in the app | What they do |
| --- | --- | --- |
| Property / parking owner | Tenant Admin | Signs up, sets up parking lots, manages the organization |
| Operations staff | Admin | Helps run day-to-day parking operations inside one organization |
| Gate staff | Security | Checks vehicles in and out at entry/exit |
| Resident, employee, or customer | User | Adds vehicles, books slots, views history and payments |

---

## When should you use it?

| Situation | What to do |
| --- | --- |
| You own or manage a property with parking | [Create your account](#create-your-account) and become Tenant Admin |
| Parking structure is new or empty | [Set up parking lot → floor → slot](#property-owner-guide-tenant-admin) first |
| You need someone to help manage users and lots | [Create an Admin](#operations-helper-guide-admin) |
| You need gate staff at entry/exit | [Create Security](#gate-operator-guide-security) and use check-in / check-out |
| A resident or employee needs parking | [Create a User](#resident--visitor-guide-user), then they [add a vehicle](#resident--visitor-guide-user) and [book a slot](#resident--visitor-guide-user) |
| A vehicle arrives at the gate | Security uses [Check In Vehicle](#gate-operator-guide-security) |
| A vehicle leaves | Security uses [Check Out Vehicle](#gate-operator-guide-security); payment flow may follow |
| You want to verify everything works | Follow the [typical day walkthrough](#typical-day--start-to-finish) or [checklist](#quick-checklist-before-going-live) |

---

## How the product works (big picture)

```text
1. Property owner signs up          →  Organization + Tenant Admin created
2. Tenant Admin sets up parking     →  Parking lot → Floor → Slot
3. Tenant Admin adds people         →  Users, Admins, Security
4. User books a slot                →  Slot reserved for that booking
5. Vehicle arrives                  →  Security checks in → Slot becomes OCCUPIED
6. Vehicle leaves                   →  Security checks out → Slot AVAILABLE, fee calculated
7. Payment (if applicable)          →  User sees payment history after checkout
```

**Parking Lot** is the top-level place (e.g. "Block A Basement", "Mall P1"). Each lot has **floors** (levels) and **slots** (individual parking spaces).

---

## Create your account

**When to use:** You are a property owner or parking operator setting up Smart Parking for the first time.

**Who gets created:** The first account becomes **Tenant Admin** for a new organization.

**Steps:**

1. Open the Smart Parking app.
2. On the login page, click **Create Account**.
3. Fill in:
   - Organization name (your property or business name)
   - Organization type (apartment, mall, hospital, office, public parking, etc.)
   - Your name (owner / primary contact)
   - Mobile number and/or email
   - Password
4. Submit the form.
5. You are logged in and land on the **Admin Dashboard**.

You can now set up parking lots and invite your team.

---

## Log in

**When to use:** Every return visit after your account exists.

**Steps:**

1. Open the app.
2. Enter **email** or **Indian mobile number** and your **password**.
   - Mobile works as 10 digits (`9876543210`) or with country code (`+919876543210`).
3. Click **Log in**.
4. The app opens the dashboard for your role:

| Your role | Where you land |
| --- | --- |
| Tenant Admin or Admin | Admin Dashboard |
| Security | Security Dashboard |
| User | User Dashboard |

---

## Your role decides your experience

<details>
<summary><strong>Tenant Admin</strong> — property / parking owner (click to expand)</summary>

- Created when you complete [public signup](#create-your-account).
- Full control inside your organization: parking lots, floors, slots, users, admins, security.
- Only Tenant Admin can create **Admin** accounts.
- Dashboard shows organization-wide KPIs and Quick Actions for setup and management.

</details>

<details>
<summary><strong>Admin</strong> — operations helper (click to expand)</summary>

- Created by Tenant Admin.
- Helps manage parking operations, users, and security inside the organization.
- Can create **User** and **Security** accounts.
- Cannot create another Tenant Admin account.

</details>

<details>
<summary><strong>Security</strong> — gate operator (click to expand)</summary>

- Created by Tenant Admin or Admin.
- Uses the Security Dashboard focused on check-in, check-out, and gate activity.
- Does not set up parking lots or manage organization settings.

</details>

<details>
<summary><strong>User</strong> — resident, employee, or customer (click to expand)</summary>

- Created by Tenant Admin or Admin.
- Adds personal vehicles, books slots, views parking and payment history.
- Does not manage other people or parking lot structure.

</details>

---

## Property owner guide (Tenant Admin)

**When to use:** After [creating your account](#create-your-account), before anyone can book or park.

On the Admin Dashboard, KPI cards appear first. **Quick Actions** sit below in a collapsible panel — click the panel header to expand it, then choose an action.

<details>
<summary><strong>A. Create a parking lot</strong></summary>

**When:** You have a new site, building, or zone to manage (e.g. "Tower B Basement", "Visitor Parking").

1. Log in as Tenant Admin.
2. Open **Admin Dashboard**.
3. Expand **Quick Actions** → **Create Parking Lot**.
4. Enter parking lot name, type, and address or details if available.
5. Save.

Repeat for each separate parking location you operate.

</details>

<details>
<summary><strong>B. Create a floor</strong></summary>

**When:** A parking lot has multiple levels (B1, B2, Ground, L1, etc.).

1. **Quick Actions** → **Create Floor**.
2. Select the parking lot.
3. Enter the floor / level name.
4. Save.

</details>

<details>
<summary><strong>C. Create a slot</strong></summary>

**When:** You are ready to offer bookable spaces on a floor.

1. **Quick Actions** → **Create Slot**.
2. Select parking lot and floor.
3. Enter slot number and slot type.
4. Save.

New slots start as **available** unless configured otherwise.

</details>

<details>
<summary><strong>D. Create a user</strong> (resident / employee / customer)</summary>

**When:** Someone needs to book parking under your organization.

1. **Quick Actions** → **Create User**.
2. Enter name, mobile number, optional email, password, and role **User**.
3. Save.

Share login details securely. The user logs in with mobile or email + password.

</details>

<details>
<summary><strong>E. Create an admin</strong> (Tenant Admin only)</summary>

**When:** You want a trusted person to help manage operations without full owner access.

1. **Quick Actions** → **Create Admin**.
2. Enter their details and password.
3. Save.

Admins can manage users, security, and day-to-day parking tasks inside your organization.

</details>

<details>
<summary><strong>F. Create security</strong> (gate staff)</summary>

**When:** You need someone at the entry/exit to check vehicles in and out.

1. **Quick Actions** → **Create Security**.
2. Enter their details and password.
3. Save.

Security staff use the [gate operator guide](#gate-operator-guide-security).

</details>

---

## Operations helper guide (Admin)

**When to use:** You were invited by the property owner to help run parking day to day.

**What you can do:**

- View the Admin Dashboard and organization metrics
- Use Quick Actions to create **users** and **security** staff
- Support parking lot operations alongside the Tenant Admin

**What you cannot do:**

- Create another Tenant Admin
- Sign up a new organization (only public signup does that)

Follow the same setup and management steps in the [Property owner guide](#property-owner-guide-tenant-admin) where your permissions allow.

---

## Gate operator guide (Security)

**When to use:** A vehicle arrives or leaves the parking lot.

Log in → you land on the **Security Dashboard** with gate-focused metrics and Quick Actions.

<details>
<summary><strong>Check in a vehicle</strong></summary>

**When:** A vehicle with a valid booking (or matching record) arrives at the gate.

1. Expand **Quick Actions** → **Check In Vehicle**.
2. Search by booking reference, vehicle number, or the flow shown on screen.
3. Confirm check-in.

**What happens:**

- An **active parking session** starts
- The slot status changes to **OCCUPIED**
- Admin and security dashboards update (active sessions, today's check-ins)

</details>

<details>
<summary><strong>Check out a vehicle</strong></summary>

**When:** A checked-in vehicle is leaving the parking lot.

1. Expand **Quick Actions** → **Check Out Vehicle**.
2. Search for the active session.
3. Confirm checkout.

**What happens:**

- Parking session is **completed**
- Slot becomes **available** again
- Parking fee is calculated
- Payment flow starts when applicable
- User can see updates in parking and payment history

</details>

---

## Resident & visitor guide (User)

**When to use:** You live, work, or visit a property that uses Smart Parking and your account was created by the property team.

<details>
<summary><strong>Add a vehicle</strong></summary>

**When:** Before booking — register the vehicle you will park.

1. Log in → **User Dashboard**.
2. Choose **Add Vehicle** (Quick Action or dashboard link).
3. Enter vehicle number and vehicle details.
4. Save.

Vehicle numbers are stored and shown in **uppercase** (e.g. `KA05GH1212`).

</details>

<details>
<summary><strong>Book a slot</strong></summary>

**When:** You know when you need parking and which lot you will use.

1. **User Dashboard** → **Book Slot**.
2. Select parking lot, floor, and an available slot.
3. Confirm the booking.

The slot is **reserved** for your booking until check-in or the booking rules apply.

</details>

<details>
<summary><strong>View parking history</strong></summary>

**When:** You want to see past visits, active sessions, or completed stays.

- Open parking history from the user dashboard or recent activity links.
- Review upcoming bookings, active sessions, and completed sessions.

</details>

<details>
<summary><strong>View payment history</strong></summary>

**When:** After checkout — especially once a payment has been initiated or completed.

- Open payment history from the user dashboard.
- See payment status tied to completed parking sessions.

</details>

---

## Understanding dashboard numbers

<details>
<summary><strong>Admin / Tenant Admin dashboard</strong></summary>

| Card | What it means |
| --- | --- |
| Active sessions | Vehicles currently checked in and not yet checked out |
| Today's check-ins | Vehicles checked in today |
| Today's check-outs | Sessions completed today |
| Revenue | Money from completed checkouts / payments only |
| Slot availability | How many slots are free vs occupied across your organization |

KPI cards show first; expand **Quick Actions** below to manage parking.

</details>

<details>
<summary><strong>Security dashboard</strong></summary>

Focused on gate work:

- Active sessions right now
- Today's check-ins and check-outs
- Recent activity at the gate

</details>

<details>
<summary><strong>User dashboard</strong></summary>

Personal view:

- My vehicles
- Upcoming bookings
- Active parking sessions
- Completed sessions
- Recent parking activity

</details>

---

## Typical day — start to finish

Use this story to see how all roles connect in one flow.

1. **Property owner** [creates an account](#create-your-account).
2. **Tenant Admin** creates a parking lot, floor, and slot.
3. **Tenant Admin** creates a **User** and a **Security** account.
4. **User** logs in, [adds a vehicle](#resident--visitor-guide-user), and [books a slot](#resident--visitor-guide-user).
5. **Security** logs in and [checks the vehicle in](#gate-operator-guide-security) when it arrives.
6. Everyone confirms the slot shows **occupied** and dashboards show an active session.
7. When the vehicle leaves, **Security** [checks it out](#gate-operator-guide-security).
8. Slot returns to **available**; revenue and payment history update where applicable.
9. **User** reviews parking and payment history.

---

## Quick checklist before going live

- [ ] Tenant account created
- [ ] At least one parking lot, floor, and slot configured
- [ ] User and security accounts created
- [ ] Test vehicle added and slot booked
- [ ] Test check-in — slot becomes occupied
- [ ] Dashboard metrics look correct (active sessions, today's check-ins)
- [ ] Test check-out — slot becomes available
- [ ] Payment / history visible to user after checkout

---

## Developer & technical reference

The sections below are for **developers, testers, and DevOps** setting up the codebase locally or deploying environments. Product users can ignore this part.

<details>
<summary><strong>Developer & technical reference — click to expand all sections</strong></summary>

<details>
<summary>Project overview (stack & modules)</summary>

| Layer | Stack | Hosting (target) |
| --- | --- | --- |
| Frontend | React, Vite, MUI | Vercel |
| Backend API | NestJS, Prisma | Render |
| Payment service | Spring Boot | Render |
| Database | PostgreSQL (local or Neon) | Neon |

**Modules**

- **Frontend** — role-based dashboards, parking lot management, bookings, gate operations, payment history
- **Backend** — authentication, tenant scoping, parking lots/floors/slots, sessions, bookings, user management
- **Payment service** — checkout, payment records, mock/Razorpay provider integration
- **Database** — PostgreSQL; Prisma migrations on the backend, JPA on the payment service

</details>

<details>
<summary>Local setup</summary>

Prerequisites: Node.js 18+, Java 21+, Maven, PostgreSQL (local or Neon).

**Backend**

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

API: `http://localhost:3000/api`

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

**Payment service**

```bash
cd payment-service
mvn spring-boot:run
```

Windows PowerShell — same `mvn` command if Maven is on PATH.

Payment API: `http://localhost:8081/api/payments`

Run all three in separate terminals for full checkout flows.

</details>

<details>
<summary>Environment variables (placeholders only)</summary>

**Backend (`backend/.env`)**

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
JWT_SECRET="change-me-use-at-least-32-characters"
PAYMENT_SERVICE_URL="http://localhost:8081"
CORS_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

**Frontend (`frontend/.env`)**

```env
VITE_API_BASE_URL="http://localhost:3000/api"
VITE_PAYMENT_API_BASE_URL="http://localhost:8081/api"
```

**Payment service**

```env
DB_URL="jdbc:postgresql://HOST:PORT/DATABASE?sslmode=require"
DB_USERNAME="USER"
DB_PASSWORD="PASSWORD"
SERVER_PORT=8081
JWT_SECRET="change-me-use-at-least-32-characters"
```

`JWT_SECRET` must match between backend and payment service. Never commit real secrets.

</details>

<details>
<summary>Role model (technical)</summary>

| Role | Created how | Organization |
| --- | --- | --- |
| TENANT_ADMIN | Public signup | Own organization |
| ADMIN | Tenant Admin | Tenant organization |
| SECURITY | Tenant Admin / Admin | Tenant organization |
| USER | Tenant Admin / Admin | Tenant organization |

</details>

<details>
<summary>Smoke test checklist (QA)</summary>

- [ ] Create tenant account
- [ ] Log in as tenant admin
- [ ] Create parking lot, floor, slot
- [ ] Create user
- [ ] Log in as user → add vehicle → book slot
- [ ] Log in as security → check in → confirm occupied slot & dashboard metrics
- [ ] Check out → confirm available slot, revenue, payment history

</details>

<details>
<summary>Deployment notes</summary>

- `develop` is the integration branch; feature branches merge via pull request.
- Test on dev backend/database before production.
- Do not run untested migrations on production databases.
- Promote only after smoke tests pass.
- Frontend: Vercel · Backend & payment: Render · Database: Neon (or managed PostgreSQL).

</details>

<details>
<summary>Further reading</summary>

- [Payment service README](payment-service/README.md)
- [Project plan](docs/project-plan/)
- [Contributor context](MASTER_PROMPT.md)

</details>

</details>