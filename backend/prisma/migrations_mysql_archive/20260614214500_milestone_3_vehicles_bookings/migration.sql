-- Normalize existing vehicle enum values before switching to Milestone 3 enums.
ALTER TABLE `vehicles`
    MODIFY COLUMN `type` ENUM('TWO_WHEELER', 'FOUR_WHEELER', 'OTHER', 'CAR', 'BIKE', 'EV') NOT NULL DEFAULT 'CAR';

UPDATE `vehicles` SET `type` = 'CAR' WHERE `type` = 'FOUR_WHEELER';
UPDATE `vehicles` SET `type` = 'BIKE' WHERE `type` = 'TWO_WHEELER';
UPDATE `vehicles` SET `type` = 'CAR' WHERE `type` = 'OTHER';

ALTER TABLE `vehicles`
    MODIFY COLUMN `type` ENUM('CAR', 'BIKE', 'EV') NOT NULL DEFAULT 'CAR';

-- CreateTable
CREATE TABLE `bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `vehicleId` INTEGER NOT NULL,
    `slotId` INTEGER NOT NULL,
    `parkingLotId` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'CONFIRMED',
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NULL,
    `bookingCode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bookings_bookingCode_key`(`bookingCode`),
    INDEX `bookings_userId_idx`(`userId`),
    INDEX `bookings_vehicleId_idx`(`vehicleId`),
    INDEX `bookings_slotId_idx`(`slotId`),
    INDEX `bookings_parkingLotId_idx`(`parkingLotId`),
    INDEX `bookings_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_slotId_fkey` FOREIGN KEY (`slotId`) REFERENCES `parking_slots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_parkingLotId_fkey` FOREIGN KEY (`parkingLotId`) REFERENCES `parking_lots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
