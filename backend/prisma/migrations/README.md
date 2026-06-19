# Prisma migrations (PostgreSQL)

The NestJS backend uses **PostgreSQL** (Neon for hosted deploy, local Postgres for dev).

## Fresh deployment

```bash
cd backend
npx prisma migrate deploy
```

This applies:

- `20260619120000_postgresql_baseline` — full schema from current `schema.prisma`

## Hosted demo data (one-time)

```bash
cd backend
npm run prisma:demo-seed
```

Use `prisma:demo-seed` for Render/Neon demo tenants — not `prisma:seed` (minimal org-only seed).

## Local development

```bash
npx prisma migrate dev
```

Requires `DATABASE_URL` and `SHADOW_DATABASE_URL` pointing at local PostgreSQL databases.

## MySQL history

Pre–Phase 6A MySQL migrations are archived in `../migrations_mysql_archive/` (not executed on Postgres).