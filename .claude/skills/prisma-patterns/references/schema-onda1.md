# Schema Prisma — Onda 1 (Referência)

Este é o schema de referência para a Onda 1 do MVP. Usar como base ao criar o `prisma/schema.prisma`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// ENUMS
// ============================================================

enum UserRole {
  FISCAL    // Admin — CRUD completo
  DIRETOR   // Somente leitura — dashboard e relatórios
}

enum UserStatus {
  ACTIVE
  BLOCKED
}

enum LegalRegime {
  LEI_14133_2021   // Nova Lei de Licitações
  LEI_8666_1993    // Lei antiga ainda vigente
}

enum BiddingModality {
  PREGAO_ELETRONICO
  PREGAO_PRESENCIAL
  DISPENSA
  INEXIGIBILIDADE
  CONCORRENCIA
  TOMADA_PRECOS
  CONVITE
  DIALOGO_COMPETITIVO
  OUTROS
}

enum PaymentType {
  FIXED         // Valor mensal fixo
  VARIABLE      // Variável por consumo
  MIXED         // Misto
}

enum PaymentPeriodicity {
  MONTHLY       // Mensal
  BIMONTHLY     // Bimestral
  ON_DEMAND     // Por demanda
}

enum ContractStatus {
  ACTIVE        // Ativo / vigente
  EXPIRED       // Vencido / encerrado
}

enum CommitmentType {
  INITIAL       // Empenho inicial do exercício
  REINFORCEMENT // Reforço de empenho
}

// Onda 2
enum AdditiveType {
  TERM          // Aditivo de prazo
  VALUE         // Aditivo de valor
  MIXED         // Misto (prazo + valor)
  READJUSTMENT  // Reajuste / Repactuação
  APOSTILAMENTO // Apostilamento
}

// ============================================================
// MODELS
// ============================================================

model User {
  id             String     @id @default(cuid())
  name           String
  email          String     @unique
  passwordHash   String
  role           UserRole   @default(FISCAL)
  status         UserStatus @default(ACTIVE)
  failedAttempts Int        @default(0)
  lockedUntil    DateTime?
  lastLoginAt    DateTime?
  passwordChangedAt DateTime @default(now())
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  // Onda 2: relação com AuditLog
  // auditLogs     AuditLog[]
}

model Contract {
  id                  String            @id @default(cuid())

  // Identificação
  contractNumber      String            @unique // ex: "012/2025"
  processNumber       String            // Número do processo (SEI)
  object              String            // Descrição do serviço
  supplier            String            // Razão social
  supplierCnpj        String            // CNPJ
  legalRegime         LegalRegime
  biddingModality     BiddingModality

  // Vigência
  signatureDate       DateTime
  startDate           DateTime
  endDate             DateTime
  canExtend           Boolean           @default(false)

  // Financeiro
  globalValue         Decimal           @db.Decimal(15, 2)
  paymentType         PaymentType
  estimatedMonthlyValue Decimal?        @db.Decimal(15, 2) // Quando fixo/misto
  paymentPeriodicity  PaymentPeriodicity @default(MONTHLY)

  // Dotação orçamentária
  budgetProgram       String?           // Programa de trabalho
  expenseNature       String?           // Natureza da despesa

  // Gestão
  fiscalHolder        String            // Fiscal titular
  fiscalSubstitute    String?           // Fiscal substituto
  contractManager     String?           // Gestor (informativo)

  // Status (calculado ou manual)
  status              ContractStatus    @default(ACTIVE)

  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  // Relações
  commitments         Commitment[]
  payments            Payment[]
  // Onda 2:
  // additives        Additive[]

  @@index([status])
  @@index([endDate])
  @@index([supplier])
}

model Commitment {
  id               String         @id @default(cuid())
  contractId       String
  contract         Contract       @relation(fields: [contractId], references: [id], onDelete: Cascade)

  commitmentNumber String         // ex: "2026NE000123"
  commitmentDate   DateTime
  value            Decimal        @db.Decimal(15, 2)
  type             CommitmentType
  notes            String?

  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@index([contractId])
}

model Payment {
  id              String    @id @default(cuid())
  contractId      String
  contract        Contract  @relation(fields: [contractId], references: [id], onDelete: Cascade)

  referenceMonth  DateTime  // Mês/ano de referência (stored as first day of month)
  invoiceValue    Decimal?  @db.Decimal(15, 2) // Valor da NF

  // Ateste
  attestDate      DateTime?
  attestNotes     String?

  // Liquidação
  settlementDate  DateTime?
  settledValue    Decimal?  @db.Decimal(15, 2)

  // Pagamento
  paidAt          DateTime?
  paidValue       Decimal?  @db.Decimal(15, 2)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([contractId, referenceMonth])
  @@index([contractId])
  @@index([referenceMonth])
}

// ============================================================
// ONDA 2 — Descomentar quando implementar
// ============================================================

// model Additive {
//   id               String        @id @default(cuid())
//   contractId       String
//   contract         Contract      @relation(fields: [contractId], references: [id], onDelete: Cascade)
//
//   additiveNumber   String        // ex: "1º TA"
//   type             AdditiveType
//   signatureDate    DateTime
//   newGlobalValue   Decimal?      @db.Decimal(15, 2)
//   newMonthlyValue  Decimal?      @db.Decimal(15, 2)
//   newEndDate       DateTime?
//   justification    String
//
//   createdAt        DateTime      @default(now())
//   updatedAt        DateTime      @updatedAt
//
//   @@index([contractId])
// }

// model AuditLog {
//   id          String   @id @default(cuid())
//   userId      String
//   user        User     @relation(fields: [userId], references: [id])
//   entity      String   // "Contract", "Payment", "Commitment", etc.
//   entityId    String
//   action      String   // "CREATE", "UPDATE", "DELETE"
//   oldValue    Json?    // Valor anterior (para updates)
//   newValue    Json?    // Valor novo
//   createdAt   DateTime @default(now())
//
//   @@index([entity, entityId])
//   @@index([userId])
//   @@index([createdAt])
// }
```

## Notas

- Models da Onda 2 (Additive, AuditLog) estão comentados — descomentar quando for implementar
- `referenceMonth` no Payment usa o primeiro dia do mês como referência (ex: 2026-03-01 para Mar/2026)
- `@@unique([contractId, referenceMonth])` impede duplicatas de pagamento para o mesmo mês
- Valores financeiros SEMPRE como `Decimal @db.Decimal(15, 2)`
