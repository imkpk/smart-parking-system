-- Phase 2: extend Organization with white-label branding fields
ALTER TABLE `organizations`
  ADD COLUMN `secondaryColor` VARCHAR(191) NULL,
  ADD COLUMN `accentColor` VARCHAR(191) NULL,
  ADD COLUMN `loginTitle` VARCHAR(191) NULL,
  ADD COLUMN `supportEmail` VARCHAR(191) NULL;