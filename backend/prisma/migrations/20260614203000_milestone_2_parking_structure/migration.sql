-- AlterTable
ALTER TABLE `parking_lots`
    ADD COLUMN `type` ENUM('APARTMENT', 'MALL', 'HOSPITAL', 'OFFICE', 'PUBLIC') NOT NULL DEFAULT 'APARTMENT' AFTER `name`,
    ADD COLUMN `city` VARCHAR(191) NULL AFTER `address`,
    ADD COLUMN `state` VARCHAR(191) NULL AFTER `city`,
    ADD COLUMN `pincode` VARCHAR(191) NULL AFTER `state`;

-- Normalize old slot enum values before switching to Milestone 2 enums.
ALTER TABLE `parking_slots`
    MODIFY COLUMN `type` ENUM('TWO_WHEELER', 'FOUR_WHEELER', 'OTHER', 'CAR', 'BIKE', 'EV', 'HANDICAPPED') NOT NULL DEFAULT 'CAR',
    MODIFY COLUMN `status` ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'INACTIVE', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE';

UPDATE `parking_slots` SET `type` = 'CAR' WHERE `type` = 'FOUR_WHEELER';
UPDATE `parking_slots` SET `type` = 'BIKE' WHERE `type` = 'TWO_WHEELER';
UPDATE `parking_slots` SET `type` = 'CAR' WHERE `type` = 'OTHER';
UPDATE `parking_slots` SET `status` = 'MAINTENANCE' WHERE `status` = 'INACTIVE';

ALTER TABLE `parking_slots`
    MODIFY COLUMN `type` ENUM('CAR', 'BIKE', 'EV', 'HANDICAPPED') NOT NULL DEFAULT 'CAR',
    MODIFY COLUMN `status` ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE';
