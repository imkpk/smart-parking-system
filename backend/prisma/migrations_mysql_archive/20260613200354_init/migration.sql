-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'SECURITY', 'USER') NOT NULL DEFAULT 'USER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parking_lots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `floors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `level` INTEGER NULL,
    `parkingLotId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `floors_parkingLotId_idx`(`parkingLotId`),
    UNIQUE INDEX `floors_parkingLotId_name_key`(`parkingLotId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parking_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slotNumber` VARCHAR(191) NOT NULL,
    `type` ENUM('TWO_WHEELER', 'FOUR_WHEELER', 'OTHER') NOT NULL DEFAULT 'FOUR_WHEELER',
    `status` ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
    `floorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `parking_slots_floorId_idx`(`floorId`),
    INDEX `parking_slots_status_idx`(`status`),
    UNIQUE INDEX `parking_slots_floorId_slotNumber_key`(`floorId`, `slotNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `registrationNo` VARCHAR(191) NOT NULL,
    `type` ENUM('TWO_WHEELER', 'FOUR_WHEELER', 'OTHER') NOT NULL DEFAULT 'FOUR_WHEELER',
    `make` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `ownerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicles_registrationNo_key`(`registrationNo`),
    INDEX `vehicles_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slot_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `vehicleId` INTEGER NOT NULL,
    `slotId` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    INDEX `slot_assignments_userId_idx`(`userId`),
    INDEX `slot_assignments_vehicleId_idx`(`vehicleId`),
    INDEX `slot_assignments_slotId_idx`(`slotId`),
    INDEX `slot_assignments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parking_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('ENTRY', 'EXIT') NOT NULL,
    `vehicleId` INTEGER NOT NULL,
    `slotId` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `parking_events_vehicleId_idx`(`vehicleId`),
    INDEX `parking_events_slotId_idx`(`slotId`),
    INDEX `parking_events_type_idx`(`type`),
    INDEX `parking_events_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `floors` ADD CONSTRAINT `floors_parkingLotId_fkey` FOREIGN KEY (`parkingLotId`) REFERENCES `parking_lots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parking_slots` ADD CONSTRAINT `parking_slots_floorId_fkey` FOREIGN KEY (`floorId`) REFERENCES `floors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slot_assignments` ADD CONSTRAINT `slot_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slot_assignments` ADD CONSTRAINT `slot_assignments_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slot_assignments` ADD CONSTRAINT `slot_assignments_slotId_fkey` FOREIGN KEY (`slotId`) REFERENCES `parking_slots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parking_events` ADD CONSTRAINT `parking_events_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parking_events` ADD CONSTRAINT `parking_events_slotId_fkey` FOREIGN KEY (`slotId`) REFERENCES `parking_slots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
