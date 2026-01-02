-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "contactStatus" TEXT DEFAULT 'none',
ADD COLUMN     "lastContactedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ContactRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "companyName" TEXT,
    "defaultChannel" TEXT NOT NULL DEFAULT 'instagram',
    "maxContactsPerSession" INTEGER NOT NULL DEFAULT 10,
    "signature" TEXT,
    "instagramHandle" TEXT,
    "whatsappNumber" TEXT,
    "emailAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactRecord_clientId_idx" ON "ContactRecord"("clientId");

-- CreateIndex
CREATE INDEX "ContactRecord_status_idx" ON "ContactRecord"("status");

-- CreateIndex
CREATE INDEX "ContactRecord_userId_idx" ON "ContactRecord"("userId");

-- CreateIndex
CREATE INDEX "MessageTemplate_channel_idx" ON "MessageTemplate"("channel");

-- CreateIndex
CREATE INDEX "MessageTemplate_scenario_idx" ON "MessageTemplate"("scenario");

-- CreateIndex
CREATE INDEX "MessageTemplate_userId_idx" ON "MessageTemplate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectConfig_userId_key" ON "ProspectConfig"("userId");

-- AddForeignKey
ALTER TABLE "ContactRecord" ADD CONSTRAINT "ContactRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRecord" ADD CONSTRAINT "ContactRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectConfig" ADD CONSTRAINT "ProspectConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
