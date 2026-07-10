-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "publicToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_publicToken_key" ON "Estimate"("publicToken");

