
-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('MATERIAL', 'SERVICE', 'WORK', 'IT_SOLUTION');

-- CreateEnum
CREATE TYPE "CatalogType" AS ENUM ('CATMAT', 'CATSER');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "AdjustmentIndex" AS ENUM ('NONE', 'IPCA', 'IGPM', 'INCC', 'IPC_FIPE', 'SINAPI', 'OTHER');

-- AlterTable
ALTER TABLE "contract_items" ADD COLUMN     "adjustmentIndex" "AdjustmentIndex" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "bdiPercentage" DECIMAL(5,2),
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "budgetProgram" TEXT,
ADD COLUMN     "catalogCode" TEXT,
ADD COLUMN     "catalogType" "CatalogType",
ADD COLUMN     "countryOfOrigin" TEXT,
ADD COLUMN     "deliveryDeadlineDays" INTEGER,
ADD COLUMN     "deliveryLocation" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "detailedSpecification" TEXT,
ADD COLUMN     "executionDeadlineDays" INTEGER,
ADD COLUMN     "executionLocation" TEXT,
ADD COLUMN     "expenseNature" TEXT,
ADD COLUMN     "fundingSource" TEXT,
ADD COLUMN     "isAdjustable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isContinuousService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "itServiceCategory" TEXT,
ADD COLUMN     "itemNumber" TEXT,
ADD COLUMN     "itemType" "ItemType",
ADD COLUMN     "lotNumber" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nextAdjustmentDate" TIMESTAMP(3),
ADD COLUMN     "pctiReference" TEXT,
ADD COLUMN     "penaltyRules" TEXT,
ADD COLUMN     "quantity" DECIMAL(15,4),
ADD COLUMN     "sinapiReference" TEXT,
ADD COLUMN     "slaIndicators" JSONB,
ADD COLUMN     "socialChargesPercentage" DECIMAL(5,2),
ADD COLUMN     "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "sustainabilityCriteria" JSONB,
ADD COLUMN     "totalValue" DECIMAL(15,2),
ADD COLUMN     "unitOfMeasure" TEXT,
ADD COLUMN     "unitValue" DECIMAL(15,4),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "warrantyMonths" INTEGER;

-- CreateTable
CREATE TABLE "commitment_items" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "contractItemId" TEXT NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commitment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_items" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "contractItemId" TEXT NOT NULL,
    "invoiceValue" DECIMAL(15,2),
    "settledValue" DECIMAL(15,2),
    "paidValue" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commitment_items_commitmentId_idx" ON "commitment_items"("commitmentId");

-- CreateIndex
CREATE INDEX "commitment_items_contractItemId_idx" ON "commitment_items"("contractItemId");

-- CreateIndex
CREATE UNIQUE INDEX "commitment_items_commitmentId_contractItemId_key" ON "commitment_items"("commitmentId", "contractItemId");

-- CreateIndex
CREATE INDEX "payment_items_paymentId_idx" ON "payment_items"("paymentId");

-- CreateIndex
CREATE INDEX "payment_items_contractItemId_idx" ON "payment_items"("contractItemId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_items_paymentId_contractItemId_key" ON "payment_items"("paymentId", "contractItemId");

-- CreateIndex
CREATE INDEX "contract_items_itemType_idx" ON "contract_items"("itemType");

-- CreateIndex
CREATE INDEX "contract_items_catalogCode_idx" ON "contract_items"("catalogCode");

-- CreateIndex
CREATE INDEX "contract_items_status_idx" ON "contract_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "contract_items_contractId_itemNumber_key" ON "contract_items"("contractId", "itemNumber");

-- AddForeignKey
ALTER TABLE "commitment_items" ADD CONSTRAINT "commitment_items_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "commitments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitment_items" ADD CONSTRAINT "commitment_items_contractItemId_fkey" FOREIGN KEY ("contractItemId") REFERENCES "contract_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_contractItemId_fkey" FOREIGN KEY ("contractItemId") REFERENCES "contract_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

