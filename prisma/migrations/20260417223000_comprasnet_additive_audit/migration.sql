-- CreateEnum
CREATE TYPE "AdditiveType" AS ENUM ('TERM', 'VALUE', 'MIXED', 'READJUSTMENT', 'APOSTILAMENTO');

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "comprasnetId" INTEGER;

-- CreateTable
CREATE TABLE "additives" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "additiveNumber" TEXT NOT NULL,
    "type" "AdditiveType" NOT NULL,
    "signatureDate" TIMESTAMP(3) NOT NULL,
    "newGlobalValue" DECIMAL(15,2),
    "newMonthlyValue" DECIMAL(15,2),
    "newEndDate" TIMESTAMP(3),
    "justification" TEXT NOT NULL,
    "originalGlobalValue" DECIMAL(15,2) NOT NULL,
    "originalEndDate" TIMESTAMP(3) NOT NULL,
    "originalMonthlyValue" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "additives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_histories" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "comprasnetId" INTEGER,
    "numero" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT,
    "observacao" TEXT,
    "processo" TEXT,
    "objeto" TEXT,
    "modalidade" TEXT,
    "fornecedorNome" TEXT,
    "fornecedorCnpj" TEXT,
    "dataAssinatura" TIMESTAMP(3),
    "dataPublicacao" TIMESTAMP(3),
    "vigenciaInicio" TIMESTAMP(3),
    "vigenciaFim" TIMESTAMP(3),
    "valorInicial" DECIMAL(15,2),
    "valorGlobal" DECIMAL(15,2),
    "numParcelas" INTEGER,
    "valorParcela" DECIMAL(15,2),
    "novoValorGlobal" DECIMAL(15,2),
    "novoNumParcelas" INTEGER,
    "novoValorParcela" DECIMAL(15,2),
    "situacaoContrato" TEXT,
    "criadoEm" TIMESTAMP(3),
    "alteradoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_schedules" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "comprasnetId" INTEGER,
    "tipo" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "mesRef" INTEGER NOT NULL,
    "anoRef" INTEGER NOT NULL,
    "vencimento" TIMESTAMP(3),
    "retroativo" TEXT,
    "valor" DECIMAL(15,2) NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_guarantees" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "comprasnetId" INTEGER,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "vencimento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_guarantees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_items" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "comprasnetId" INTEGER,
    "tipoId" TEXT,
    "tipoMaterial" TEXT,
    "grupoId" TEXT,
    "descricao" TEXT,
    "descricaoComplementar" TEXT,
    "quantidade" DECIMAL(15,10),
    "valorUnitario" DECIMAL(15,2),
    "valorTotal" DECIMAL(15,2),
    "numeroItemCompra" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_prepostos" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "comprasnetId" INTEGER,
    "usuario" TEXT NOT NULL,
    "email" TEXT,
    "telefonefixo" TEXT,
    "celular" TEXT,
    "docFormalizacao" TEXT,
    "informacaoComplementar" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "situacao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_prepostos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_occurrences" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "comprasnetId" INTEGER,
    "tipo" TEXT,
    "descricao" TEXT,
    "data" TIMESTAMP(3),
    "situacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_outsourced" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "comprasnetId" INTEGER,
    "usuario" TEXT NOT NULL,
    "funcao" TEXT,
    "jornada" INTEGER,
    "unidade" TEXT,
    "salario" DECIMAL(15,2),
    "custo" DECIMAL(15,2),
    "escolaridade" TEXT,
    "auxTransporte" DECIMAL(15,2),
    "valeAlimentacao" DECIMAL(15,2),
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "situacao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_outsourced_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_files" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "comprasnetId" INTEGER,
    "tipo" TEXT,
    "descricao" TEXT,
    "pathArquivo" TEXT,
    "origem" TEXT,
    "sequencialDocumento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_invoices" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "comprasnetId" INTEGER,
    "tipoListaFaturaId" TEXT,
    "numero" TEXT NOT NULL,
    "emissao" TIMESTAMP(3),
    "vencimento" TIMESTAMP(3),
    "valor" DECIMAL(15,2) NOT NULL,
    "juros" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "multa" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "glosa" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valorLiquido" DECIMAL(15,2) NOT NULL,
    "processo" TEXT,
    "ateste" TEXT,
    "situacao" TEXT NOT NULL,
    "mesRef" INTEGER NOT NULL,
    "anoRef" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_publications" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "comprasnetId" INTEGER,
    "dataPublicacao" TIMESTAMP(3),
    "status" TEXT,
    "textoDou" TEXT,
    "linkPublicacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "additives_contractId_idx" ON "additives"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "additives_contractId_additiveNumber_key" ON "additives"("contractId", "additiveNumber");

-- CreateIndex
CREATE UNIQUE INDEX "contract_histories_comprasnetId_key" ON "contract_histories"("comprasnetId");

-- CreateIndex
CREATE INDEX "contract_histories_contractId_idx" ON "contract_histories"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_schedules_comprasnetId_key" ON "contract_schedules"("comprasnetId");

-- CreateIndex
CREATE INDEX "contract_schedules_contractId_idx" ON "contract_schedules"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_guarantees_comprasnetId_key" ON "contract_guarantees"("comprasnetId");

-- CreateIndex
CREATE INDEX "contract_guarantees_contractId_idx" ON "contract_guarantees"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_items_comprasnetId_key" ON "contract_items"("comprasnetId");

-- CreateIndex
CREATE INDEX "contract_items_contractId_idx" ON "contract_items"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_prepostos_comprasnetId_key" ON "contract_prepostos"("comprasnetId");

-- CreateIndex
CREATE INDEX "contract_prepostos_contractId_idx" ON "contract_prepostos"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_occurrences_comprasnetId_key" ON "contract_occurrences"("comprasnetId");

-- CreateIndex
CREATE INDEX "contract_occurrences_contractId_idx" ON "contract_occurrences"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_outsourced_comprasnetId_key" ON "contract_outsourced"("comprasnetId");

-- CreateIndex
CREATE INDEX "contract_outsourced_contractId_idx" ON "contract_outsourced"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_files_comprasnetId_key" ON "contract_files"("comprasnetId");

-- CreateIndex
CREATE INDEX "contract_files_contractId_idx" ON "contract_files"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_invoices_comprasnetId_key" ON "contract_invoices"("comprasnetId");

-- CreateIndex
CREATE INDEX "contract_invoices_contractId_idx" ON "contract_invoices"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_publications_comprasnetId_key" ON "contract_publications"("comprasnetId");

-- CreateIndex
CREATE INDEX "contract_publications_contractId_idx" ON "contract_publications"("contractId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_comprasnetId_key" ON "contracts"("comprasnetId");

-- AddForeignKey
ALTER TABLE "additives" ADD CONSTRAINT "additives_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_histories" ADD CONSTRAINT "contract_histories_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_schedules" ADD CONSTRAINT "contract_schedules_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_guarantees" ADD CONSTRAINT "contract_guarantees_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_prepostos" ADD CONSTRAINT "contract_prepostos_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_occurrences" ADD CONSTRAINT "contract_occurrences_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_outsourced" ADD CONSTRAINT "contract_outsourced_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_files" ADD CONSTRAINT "contract_files_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_invoices" ADD CONSTRAINT "contract_invoices_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_publications" ADD CONSTRAINT "contract_publications_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
