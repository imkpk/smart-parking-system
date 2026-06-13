-- Replace the early placeholder parking_events shape with the Milestone 4 ticket lifecycle shape.
DROP TABLE IF EXISTS `parking_events`;

-- CreateTable
CREATE TABLE `parking_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `vehicleId` INTEGER NOT NULL,
    `slotId` INTEGER NOT NULL,
    `parkingLotId` INTEGER NOT NULL,
    `checkInTime` DATETIME(3) NOT NULL,
    `checkOutTime` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `durationMinutes` INTEGER NULL,
    `feeAmount` DECIMAL(10, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `parking_events_bookingId_key`(`bookingId`),
    INDEX `parking_events_userId_idx`(`userId`),
    INDEX `parking_events_vehicleId_idx`(`vehicleId`),
    INDEX `parking_events_slotId_idx`(`slotId`),
    INDEX `parking_events_parkingLotId_idx`(`parkingLotId`),
    INDEX `parking_events_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `parking_events` ADD CONSTRAINT `parking_events_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parking_events` ADD CONSTRAINT `parking_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parking_events` ADD CONSTRAINT `parking_events_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parking_events` ADD CONSTRAINT `parking_events_slotId_fkey` FOREIGN KEY (`slotId`) REFERENCES `parking_slots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parking_events` ADD CONSTRAINT `parking_events_parkingLotId_fkey` FOREIGN KEY (`parkingLotId`) REFERENCES `parking_lots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
