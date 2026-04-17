import { describe, it, expect } from "vitest";
import { getMissingPaymentMonths } from "@/lib/missing-payments";

describe("getMissingPaymentMonths", () => {
  it("retorna vazio para contrato VARIABLE", () => {
    const result = getMissingPaymentMonths({
      paymentType: "VARIABLE",
      paymentPeriodicity: "MONTHLY",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-12-31"),
      payments: [],
    });
    expect(result).toEqual([]);
  });

  it("retorna vazio para contrato ON_DEMAND", () => {
    const result = getMissingPaymentMonths({
      paymentType: "FIXED",
      paymentPeriodicity: "ON_DEMAND",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-12-31"),
      payments: [],
    });
    expect(result).toEqual([]);
  });

  it("retorna meses faltantes para contrato FIXED/MONTHLY sem pagamentos", () => {
    const result = getMissingPaymentMonths({
      paymentType: "FIXED",
      paymentPeriodicity: "MONTHLY",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
      payments: [],
    });
    // Should include Jan, Feb, Mar 2026
    expect(result).toHaveLength(3);
    expect(result[0].getUTCMonth()).toBe(0); // Jan
    expect(result[1].getUTCMonth()).toBe(1); // Feb
    expect(result[2].getUTCMonth()).toBe(2); // Mar
  });

  it("exclui meses com pagamento registrado", () => {
    const result = getMissingPaymentMonths({
      paymentType: "FIXED",
      paymentPeriodicity: "MONTHLY",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
      payments: [
        { referenceMonth: new Date("2026-01-01T00:00:00Z") },
        { referenceMonth: new Date("2026-03-01T00:00:00Z") },
      ],
    });
    // Only Feb should be missing
    expect(result).toHaveLength(1);
    expect(result[0].getUTCMonth()).toBe(1); // Feb
  });

  it("retorna vazio quando todos os meses estão preenchidos", () => {
    const result = getMissingPaymentMonths({
      paymentType: "FIXED",
      paymentPeriodicity: "MONTHLY",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-02-28"),
      payments: [
        { referenceMonth: new Date("2026-01-01T00:00:00Z") },
        { referenceMonth: new Date("2026-02-01T00:00:00Z") },
      ],
    });
    expect(result).toEqual([]);
  });

  it("limita ao endDate para contratos expirados", () => {
    // Contract expired in the past — should not list months beyond endDate
    const result = getMissingPaymentMonths({
      paymentType: "FIXED",
      paymentPeriodicity: "MONTHLY",
      startDate: new Date("2024-11-01"),
      endDate: new Date("2024-12-31"),
      payments: [],
    });
    expect(result).toHaveLength(2);
    expect(result[0].getUTCFullYear()).toBe(2024);
    expect(result[0].getUTCMonth()).toBe(10); // Nov
    expect(result[1].getUTCMonth()).toBe(11); // Dec
  });

  it("aceita strings de data como input", () => {
    const result = getMissingPaymentMonths({
      paymentType: "FIXED",
      paymentPeriodicity: "MONTHLY",
      startDate: "2025-06-01",
      endDate: "2025-07-31",
      payments: [{ referenceMonth: "2025-06-01T00:00:00Z" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].getUTCMonth()).toBe(6); // Jul
  });
});
