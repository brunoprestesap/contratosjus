-- AlterTable: set canExtend default to false
ALTER TABLE "contracts" ALTER COLUMN "canExtend" SET DEFAULT false;

-- AlterTable: change referenceMonth from String to DateTime
ALTER TABLE "payments" DROP COLUMN "referenceMonth",
ADD COLUMN     "referenceMonth" TIMESTAMP(3) NOT NULL;

-- Backfill NULL passwordChangedAt before making it required
UPDATE "users" SET "passwordChangedAt" = "createdAt" WHERE "passwordChangedAt" IS NULL;

-- AlterTable: make passwordChangedAt required with default
ALTER TABLE "users" ALTER COLUMN "passwordChangedAt" SET NOT NULL,
ALTER COLUMN "passwordChangedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "commitments_contractId_idx" ON "commitments"("contractId");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_endDate_idx" ON "contracts"("endDate");

-- CreateIndex
CREATE INDEX "contracts_supplier_idx" ON "contracts"("supplier");

-- CreateIndex
CREATE INDEX "payments_contractId_idx" ON "payments"("contractId");

-- CreateIndex
CREATE INDEX "payments_referenceMonth_idx" ON "payments"("referenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "payments_contractId_referenceMonth_key" ON "payments"("contractId", "referenceMonth");
