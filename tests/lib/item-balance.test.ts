import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  getItemBalance,
  getItemCommittedBalance,
  getItemUncommittedBalance,
  getItemConsumedPercentage,
} from "@/lib/item-balance";

const d = (v: string | number) => new Prisma.Decimal(v);

describe("getItemBalance", () => {
  it("calcula saldo como total − pago", () => {
    expect(getItemBalance(1000, 400).toString()).toBe("600");
  });

  it("retorna zero quando totalmente pago", () => {
    expect(getItemBalance(1000, 1000).toString()).toBe("0");
  });

  it("retorna negativo quando superpago", () => {
    expect(getItemBalance(1000, 1200).toString()).toBe("-200");
  });

  it("aceita Prisma.Decimal", () => {
    expect(getItemBalance(d("1500.75"), d("500.25")).toString()).toBe("1000.5");
  });
});

describe("getItemCommittedBalance", () => {
  it("calcula saldo de empenho como empenhado − liquidado", () => {
    expect(getItemCommittedBalance(500, 200).toString()).toBe("300");
  });

  it("zero quando tudo liquidado", () => {
    expect(getItemCommittedBalance(500, 500).toString()).toBe("0");
  });
});

describe("getItemUncommittedBalance", () => {
  it("calcula saldo não empenhado como total − empenhado", () => {
    expect(getItemUncommittedBalance(1000, 400).toString()).toBe("600");
  });

  it("zero quando totalmente empenhado", () => {
    expect(getItemUncommittedBalance(1000, 1000).toString()).toBe("0");
  });
});

describe("getItemConsumedPercentage", () => {
  it("calcula % consumido", () => {
    expect(getItemConsumedPercentage(1000, 250)).toBe(25);
  });

  it("retorna 0 quando totalValue é zero (evita divisão por zero)", () => {
    expect(getItemConsumedPercentage(0, 100)).toBe(0);
  });

  it("retorna 100 quando totalmente consumido", () => {
    expect(getItemConsumedPercentage(500, 500)).toBe(100);
  });

  it("pode retornar mais de 100% quando estourado", () => {
    expect(getItemConsumedPercentage(100, 150)).toBe(150);
  });

  it("preserva precisão com decimais", () => {
    expect(getItemConsumedPercentage(d("333.33"), d("111.11"))).toBeCloseTo(33.33, 2);
  });
});
