-- AlterEnum (must be in its own migration — PostgreSQL cannot use a new enum value in the same transaction)
ALTER TYPE "OrganizationPlan" ADD VALUE IF NOT EXISTS 'FREE';