/*
  Warnings:

  - A unique constraint covering the columns `[placeId]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "email" TEXT,
ADD COLUMN     "enrichedAt" TIMESTAMP(3),
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "gaps" JSONB,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "placeId" TEXT,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "tier" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Client_placeId_key" ON "Client"("placeId");
