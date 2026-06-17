-- Phase 1a: Organization model and tenant scoping columns

CREATE TABLE `organizations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(191) NULL,
    `plan` ENUM('STARTER', 'PRO', 'ENTERPRISE') NOT NULL DEFAULT 'STARTER',
    `maxLots` INTEGER NOT NULL DEFAULT 5,
    `maxUsers` INTEGER NOT NULL DEFAULT 50,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organizations_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `organizations` (`id`, `name`, `slug`, `plan`, `maxLots`, `maxUsers`, `isActive`, `createdAt`, `updatedAt`)
VALUES (1, 'Default Organization', 'default', 'STARTER', 5, 50, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

ALTER TABLE `users` MODIFY `role` ENUM('SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN', 'SECURITY', 'USER') NOT NULL DEFAULT 'USER';

ALTER TABLE `users` ADD COLUMN `organizationId` INTEGER NULL;
UPDATE `users` SET `organizationId` = 1;

DROP INDEX `users_email_key` ON `users`;
DROP INDEX `users_phone_key` ON `users`;

CREATE UNIQUE INDEX `users_organizationId_email_key` ON `users`(`organizationId`, `email`);
CREATE UNIQUE INDEX `users_organizationId_phone_key` ON `users`(`organizationId`, `phone`);
CREATE INDEX `users_organizationId_idx` ON `users`(`organizationId`);

ALTER TABLE `users` ADD CONSTRAINT `users_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `parking_lots` ADD COLUMN `organizationId` INTEGER NULL;
UPDATE `parking_lots` SET `organizationId` = 1;
ALTER TABLE `parking_lots` MODIFY `organizationId` INTEGER NOT NULL;
CREATE INDEX `parking_lots_organizationId_idx` ON `parking_lots`(`organizationId`);
ALTER TABLE `parking_lots` ADD CONSTRAINT `parking_lots_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `vehicles` ADD COLUMN `organizationId` INTEGER NULL;
UPDATE `vehicles` `v` INNER JOIN `users` `u` ON `v`.`ownerId` = `u`.`id` SET `v`.`organizationId` = `u`.`organizationId`;
UPDATE `vehicles` SET `organizationId` = 1 WHERE `organizationId` IS NULL;
ALTER TABLE `vehicles` MODIFY `organizationId` INTEGER NOT NULL;
DROP INDEX `vehicles_registrationNo_key` ON `vehicles`;
CREATE UNIQUE INDEX `vehicles_organizationId_registrationNo_key` ON `vehicles`(`organizationId`, `registrationNo`);
CREATE INDEX `vehicles_organizationId_idx` ON `vehicles`(`organizationId`);
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `bookings` ADD COLUMN `organizationId` INTEGER NULL;
UPDATE `bookings` `b` INNER JOIN `parking_lots` `pl` ON `b`.`parkingLotId` = `pl`.`id` SET `b`.`organizationId` = `pl`.`organizationId`;
UPDATE `bookings` SET `organizationId` = 1 WHERE `organizationId` IS NULL;
ALTER TABLE `bookings` MODIFY `organizationId` INTEGER NOT NULL;
CREATE INDEX `bookings_organizationId_idx` ON `bookings`(`organizationId`);
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `parking_events` ADD COLUMN `organizationId` INTEGER NULL;
UPDATE `parking_events` `pe` INNER JOIN `parking_lots` `pl` ON `pe`.`parkingLotId` = `pl`.`id` SET `pe`.`organizationId` = `pl`.`organizationId`;
UPDATE `parking_events` SET `organizationId` = 1 WHERE `organizationId` IS NULL;
ALTER TABLE `parking_events` MODIFY `organizationId` INTEGER NOT NULL;
CREATE INDEX `parking_events_organizationId_idx` ON `parking_events`(`organizationId`);
ALTER TABLE `parking_events` ADD CONSTRAINT `parking_events_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `slot_assignments` ADD COLUMN `organizationId` INTEGER NULL;
UPDATE `slot_assignments` `sa` INNER JOIN `users` `u` ON `sa`.`userId` = `u`.`id` SET `sa`.`organizationId` = `u`.`organizationId`;
UPDATE `slot_assignments` SET `organizationId` = 1 WHERE `organizationId` IS NULL;
ALTER TABLE `slot_assignments` MODIFY `organizationId` INTEGER NOT NULL;
CREATE INDEX `slot_assignments_organizationId_idx` ON `slot_assignments`(`organizationId`);
ALTER TABLE `slot_assignments` ADD CONSTRAINT `slot_assignments_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;