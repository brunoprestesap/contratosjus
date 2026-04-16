-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FISCAL', 'DIRETOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LegalRegime" AS ENUM ('LEI_14133_2021', 'LEI_8666_1993');

-- CreateEnum
CREATE TYPE "BiddingModality" AS ENUM ('PREGAO_ELETRONICO', 'PREGAO_PRESENCIAL', 'DISPENSA', 'INEXIGIBILIDADE', 'CONCORRENCIA', 'TOMADA_PRECOS', 'CONVITE', 'DIALOGO_COMPETITIVO', 'OUTROS');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('FIXED', 'VARIABLE', 'MIXED');

-- CreateEnum
CREATE TYPE "PaymentPeriodicity" AS ENUM ('MONTHLY', 'BIMONTHLY', 'ON_DEMAND');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CommitmentType" AS ENUM ('INITIAL', 'REINFORCEMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FISCAL',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "processNumber" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "supplierCnpj" TEXT NOT NULL,
    "legalRegime" "LegalRegime" NOT NULL,
    "biddingModality" "BiddingModality" NOT NULL,
    "signatureDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "canExtend" BOOLEAN NOT NULL DEFAULT true,
    "globalValue" DECIMAL(15,2) NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "estimatedMonthlyValue" DECIMAL(15,2),
    "paymentPeriodicity" "PaymentPeriodicity" NOT NULL DEFAULT 'MONTHLY',
    "budgetProgram" TEXT,
    "expenseNature" TEXT,
    "fiscalHolder" TEXT NOT NULL,
    "fiscalSubstitute" TEXT,
    "contractManager" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commitments" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "commitmentNumber" TEXT NOT NULL,
    "commitmentDate" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "type" "CommitmentType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "invoiceValue" DECIMAL(15,2),
    "attestDate" TIMESTAMP(3),
    "attestNotes" TEXT,
    "settlementDate" TIMESTAMP(3),
    "settledValue" DECIMAL(15,2),
    "paidAt" TIMESTAMP(3),
    "paidValue" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contractNumber_key" ON "contracts"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_contractId_referenceMonth_key" ON "payments"("contractId", "referenceMonth");

-- AddForeignKey
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
