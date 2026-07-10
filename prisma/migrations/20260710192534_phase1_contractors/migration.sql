-- CreateEnum
CREATE TYPE "RateUnit" AS ENUM ('HOUR', 'DAY', 'MONTH', 'FIXED');

-- CreateEnum
CREATE TYPE "ContractorStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "Ir35Status" AS ENUM ('NOT_APPLICABLE', 'INSIDE', 'OUTSIDE', 'UNDETERMINED');

-- CreateEnum
CREATE TYPE "PayableStatus" AS ENUM ('RECEIVED', 'APPROVED', 'SCHEDULED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayoutRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- AlterTable
ALTER TABLE "LineItem" ADD COLUMN     "engagementId" TEXT;

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "taxResidency" TEXT,
    "entityName" TEXT,
    "taxId" TEXT,
    "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payoutMethod" TEXT,
    "payoutDetails" TEXT,
    "defaultCostRate" DECIMAL(12,2),
    "defaultRateUnit" "RateUnit" NOT NULL DEFAULT 'DAY',
    "status" "ContractorStatus" NOT NULL DEFAULT 'ONBOARDING',
    "userId" TEXT,
    "customFields" JSONB,
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engagement" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "rateUnit" "RateUnit" NOT NULL,
    "costRate" DECIMAL(12,2) NOT NULL,
    "costCurrency" TEXT NOT NULL,
    "billRate" DECIMAL(12,2),
    "billCurrency" TEXT,
    "capacity" DECIMAL(5,2),
    "ir35Status" "Ir35Status" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "ir35Notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorInvoice" (
    "id" TEXT NOT NULL,
    "internalNumber" TEXT NOT NULL,
    "contractorRef" TEXT,
    "contractorId" TEXT NOT NULL,
    "engagementId" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL,
    "fxRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "baseTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PayableStatus" NOT NULL DEFAULT 'RECEIVED',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "sourceDocumentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorInvoiceLine" (
    "id" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unit" TEXT,
    "lineTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContractorInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRun" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "status" "PayoutRunStatus" NOT NULL DEFAULT 'DRAFT',
    "paidDate" TIMESTAMP(3),
    "method" TEXT,
    "reference" TEXT,
    "totalBase" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "payoutRunId" TEXT,
    "contractorId" TEXT NOT NULL,
    "contractorInvoiceId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "fxRate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "baseAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "feeAmount" DECIMAL(12,2),
    "paidDate" TIMESTAMP(3),
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_email_key" ON "Contractor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_userId_key" ON "Contractor"("userId");

-- CreateIndex
CREATE INDEX "Contractor_name_idx" ON "Contractor"("name");

-- CreateIndex
CREATE INDEX "Contractor_status_idx" ON "Contractor"("status");

-- CreateIndex
CREATE INDEX "Engagement_contractorId_idx" ON "Engagement"("contractorId");

-- CreateIndex
CREATE INDEX "Engagement_clientId_idx" ON "Engagement"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorInvoice_internalNumber_key" ON "ContractorInvoice"("internalNumber");

-- CreateIndex
CREATE INDEX "ContractorInvoice_status_idx" ON "ContractorInvoice"("status");

-- CreateIndex
CREATE INDEX "ContractorInvoice_contractorId_idx" ON "ContractorInvoice"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorInvoiceLine_payableId_idx" ON "ContractorInvoiceLine"("payableId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutRun_number_key" ON "PayoutRun"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_contractorInvoiceId_key" ON "Payout"("contractorInvoiceId");

-- CreateIndex
CREATE INDEX "Payout_contractorId_idx" ON "Payout"("contractorId");

-- CreateIndex
CREATE INDEX "LineItem_engagementId_idx" ON "LineItem"("engagementId");

-- AddForeignKey
ALTER TABLE "LineItem" ADD CONSTRAINT "LineItem_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInvoice" ADD CONSTRAINT "ContractorInvoice_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInvoice" ADD CONSTRAINT "ContractorInvoice_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "Engagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInvoiceLine" ADD CONSTRAINT "ContractorInvoiceLine_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "ContractorInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_payoutRunId_fkey" FOREIGN KEY ("payoutRunId") REFERENCES "PayoutRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_contractorInvoiceId_fkey" FOREIGN KEY ("contractorInvoiceId") REFERENCES "ContractorInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
