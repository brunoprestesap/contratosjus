import { describe, it, expect } from "vitest";
import {
  calculateContractBalance,
  getBalancePercentage,
  getBalanceColor,
  calculateCommitmentBalance,
} from "@/lib/utils";

describe("calculateContractBalance", () => {
  it("calcula saldo correto", () => {
    expect(calculateContractBalance(100000, 35000)).toBe(65000);
  });

  it("retorna zero quando totalmente pago", () => {
    expect(calculateContractBalance(50000, 50000)).toBe(0);
  });

  it("retorna negativo quando estourado", () => {
    expect(calculateContractBalance(50000, 60000)).toBe(-10000);
  });

  it("retorna valor global quando sem pagamentos", () => {
    expect(calculateContractBalance(100000, 0)).toBe(100000);
  });

  it("calcula saldo com valores decimais", () => {
    expect(calculateContractBalance(1500000.1, 750000.05)).toBeCloseTo(750000.05, 2);
  });
});

describe("getBalancePercentage", () => {
  it("retorna 0% quando totalmente pago", () => {
    expect(getBalancePercentage(100000, 100000)).toBe(0);
  });

  it("retorna 50% quando metade paga", () => {
    expect(getBalancePercentage(100000, 50000)).toBe(50);
  });

  it("retorna 100% quando sem pagamentos", () => {
    expect(getBalancePercentage(100000, 0)).toBe(100);
  });

  it("retorna negativo quando estourado (> 100% pago)", () => {
    expect(getBalancePercentage(100000, 120000)).toBe(-20);
  });

  it("retorna 0 quando valor global é zero", () => {
    expect(getBalancePercentage(0, 0)).toBe(0);
  });
});

describe("getBalanceColor", () => {
  it("retorna verde quando > 50%", () => {
    expect(getBalanceColor(60)).toBe("green");
    expect(getBalanceColor(100)).toBe("green");
    expect(getBalanceColor(51)).toBe("green");
  });

  it("retorna amarelo quando entre 20% e 50%", () => {
    expect(getBalanceColor(50)).toBe("yellow");
    expect(getBalanceColor(20)).toBe("yellow");
    expect(getBalanceColor(35)).toBe("yellow");
  });

  it("retorna vermelho quando < 20%", () => {
    expect(getBalanceColor(19)).toBe("red");
    expect(getBalanceColor(0)).toBe("red");
    expect(getBalanceColor(-10)).toBe("red");
  });
});

describe("calculateCommitmentBalance", () => {
  it("calcula saldo disponível de empenho", () => {
    expect(calculateCommitmentBalance(50000, 20000)).toBe(30000);
  });

  it("retorna zero quando totalmente liquidado", () => {
    expect(calculateCommitmentBalance(50000, 50000)).toBe(0);
  });

  it("retorna negativo se liquidado excede empenhado", () => {
    expect(calculateCommitmentBalance(30000, 35000)).toBe(-5000);
  });

  it("retorna total empenhado se sem liquidações", () => {
    expect(calculateCommitmentBalance(50000, 0)).toBe(50000);
  });
});
