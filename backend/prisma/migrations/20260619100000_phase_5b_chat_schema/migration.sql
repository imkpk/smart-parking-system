-- Phase 5B: tenant-scoped in-app chat conversations and messages

CREATE TABLE `conversations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationId` INTEGER NOT NULL,
    `type` ENUM('SECURITY', 'CUSTOMER_CARE') NOT NULL,
    `status` ENUM('OPEN', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `subject` VARCHAR(191) NULL,
    `createdByUserId` INTEGER NOT NULL,
    `assignedToUserId` INTEGER NULL,
    `parkingLotId` INTEGER NULL,
    `bookingId` INTEGER NULL,
    `lastMessageAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `conversations_organizationId_idx`(`organizationId`),
    INDEX `conversations_type_idx`(`type`),
    INDEX `conversations_status_idx`(`status`),
    INDEX `conversations_createdByUserId_idx`(`createdByUserId`),
    INDEX `conversations_assignedToUserId_idx`(`assignedToUserId`),
    INDEX `conversations_parkingLotId_idx`(`parkingLotId`),
    INDEX `conversations_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `conversation_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationId` INTEGER NOT NULL,
    `conversationId` INTEGER NOT NULL,
    `senderId` INTEGER NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conversation_messages_organizationId_idx`(`organizationId`),
    INDEX `conversation_messages_conversationId_idx`(`conversationId`),
    INDEX `conversation_messages_senderId_idx`(`senderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `conversations` ADD CONSTRAINT `conversations_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `conversations` ADD CONSTRAINT `conversations_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `conversations` ADD CONSTRAINT `conversations_assignedToUserId_fkey` FOREIGN KEY (`assignedToUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `conversations` ADD CONSTRAINT `conversations_parkingLotId_fkey` FOREIGN KEY (`parkingLotId`) REFERENCES `parking_lots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `conversations` ADD CONSTRAINT `conversations_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;