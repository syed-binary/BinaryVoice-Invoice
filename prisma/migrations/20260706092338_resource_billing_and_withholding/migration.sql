-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "exportClient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withholdingRate" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "defaultWithholdingRate" DECIMAL(5,2) NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "netPayable" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 5,
ADD COLUMN     "withholdingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "withholdingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withholdingRate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EstimateLineItem" ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "netPayable" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 5,
ADD COLUMN     "withholdingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "withholdingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "withholdingRate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LineItem" ADD COLUMN     "unit" TEXT;
