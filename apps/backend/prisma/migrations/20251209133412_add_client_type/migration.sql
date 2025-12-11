-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('CLIENT', 'LEAD', 'COMPETITOR');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "type" "ClientType" NOT NULL DEFAULT 'LEAD';
