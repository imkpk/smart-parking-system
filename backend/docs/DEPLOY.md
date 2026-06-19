# NestJS backend — Render + Neon deploy readiness (Phase 6A)

This document covers **main NestJS API only**. Payment-service and frontend deploy are separate phases.

## Stack

| Component | Service |
|-----------|---------|
| API | [Render](https://render.com) Free Web Service |
| Database | [Neon](https://neon.tech) PostgreSQL |
| ORM | Prisma |

## Neon environment variables

Create a Neon project and copy connection strings into Render (or local `.env`):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
SHADOW_DATABASE_URL="postgresql://USER:PASSWORD@HOST/SHADOW_DB?sslmode=require"
```

`SHADOW_DATABASE_URL` is for local `prisma migrate dev` only — not required on Render if you only run `migrate deploy`.

Additional Render env vars:

```env
PORT=3000
JWT_SECRET="<32+ char secret>"
JWT_EXPIRES_IN="1d"
PAYMENT_SERVICE_URL="https://your-payment-service.example.com"
CORS_ALLOWED_ORIGINS="http://localhost:5173,https://YOUR-VERCEL-APP.vercel.app"
```

## Render Web Service

| Setting | Value |
|---------|-------|
| Root Directory | `backend` (or repo root with `cd backend` in commands) |
| Runtime | Node 22 |

**Build command:**

```bash
npm install && npx prisma generate && npm run build
```

**Start command (recommended — no seed on every boot):**

```bash
npx prisma migrate deploy && npm run start:prod
```

**One-time demo seed** (after first deploy or empty database):

```bash
npm run prisma:demo-seed
```

Run via Render Shell or locally with production `DATABASE_URL`.

> Do **not** run `prisma:demo-seed` on every container start in production — it mutates demo data and adds startup time.

### Alternative start (not recommended for production)

```bash
npx prisma migrate deploy && npm run prisma:demo-seed && npm run start:prod
```

## Health check

Render health check path:

```text
GET /api/health
```

Response:

```json
{ "status": "ok", "service": "smart-parking-backend" }
```

## Migrations

Fresh PostgreSQL baseline (single migration):

```text
prisma/migrations/20260619120000_postgresql_baseline/
```

Deploy:

```bash
cd backend
npx prisma migrate deploy
```

MySQL migration history is archived under `prisma/migrations_mysql_archive/` (not applied on Postgres).

## Seeds

| Script | Purpose |
|--------|---------|
| `npm run prisma:seed` | Minimal default organization only (dev/CI) |
| `npm run prisma:demo-seed` | **Hosted demo** — Sunrise Properties, demo users, lots, sample data |

Password for all demo users: `password123`

## Local PostgreSQL

```env
DATABASE_URL="postgresql://parking_user:parking_password@localhost:5432/smart_parking_db?schema=public"
SHADOW_DATABASE_URL="postgresql://parking_user:parking_password@localhost:5432/smart_parking_shadow_db?schema=public"
```

```bash
createdb smart_parking_db
createdb smart_parking_shadow_db
cd backend
npm install
npx prisma migrate dev
npm run prisma:demo-seed
npm run start:dev
```

## Out of scope (this phase)

- Spring Boot `payment-service` uses PostgreSQL (see `payment-service/README.md` for Neon JDBC URL)
- Vercel frontend deploy (Phase 6B+)
- Full CI/CD pipeline changes beyond backend compatibility

## Validation (pre-deploy)

```bash
cd backend
npx prisma format
npx prisma generate
npm run build
npm run test:run
```