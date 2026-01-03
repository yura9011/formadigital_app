-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('DISCOVERED', 'ANALYZED', 'CONTACTED', 'RESPONDED', 'CONVERTED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'AGENT', 'SYSTEM');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "discardReason" TEXT,
ADD COLUMN     "discardedAt" TIMESTAMP(3),
ADD COLUMN     "hours" JSONB,
ADD COLUMN     "instagramBio" TEXT,
ADD COLUMN     "instagramFollowers" INTEGER,
ADD COLUMN     "instagramLastPostDate" TIMESTAMP(3),
ADD COLUMN     "instagramPosts" INTEGER,
ADD COLUMN     "photoCount" INTEGER,
ADD COLUMN     "priceLevel" INTEGER,
ADD COLUMN     "reviewsUrl" TEXT,
ADD COLUMN     "revivedAt" TIMESTAMP(3),
ADD COLUMN     "stage" "PipelineStage" NOT NULL DEFAULT 'DISCOVERED';

-- CreateTable
CREATE TABLE "StageTransition" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fromStage" "PipelineStage" NOT NULL,
    "toStage" "PipelineStage" NOT NULL,
    "reason" TEXT,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageTransition_clientId_idx" ON "StageTransition"("clientId");

-- CreateIndex
CREATE INDEX "StageTransition_createdAt_idx" ON "StageTransition"("createdAt");

-- CreateIndex
CREATE INDEX "Client_stage_idx" ON "Client"("stage");

-- CreateIndex
CREATE INDEX "Client_score_idx" ON "Client"("score");

-- AddForeignKey
ALTER TABLE "StageTransition" ADD CONSTRAINT "StageTransition_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
