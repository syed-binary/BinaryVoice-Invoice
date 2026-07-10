-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MSA', 'SOW', 'NDA', 'CONTRACTOR_AGREEMENT', 'OFFER_LETTER', 'EMPLOYMENT', 'AMENDMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "RenewalType" AS ENUM ('NONE', 'AUTO_RENEW', 'MANUAL');

-- CreateEnum
CREATE TYPE "ClauseCategory" AS ENUM ('ENGAGEMENT_STATUS', 'TAX_WITHHOLDING', 'IP_ASSIGNMENT', 'CONFIDENTIALITY', 'DATA_PROTECTION', 'TERMINATION', 'NON_SOLICIT', 'DISPUTE_LAW', 'COMPLIANCE', 'PAYMENT', 'OTHER');

-- AlterTable
ALTER TABLE "Engagement" ADD COLUMN     "contractId" TEXT;

-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "jurisdiction" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clause" (
    "id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "category" "ClauseCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "clientId" TEXT,
    "contractorId" TEXT,
    "parentId" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "renewalType" "RenewalType" NOT NULL DEFAULT 'NONE',
    "noticePeriodDays" INTEGER,
    "value" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "fxRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "baseValue" DECIMAL(12,2),
    "templateId" TEXT,
    "body" TEXT NOT NULL,
    "bodySnapshot" TEXT,
    "bodyHash" TEXT,
    "customFields" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractVersion" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "changeNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractSignatory" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "token" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureName" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractSignatory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Clause_jurisdiction_category_idx" ON "Clause"("jurisdiction", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_number_key" ON "Contract"("number");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_endDate_idx" ON "Contract"("endDate");

-- CreateIndex
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");

-- CreateIndex
CREATE INDEX "Contract_contractorId_idx" ON "Contract"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractVersion_contractId_version_key" ON "ContractVersion"("contractId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ContractSignatory_token_key" ON "ContractSignatory"("token");

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSignatory" ADD CONSTRAINT "ContractSignatory_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
