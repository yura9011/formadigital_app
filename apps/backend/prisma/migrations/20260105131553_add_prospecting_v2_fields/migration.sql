-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "contactAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hasValidEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasValidInstagram" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasValidWhatsapp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "snoozeReason" TEXT,
ADD COLUMN     "snoozedUntil" TIMESTAMP(3);
