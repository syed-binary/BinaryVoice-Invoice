-- AlterTable
ALTER TABLE "Contractor" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_onboardingToken_key" ON "Contractor"("onboardingToken");

