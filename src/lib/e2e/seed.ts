/**
 * Seed determinístico usado pelos testes E2E. Roda server-side (Prisma
 * singleton do app, mesmo conexão pool do Next) para que o cliente de
 * teste (Playwright) não precise importar `@prisma/client` diretamente
 * — o cliente gerado usa `import.meta.url` e não transpila bem sob o
 * runtime do Playwright.
 *
 * Reexecutar é seguro — `deleteMany` zera o que a spec vai usar. Evitamos
 * `TRUNCATE … CASCADE` para não depender de permissões DDL no ambiente
 * de teste (só precisa das permissões de dados já concedidas).
 */

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const E2E_CREDENTIALS = {
  email: "fiscal.e2e@tjap.jus.br",
  password: "E2ETest@2026!",
  name: "Fiscal E2E",
} as const;

export interface E2ESeededData {
  user: { id: string; email: string; name: string; role: "FISCAL" };
  contract: { id: string; contractNumber: string; object: string };
}

export async function runE2ESeed(): Promise<E2ESeededData> {
  await prisma.priceSample.deleteMany({});
  await prisma.priceResearch.deleteMany({});
  await prisma.generatedDocument.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.commitment.deleteMany({});
  await prisma.additive.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await hash(E2E_CREDENTIALS.password, 12);
  const user = await prisma.user.create({
    data: {
      email: E2E_CREDENTIALS.email,
      name: E2E_CREDENTIALS.name,
      passwordHash,
      role: "FISCAL",
      status: "ACTIVE",
    },
  });

  const contract = await prisma.contract.create({
    data: {
      contractNumber: "E2E-001/2025",
      processNumber: "0001234-00.2025.4.01.3100",
      object: "Serviço de vigilância armada e desarmada nas dependências da JFAP",
      supplier: "Empresa de Segurança LTDA",
      supplierCnpj: "12.345.678/0001-90",
      legalRegime: "LEI_14133_2021",
      biddingModality: "PREGAO_ELETRONICO",
      signatureDate: new Date("2024-12-15"),
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
      globalValue: "240000.00",
      estimatedMonthlyValue: "20000.00",
      paymentType: "FIXED",
      paymentPeriodicity: "MONTHLY",
      fiscalHolder: E2E_CREDENTIALS.name,
      status: "ACTIVE",
    },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name, role: "FISCAL" },
    contract: {
      id: contract.id,
      contractNumber: contract.contractNumber,
      object: contract.object,
    },
  };
}
