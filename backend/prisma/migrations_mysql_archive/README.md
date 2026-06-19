# MySQL migration archive (pre–Phase 6A)

These Prisma migrations were used when the NestJS backend datasource was **MySQL**.

They are **not** applied on fresh PostgreSQL deployments. Phase 6A replaced them with a single baseline:

- `../migrations/20260619120000_postgresql_baseline/`

## Why archived

- MySQL-specific SQL (`AUTO_INCREMENT`, backticks, `ENUM` column syntax) does not run on Neon PostgreSQL.
- The project is not production-deployed yet; no live MySQL data migration is required.
- Fresh free-tier deploys use `npx prisma migrate deploy` against the PostgreSQL baseline only.

## Historical folders

| Folder | Era |
|--------|-----|
| `20260613200354_init` | Initial schema |
| `20260614203000_milestone_2_parking_structure` | Lots / floors / slots |
| `20260614214500_milestone_3_vehicles_bookings` | Vehicles + bookings |
| `20260614223000_milestone_4_parking_events` | Parking events |
| `20260617220000_phase_1a_organizations` | Multi-tenant organizations |
| `20260618150000_phase_2_organization_branding` | Branding fields |
| `20260619100000_phase_5b_chat_schema` | In-app chat |

Do not delete this archive without team approval — it documents schema evolution history.