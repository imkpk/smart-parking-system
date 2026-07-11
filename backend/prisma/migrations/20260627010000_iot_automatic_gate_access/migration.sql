-- Extend OutboxEventType for IoT gate flows
ALTER TYPE "OutboxEventType" ADD VALUE IF NOT EXISTS 'GATE_OPEN_REQUESTED';
ALTER TYPE "OutboxEventType" ADD VALUE IF NOT EXISTS 'GATE_COMMAND_PUBLISHED';
ALTER TYPE "OutboxEventType" ADD VALUE IF NOT EXISTS 'GATE_COMMAND_EXECUTED';
ALTER TYPE "OutboxEventType" ADD VALUE IF NOT EXISTS 'GATE_COMMAND_FAILED';
ALTER TYPE "OutboxEventType" ADD VALUE IF NOT EXISTS 'IOT_DEVICE_STATUS_CHANGED';

-- CreateEnum
CREATE TYPE "GateDirection" AS ENUM ('ENTRY', 'EXIT', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "IotDeviceType" AS ENUM ('EDGE_GATEWAY', 'ANPR_CAMERA', 'RFID_READER', 'QR_READER', 'BARRIER_CONTROLLER');

-- CreateEnum
CREATE TYPE "IotDeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED', 'DISABLED');

-- CreateEnum
CREATE TYPE "VehicleCredentialType" AS ENUM ('UHF_RFID', 'QR_CODE');

-- CreateEnum
CREATE TYPE "VehicleCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GateIdentifierType" AS ENUM ('PLATE', 'UHF_RFID', 'QR_CODE');

-- CreateEnum
CREATE TYPE "GateAccessSource" AS ENUM ('ANPR', 'RFID', 'QR', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "GateAccessDecision" AS ENUM ('GRANTED', 'DENIED', 'REVIEW_REQUIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "GateCommandAction" AS ENUM ('OPEN');

-- CreateEnum
CREATE TYPE "GateCommandStatus" AS ENUM ('PENDING', 'PUBLISHED', 'ACKNOWLEDGED', 'EXECUTED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "gates" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "parkingLotId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" "GateDirection" NOT NULL DEFAULT 'ENTRY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoOpenEnabled" BOOLEAN NOT NULL DEFAULT true,
    "anprConfidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "duplicateWindowSeconds" INTEGER NOT NULL DEFAULT 30,
    "commandTtlSeconds" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iot_devices" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "gateId" INTEGER NOT NULL,
    "externalDeviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceType" "IotDeviceType" NOT NULL,
    "status" "IotDeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "credentialHash" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "firmwareVersion" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iot_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_access_credentials" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "credentialType" "VehicleCredentialType" NOT NULL,
    "credentialHash" TEXT NOT NULL,
    "displaySuffix" TEXT NOT NULL,
    "status" "VehicleCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_access_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_detections" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "gateId" INTEGER NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "messageId" TEXT NOT NULL,
    "identifierType" "GateIdentifierType" NOT NULL,
    "identifierHash" TEXT,
    "identifierDisplay" TEXT,
    "confidence" DOUBLE PRECISION,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedVehicleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gate_detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_access_attempts" (
    "id" SERIAL NOT NULL,
    "attemptId" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "gateId" INTEGER NOT NULL,
    "detectionId" INTEGER,
    "source" "GateAccessSource" NOT NULL,
    "decision" "GateAccessDecision" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "reasonDetail" TEXT,
    "vehicleId" INTEGER,
    "bookingId" INTEGER,
    "parkingEventId" INTEGER,
    "commandId" TEXT,
    "actorUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gate_access_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_commands" (
    "id" SERIAL NOT NULL,
    "commandId" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "gateId" INTEGER NOT NULL,
    "controllerDeviceId" INTEGER NOT NULL,
    "accessAttemptId" INTEGER NOT NULL,
    "action" "GateCommandAction" NOT NULL DEFAULT 'OPEN',
    "status" "GateCommandStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gate_commands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gates_organizationId_externalId_key" ON "gates"("organizationId", "externalId");

-- CreateIndex
CREATE INDEX "gates_organizationId_idx" ON "gates"("organizationId");

-- CreateIndex
CREATE INDEX "gates_parkingLotId_idx" ON "gates"("parkingLotId");

-- CreateIndex
CREATE UNIQUE INDEX "iot_devices_organizationId_externalDeviceId_key" ON "iot_devices"("organizationId", "externalDeviceId");

-- CreateIndex
CREATE INDEX "iot_devices_organizationId_idx" ON "iot_devices"("organizationId");

-- CreateIndex
CREATE INDEX "iot_devices_gateId_idx" ON "iot_devices"("gateId");

-- CreateIndex
CREATE INDEX "iot_devices_status_idx" ON "iot_devices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_access_credentials_organizationId_credentialHash_key" ON "vehicle_access_credentials"("organizationId", "credentialHash");

-- CreateIndex
CREATE INDEX "vehicle_access_credentials_organizationId_vehicleId_idx" ON "vehicle_access_credentials"("organizationId", "vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_access_credentials_status_idx" ON "vehicle_access_credentials"("status");

-- CreateIndex
CREATE UNIQUE INDEX "gate_detections_deviceId_messageId_key" ON "gate_detections"("deviceId", "messageId");

-- CreateIndex
CREATE INDEX "gate_detections_organizationId_gateId_occurredAt_idx" ON "gate_detections"("organizationId", "gateId", "occurredAt");

-- CreateIndex
CREATE INDEX "gate_detections_gateId_occurredAt_idx" ON "gate_detections"("gateId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "gate_access_attempts_attemptId_key" ON "gate_access_attempts"("attemptId");

-- CreateIndex
CREATE INDEX "gate_access_attempts_organizationId_gateId_createdAt_idx" ON "gate_access_attempts"("organizationId", "gateId", "createdAt");

-- CreateIndex
CREATE INDEX "gate_access_attempts_gateId_createdAt_idx" ON "gate_access_attempts"("gateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "gate_commands_commandId_key" ON "gate_commands"("commandId");

-- CreateIndex
CREATE INDEX "gate_commands_organizationId_gateId_status_idx" ON "gate_commands"("organizationId", "gateId", "status");

-- CreateIndex
CREATE INDEX "gate_commands_gateId_status_expiresAt_idx" ON "gate_commands"("gateId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "gate_commands_controllerDeviceId_status_idx" ON "gate_commands"("controllerDeviceId", "status");

-- AddForeignKey
ALTER TABLE "gates" ADD CONSTRAINT "gates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gates" ADD CONSTRAINT "gates_parkingLotId_fkey" FOREIGN KEY ("parkingLotId") REFERENCES "parking_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "gates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_access_credentials" ADD CONSTRAINT "vehicle_access_credentials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_access_credentials" ADD CONSTRAINT "vehicle_access_credentials_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_detections" ADD CONSTRAINT "gate_detections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_detections" ADD CONSTRAINT "gate_detections_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "gates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_detections" ADD CONSTRAINT "gate_detections_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "iot_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_detections" ADD CONSTRAINT "gate_detections_matchedVehicleId_fkey" FOREIGN KEY ("matchedVehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_access_attempts" ADD CONSTRAINT "gate_access_attempts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_access_attempts" ADD CONSTRAINT "gate_access_attempts_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "gates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_access_attempts" ADD CONSTRAINT "gate_access_attempts_detectionId_fkey" FOREIGN KEY ("detectionId") REFERENCES "gate_detections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_access_attempts" ADD CONSTRAINT "gate_access_attempts_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_commands" ADD CONSTRAINT "gate_commands_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_commands" ADD CONSTRAINT "gate_commands_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "gates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_commands" ADD CONSTRAINT "gate_commands_controllerDeviceId_fkey" FOREIGN KEY ("controllerDeviceId") REFERENCES "iot_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_commands" ADD CONSTRAINT "gate_commands_accessAttemptId_fkey" FOREIGN KEY ("accessAttemptId") REFERENCES "gate_access_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;