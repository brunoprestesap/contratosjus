/**
 * Backfill de ContractItem (legado Comprasnet → novo schema) e criação de
 * CommitmentItem/PaymentItem por rateio proporcional ao totalValue.
 *
 * ⚠ Ordem de execução OBRIGATÓRIA em ambientes com dados legados:
 *
 *   1. Aplicar migration `20260419214906_add_contract_item_breakdown`
 *      (adiciona colunas NOVAS, mantém as LEGADAS nullable).
 *   2. **Rodar este script** (`npx tsx prisma/scripts/backfill-items.mts`).
 *   3. Aplicar migration `20260420072405_contract_item_drop_legacy`
 *      (torna as novas colunas NOT NULL e DROP das legadas).
 *
 * Em bancos sem dados legados (fresh install), o script é no-op seguro.
 *
 * Idempotente: só processa itens com `itemType: null` e só cria breakdown
 * onde não existir (items.length === 0).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { PrismaPg } from "@prisma/adapter-pg";

const mod = await import("../../src/generated/prisma/client.ts");
const decimalMod = await import("../../src/lib/decimal.ts");
const PrismaClient = mod.PrismaClient;
const Prisma = mod.Prisma;
const distribute = decimalMod.distributeProportional;

type DecimalT = InstanceType<typeof Prisma.Decimal>;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const zero = () => new Prisma.Decimal(0);

function toDec(v: unknown): DecimalT {
  if (v === null || v === undefined) return zero();
  return new Prisma.Decimal(String(v));
}

async function backfillContractItems(): Promise<{
  updated: number;
  skipped: number;
}> {
  const legacy = await prisma.contractItem.findMany({
    where: { itemType: null },
  });
  let updated = 0;
  let skipped = 0;
  for (const item of legacy) {
    const isService = item.tipoMaterial === "S";
    const itemType = isService ? "SERVICE" : "MATERIAL";
    const catalogType = isService ? "CATSER" : "CATMAT";

    const fallbackNumber = `LEGACY-${item.id.slice(0, 8)}`;
    const itemNumber = item.numeroItemCompra?.trim() || fallbackNumber;

    const detailedSpec =
      item.descricaoComplementar?.trim() ||
      "Importado do Comprasnet — revisar especificação";
    const description = (
      item.descricaoComplementar?.trim() || detailedSpec
    ).slice(0, 200);

    const quantity = item.quantidade
      ? new Prisma.Decimal(item.quantidade.toString())
      : null;
    const unitValue = item.valorUnitario
      ? new Prisma.Decimal(item.valorUnitario.toString())
      : null;
    const totalValue = item.valorTotal
      ? new Prisma.Decimal(item.valorTotal.toString())
      : quantity && unitValue
        ? quantity.mul(unitValue).toDecimalPlaces(2)
        : null;

    try {
      await prisma.contractItem.update({
        where: { id: item.id },
        data: {
          itemNumber,
          itemType,
          catalogType,
          catalogCode: item.descricao?.trim() || null,
          description,
          detailedSpecification: detailedSpec,
          unitOfMeasure: "UN" as const,
          quantity,
          unitValue,
          totalValue,
          needsReview: true,
        },
      });
      updated++;
    } catch (err) {
      console.error(`Falha ao atualizar item ${item.id}:`, err);
      skipped++;
    }
  }
  return { updated, skipped };
}

async function backfillBreakdown(): Promise<{
  commitmentItems: number;
  paymentItems: number;
}> {
  const contracts = await prisma.contract.findMany({
    include: {
      itens: true,
      commitments: { include: { items: true } },
      payments: { include: { items: true } },
    },
  });

  let commitmentItemsCreated = 0;
  let paymentItemsCreated = 0;

  for (const contract of contracts) {
    const items = contract.itens.filter((i) => i.status === "ACTIVE");
    if (items.length === 0) continue;

    const weights = items.map((i) => toDec(i.totalValue));

    for (const c of contract.commitments) {
      if (c.items.length > 0) continue;
      const parts = distribute(toDec(c.value), weights);
      await prisma.commitmentItem.createMany({
        data: items.map((item, idx) => ({
          commitmentId: c.id,
          contractItemId: item.id,
          value: parts[idx],
        })),
      });
      commitmentItemsCreated += items.length;
    }

    for (const p of contract.payments) {
      if (p.items.length > 0) continue;
      const invoiceParts = p.invoiceValue
        ? distribute(toDec(p.invoiceValue), weights)
        : null;
      const settledParts = p.settledValue
        ? distribute(toDec(p.settledValue), weights)
        : null;
      const paidParts = p.paidValue ? distribute(toDec(p.paidValue), weights) : null;

      await prisma.paymentItem.createMany({
        data: items.map((item, idx) => ({
          paymentId: p.id,
          contractItemId: item.id,
          invoiceValue: invoiceParts ? invoiceParts[idx] : null,
          settledValue: settledParts ? settledParts[idx] : null,
          paidValue: paidParts ? paidParts[idx] : null,
        })),
      });
      paymentItemsCreated += items.length;
    }
  }

  return {
    commitmentItems: commitmentItemsCreated,
    paymentItems: paymentItemsCreated,
  };
}

async function main() {
  console.log("[backfill] iniciando…");
  const items = await backfillContractItems();
  console.log(
    `[backfill] itens: ${items.updated} atualizados, ${items.skipped} pulados`,
  );
  const breakdown = await backfillBreakdown();
  console.log(
    `[backfill] breakdown: ${breakdown.commitmentItems} commitment_items, ${breakdown.paymentItems} payment_items`,
  );
  console.log("[backfill] concluído.");
}

export { backfillContractItems, backfillBreakdown };

const isMain = process.argv[1]?.endsWith("backfill-items.mts");
if (isMain) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
