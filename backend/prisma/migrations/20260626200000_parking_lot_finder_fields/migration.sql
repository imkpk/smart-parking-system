-- CreateEnum
CREATE TYPE "ParkingLotVisibility" AS ENUM ('PRIVATE', 'PUBLIC', 'INVITE_ONLY');

-- AlterTable
ALTER TABLE "parking_lots" ADD COLUMN "visibility" "ParkingLotVisibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "parking_lots" ADD COLUMN "latitude" DECIMAL(10,7);
ALTER TABLE "parking_lots" ADD COLUMN "longitude" DECIMAL(10,7);
ALTER TABLE "parking_lots" ADD COLUMN "baseHourlyRate" DECIMAL(10,2);
ALTER TABLE "parking_lots" ADD COLUMN "currency" TEXT DEFAULT 'INR';
ALTER TABLE "parking_lots" ADD COLUMN "openingHours" TEXT;

-- CreateIndex
CREATE INDEX "parking_lots_visibility_idx" ON "parking_lots"("visibility");
CREATE INDEX "parking_lots_city_idx" ON "parking_lots"("city");
CREATE INDEX "parking_lots_type_idx" ON "parking_lots"("type");
CREATE INDEX "parking_lots_isActive_idx" ON "parking_lots"("isActive");