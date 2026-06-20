-- Allow nullable email for phone-first tenant users (unique per organization when set).
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;